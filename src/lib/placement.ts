/**
 * Adaptive placement engine — pure, deterministic, testable.
 *
 * A "CAT-lite": the test starts at B1 and walks a difficulty ladder
 * (A1 ↤ A2 ↤ B1 ↦ B2 ↦ C1 ↦ C2). A correct answer nudges the next question up
 * a level, a wrong answer nudges it down. The learner's final ability is the
 * highest level at which they answer reliably, which is mapped to a CEFR level
 * and a rough IELTS band.
 *
 * No React, no DB, no randomness in the core selection (selection is driven by
 * the running difficulty and which questions have already been served), so the
 * exact same logic runs in the client runner and the server-side scorer.
 */

import {
  PLACEMENT_QUESTIONS,
  type CefrLevel,
  type PlacementQuestion,
} from '@/data/placement-questions'

/** Ordered CEFR ladder, lowest → highest. */
export const CEFR_LADDER: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Where every adaptive test begins. */
export const START_LEVEL: CefrLevel = 'B1'

/** Target test length (clamped to what the bank can supply). */
export const TARGET_QUESTIONS = 18

/** Hard ceiling so we never loop forever or over-serve a sparse bank. */
export const MAX_QUESTIONS = 20

/** A single served question + the learner's verdict on it. */
export interface AnsweredItem {
  questionId: string
  /** Difficulty of the served question (denormalised for scoring). */
  level: CefrLevel
  correct: boolean
}

/** Numeric index of a level on the ladder (A1 = 0 … C2 = 5). */
export function levelIndex(level: CefrLevel): number {
  const i = CEFR_LADDER.indexOf(level)
  return i === -1 ? CEFR_LADDER.indexOf(START_LEVEL) : i
}

/** Clamp an index into the valid ladder range and return the level there. */
export function levelFromIndex(index: number): CefrLevel {
  const clamped = Math.max(0, Math.min(CEFR_LADDER.length - 1, Math.round(index)))
  return CEFR_LADDER[clamped]
}

/**
 * Decide the difficulty of the *next* question from the current difficulty and
 * whether the last answer was correct: up a step on success, down on a miss.
 */
export function nextLevel(current: CefrLevel, wasCorrect: boolean): CefrLevel {
  return levelFromIndex(levelIndex(current) + (wasCorrect ? 1 : -1))
}

/**
 * Pick the next question to serve at the desired difficulty.
 *
 * Prefers an unused question exactly at `desiredLevel`; if that bucket is
 * exhausted it spirals outward (closest level first, lower before higher) so the
 * test keeps flowing even when one band runs dry. Returns `null` when every
 * question in the bank has been served.
 *
 * Pure: selection depends only on the desired level and the set of served ids.
 */
export function selectNextQuestion(
  desiredLevel: CefrLevel,
  servedIds: ReadonlySet<string>,
  bank: readonly PlacementQuestion[] = PLACEMENT_QUESTIONS,
): PlacementQuestion | null {
  const available = bank.filter((q) => !servedIds.has(q.id))
  if (available.length === 0) return null

  const target = levelIndex(desiredLevel)
  let best: PlacementQuestion | null = null
  let bestRank = Number.POSITIVE_INFINITY

  for (const q of available) {
    const distance = levelIndex(q.level) - target
    // Rank by absolute distance, breaking ties toward the easier side so a
    // learner who is struggling is never pushed harder than necessary.
    const rank = Math.abs(distance) * 2 + (distance > 0 ? 1 : 0)
    if (rank < bestRank) {
      bestRank = rank
      best = q
    }
  }
  return best
}

/** How many questions the engine will serve for a given bank size. */
export function plannedQuestionCount(bank: readonly PlacementQuestion[] = PLACEMENT_QUESTIONS): number {
  return Math.min(TARGET_QUESTIONS, MAX_QUESTIONS, bank.length)
}

/** Weighted ability score in ladder units (0 = A1 … 5 = C2). */
export interface AbilityEstimate {
  /** Continuous ability on the ladder scale, before rounding to a level. */
  ability: number
  level: CefrLevel
  ieltsBand: number | null
  correctCount: number
  total: number
  /** Per-level breakdown: how the learner did at each difficulty served. */
  perLevel: Array<{ level: CefrLevel; correct: number; total: number }>
}

/**
 * Estimate ability from the answered items.
 *
 * Each correct answer contributes its question's ladder index, each wrong answer
 * contributes one step below it (floored at A1). Averaging these gives a stable,
 * difficulty-weighted ability: getting C1 items right pulls the score up far
 * more than getting A1 items right. The continuous ability then rounds to the
 * nearest CEFR level.
 */
