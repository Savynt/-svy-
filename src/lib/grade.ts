import type { QuestionType } from '@/types/task'

/**
 * Pure grading helpers for the test player + /api/attempts.
 *
 * No DB, no React, no I/O — just deterministic comparison + scoring so the same
 * logic can run on the client (instant feedback) and on the server (authoritative
 * score). Answers travel as `string | string[]` (mirrors `Question.answer`).
 */

/** Learner / correct answer shape coming off `Question.answer` (Prisma Json). */
export type RawAnswer = string | string[] | null | undefined

/** Question types we can grade automatically (objective). */
const OBJECTIVE_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>([
  'TRUE_FALSE_NOTGIVEN',
  'YES_NO_NOTGIVEN',
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
  'MATCHING',
  'MATCHING_HEADINGS',
  'SENTENCE_COMPLETION',
  'SUMMARY_COMPLETION',
  'NOTE_COMPLETION',
  'TABLE_COMPLETION',
  'SHORT_ANSWER',
  'LABELLING',
])

/** Question types graded later by AI / a coach (subjective). */
const SUBJECTIVE_TYPES: ReadonlySet<QuestionType> = new Set<QuestionType>(['ESSAY', 'SPEAKING_PROMPT'])

/** True when the question is auto-gradable against a stored answer key. */
export function isObjective(type: QuestionType): boolean {
  return OBJECTIVE_TYPES.has(type)
}

/** True when the question needs human / AI grading (essay, speaking). */
export function needsManualGrading(type: QuestionType): boolean {
  return SUBJECTIVE_TYPES.has(type)
}

/**
 * Normalise a single answer token for comparison:
 * trim, lowercase, collapse inner whitespace, drop surrounding punctuation and
 * leading articles ("a"/"an"/"the") so "the Sun" === "sun".
 */
export function normalizeToken(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’]/g, "'") // smart quotes → straight
    .replace(/[.,;:!?]+$/g, '') // trailing punctuation
    // The player emits verdict keys as `NOT_GIVEN` while sources store them as
    // "NOT GIVEN"; underscores are never meaningful inside an answer, so treat
    // them as spaces rather than letting the two spellings disagree.
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(a|an|the)\s+/, '')
    .trim()
}

/** Coerce any raw answer into a clean string[] (drops empties). */
export function toTokens(value: RawAnswer): string[] {
  if (value == null) return []
  const list = Array.isArray(value) ? value : [value]
  return list.map((v) => String(v)).filter((v) => v.trim().length > 0)
}

/**
 * Split a single correct-answer string on accepted-alternate separators
 * (`/` or `|`), e.g. "color/colour" → ["color", "colour"]. Lets a content
 * author encode synonyms inline without an extra schema.
 */
function expandAlternates(token: string): string[] {
  return token
    .split(/\s*[/|]\s*/)
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Does the learner token match the correct token (incl. inline alternates)? */
function tokenMatches(userToken: string, correctToken: string): boolean {
  const user = normalizeToken(userToken)
  if (!user) return false
  return expandAlternates(correctToken).some((alt) => normalizeToken(alt) === user)
}

/**
 * Grade one question's response against its answer key.
 *
 * - Single-value types (choice, gap-fill, matching slot): order-independent for
 *   the single token, alternates accepted.
 * - Ordered/multi types (MULTI_SELECT, multi-blank completion, MATCHING with
 *   several slots): every expected slot must match the learner slot by position;
 *   for MULTI_SELECT the set must match regardless of order.
 *
 * Returns `null` for subjective types (caller marks them needs-grading).
 */
export function gradeAnswer(
  type: QuestionType,
  response: RawAnswer,
  correct: RawAnswer,
): boolean | null {
  if (needsManualGrading(type)) return null

  const correctTokens = toTokens(correct)
  const userTokens = toTokens(response)

  if (correctTokens.length === 0) return null
  if (userTokens.length === 0) return false

  // MULTI_SELECT — order-independent set equality.
  if (type === 'MULTI_SELECT') {
    if (userTokens.length !== correctTokens.length) return false
    const remaining = [...correctTokens]
    for (const u of userTokens) {
      const idx = remaining.findIndex((c) => tokenMatches(u, c))
      if (idx === -1) return false
      remaining.splice(idx, 1)
    }
    return remaining.length === 0
  }

  // Everything else — positional match, all slots required.
  if (userTokens.length !== correctTokens.length) return false
  return correctTokens.every((c, i) => tokenMatches(userTokens[i] ?? '', c))
}

export interface GradedScore {
  /** Points earned across auto-gradable questions. */
  score: number
  /** Total points possible across auto-gradable questions. */
  totalPoints: number
  /** Correct objective questions. */
  correctCount: number
  /** Objective questions attempted/graded. */
  gradedCount: number
  /** Percentage 0–100 over auto-gradable points (0 when nothing gradable). */
  percent: number
}

export interface GradableItem {
  type: QuestionType
  response: RawAnswer
  correct: RawAnswer
  points: number
}

/** Per-question grading detail (objective questions only). */
export interface GradedItem extends GradableItem {
  isCorrect: boolean | null
  pointsAwarded: number
}

/** Grade a list of questions, returning per-item results + an aggregate score. */
export function gradeAttempt(items: GradableItem[]): {
  items: GradedItem[]
  summary: GradedScore
} {
  let score = 0
  let totalPoints = 0
  let correctCount = 0
  let gradedCount = 0

  const graded: GradedItem[] = items.map((item) => {
    const isCorrect = gradeAnswer(item.type, item.response, item.correct)
    if (isCorrect === null) {
      return { ...item, isCorrect: null, pointsAwarded: 0 }
    }
    gradedCount += 1
    totalPoints += item.points
    const pointsAwarded = isCorrect ? item.points : 0
    score += pointsAwarded
    if (isCorrect) correctCount += 1
    return { ...item, isCorrect, pointsAwarded }
  })

  const percent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0

  return {
    items: graded,
    summary: { score, totalPoints, correctCount, gradedCount, percent },
  }
}

/**
 * Estimate an IELTS band (Academic) from a raw score out of 40.
 * Standard conversion table (Reading/Listening). Rounded to the nearest 0.5.
 * When the test isn't out of 40 we scale the raw correct count to a /40 basis.
 */
export function ieltsBandFromRaw(rawCorrect: number, outOf: number): number {
  if (outOf <= 0) return 0
  const scaled = Math.round((rawCorrect / outOf) * 40)
  // Table: [minRawOutOf40, band]
  const table: ReadonlyArray<readonly [number, number]> = [
    [39, 9.0],
    [37, 8.5],
    [35, 8.0],
    [33, 7.5],
    [30, 7.0],
    [27, 6.5],
    [23, 6.0],
    [19, 5.5],
    [15, 5.0],
    [13, 4.5],
    [10, 4.0],
    [8, 3.5],
    [6, 3.0],
    [4, 2.5],
    [0, 2.0],
  ]
  for (const [min, band] of table) {
    if (scaled >= min) return band
  }
  return 2.0
}

/** Band estimate from a percentage (used when a test isn't 40-question shaped). */
export function ieltsBandFromPercent(percent: number): number {
  return ieltsBandFromRaw(Math.round((percent / 100) * 40), 40)
}