export function estimateAbility(answers: readonly AnsweredItem[]): AbilityEstimate {
  const perLevelMap = new Map<CefrLevel, { correct: number; total: number }>()
  for (const level of CEFR_LADDER) perLevelMap.set(level, { correct: 0, total: 0 })

  let sum = 0
  let correctCount = 0

  for (const a of answers) {
    const idx = levelIndex(a.level)
    const bucket = perLevelMap.get(a.level)
    if (bucket) {
      bucket.total += 1
      if (a.correct) bucket.correct += 1
    }
    if (a.correct) {
      sum += idx
      correctCount += 1
    } else {
      // A miss places ability one step below the item's difficulty.
      sum += Math.max(0, idx - 1)
    }
  }

  const total = answers.length
  const ability = total > 0 ? sum / total : levelIndex(START_LEVEL)
  const level = levelFromIndex(ability)

  const perLevel = CEFR_LADDER.map((lvl) => {
    const b = perLevelMap.get(lvl) ?? { correct: 0, total: 0 }
    return { level: lvl, correct: b.correct, total: b.total }
  }).filter((row) => row.total > 0)

  return {
    ability,
    level,
    ieltsBand: ieltsBandForLevel(level, ability),
    correctCount,
    total,
    perLevel,
  }
}

/**
 * Map a CEFR level (refined by the continuous ability) to an approximate IELTS
 * overall band. The base band comes from the recognised CEFR↔IELTS alignment;
 * the fractional part of `ability` nudges within the band so a strong B2 reads
 * higher than a weak one. Rounded to the nearest 0.5, the IELTS reporting step.
 */
export function ieltsBandForLevel(level: CefrLevel, ability?: number): number {
  // Recognised midpoints for each CEFR band on the 9-point IELTS scale.
  const base: Record<CefrLevel, number> = {
    A1: 2.5,
    A2: 3.5,
    B1: 4.5,
    B2: 6.0,
    C1: 7.5,
    C2: 8.5,
  }
  const band = base[level]
  if (ability == null) return band

  // Offset by how far ability sits from the level's integer index (±0.5 step).
  const drift = ability - levelIndex(level)
  const adjusted = band + Math.max(-0.5, Math.min(0.5, drift))
  const rounded = Math.round(adjusted * 2) / 2
  return Math.max(1, Math.min(9, rounded))
}

/** Short, actionable guidance shown on the result screen for each level. */
export interface LevelGuidance {
  level: CefrLevel
  /** Human label, e.g. "B2 — Upper-Intermediate". */
  label: string
  /** One-line description of what this level means. */
  summary: string
  /** What to study next at this level. */
  focus: string[]
}

const LEVEL_LABELS: Record<CefrLevel, string> = {
  A1: 'A1 — Beginner',
  A2: 'A2 — Elementary',
  B1: 'B1 — Intermediate',
  B2: 'B2 — Upper-Intermediate',
  C1: 'C1 — Advanced',
  C2: 'C2 — Proficient',
}

const LEVEL_SUMMARIES: Record<CefrLevel, string> = {
  A1: 'You can use very basic phrases and understand simple, everyday English.',
  A2: 'You can handle short, routine exchanges and simple texts on familiar topics.',
  B1: 'You can deal with most situations while travelling and describe experiences clearly.',
  B2: 'You can interact fluently and understand the main ideas of complex texts.',
  C1: 'You can express yourself fluently and use English flexibly for academic and professional life.',
  C2: 'You can understand virtually everything and express subtle shades of meaning with ease.',
}

const LEVEL_FOCUS: Record<CefrLevel, string[]> = {
  A1: ['Core vocabulary and the present simple', 'Reading short notices and messages', 'Listening for key words'],
  A2: ['Past simple and common irregular verbs', 'Everyday vocabulary themes', 'Short reading passages'],
  B1: ['Conditionals and the present perfect', 'Collocations (make / do / take)', 'Skim-and-scan reading'],
  B2: ['Narrative tenses and the passive', 'Linking words and paraphrasing', 'IELTS Reading & Listening band 6+'],
  C1: ['Inversion and advanced conditionals', 'Academic & precise vocabulary', 'Inference in complex texts'],
  C2: ['Stylistic nuance and register', 'Idiomatic and figurative language', 'Full IELTS mocks for band 8+'],
}

/** Build the guidance block for a level. */
export function guidanceForLevel(level: CefrLevel): LevelGuidance {
  return {
    level,
    label: LEVEL_LABELS[level],
    summary: LEVEL_SUMMARIES[level],
    focus: LEVEL_FOCUS[level],
  }
}

/** Friendly display label for a level (e.g. "B2 — Upper-Intermediate"). */
export function levelLabel(level: CefrLevel): string {
  return LEVEL_LABELS[level]
}

/**
 * One-shot scoring entry point for the API: validate the answered items against
 * the real bank (so the client can't fake difficulty), then estimate ability.
 *
 * Items whose ids/levels don't match the bank are dropped; this keeps the score
 * authoritative on the server regardless of what the client posts.
 */
export interface ScoredPlacement extends AbilityEstimate {
  guidance: LevelGuidance
}

export function scorePlacement(
  rawAnswers: ReadonlyArray<{ questionId: string; correct: boolean }>,
  bank: readonly PlacementQuestion[] = PLACEMENT_QUESTIONS,
): ScoredPlacement {
  const byId = new Map(bank.map((q) => [q.id, q]))
  const validated: AnsweredItem[] = []
  for (const a of rawAnswers) {
    const q = byId.get(a.questionId)
    if (!q) continue
    validated.push({ questionId: q.id, level: q.level, correct: a.correct === true })
  }

  const estimate = estimateAbility(validated)
  return { ...estimate, guidance: guidanceForLevel(estimate.level) }
}

export type { CefrLevel, PlacementQuestion } from '@/data/placement-questions'
