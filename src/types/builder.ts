import { z } from 'zod'
import {
  trackSchema,
  skillSchema,
  taskTypeSchema,
  cefrLevelSchema,
  type NormalizedTask,
  type NormalizedQuestion,
  type NormalizedQuestionGroup,
} from '@/types/task'

/**
 * Manual Test Builder contract.
 *
 * The HTML importer turned out to be unreliable (messy source files → broken
 * tasks), so the primary authoring path is now hand-entry: a coach/owner builds
 * a task group by group, types each question, its options and marks the correct
 * answer. This module is the single source of truth for that builder shape and
 * the *pure* function that lowers it to a {@link NormalizedTask} the existing
 * persist + grading layers already understand.
 *
 * Design choices:
 *  - One question *type per group* (mirrors real IELTS sections, keeps the UI
 *    simple: pick a type, write the instruction, add N questions of that type).
 *  - Option keys are derived from position (A, B, C…) — the author only writes
 *    the text and ticks the correct one, never bookkeeps letters.
 *  - The mapper is the one place that knows how each type encodes its answer key,
 *    so the builder UI, the API and any future importer all agree.
 */

/** Question types the manual builder exposes (subset of the full QuestionType). */
export const BUILDER_QUESTION_TYPES = [
  'MULTIPLE_CHOICE', // one correct option
  'MULTI_SELECT', // several correct options
  'TRUE_FALSE_NOTGIVEN', // TRUE / FALSE / NOT_GIVEN — about facts in the passage
  'YES_NO_NOTGIVEN', // YES / NO / NOT_GIVEN — about the writer's views/claims
  'MATCHING_HEADINGS', // pick the correct heading (i, ii, iii…) for each paragraph
  'SHORT_ANSWER', // typed answer (gap-fill); "/" separates accepted alternates
  // Gap-fill families. One question may hold several blanks: ";" separates the
  // blanks, "/" the accepted alternates inside one blank. The number of blanks
  // is derived from the answer key (see answerArity in the test page).
  'SENTENCE_COMPLETION',
  'SUMMARY_COMPLETION',
  'NOTE_COMPLETION',
  'TABLE_COMPLETION',
  'ESSAY', // writing — graded by coach/AI later
  'SPEAKING_PROMPT', // speaking — recorded, graded later
] as const

/** Which question types are allowed per skill. */
export const SKILL_ALLOWED_TYPES: Record<string, readonly (typeof BUILDER_QUESTION_TYPES)[number][]> = {
  LISTENING: [
    'MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE_NOTGIVEN', 'SHORT_ANSWER',
    'SENTENCE_COMPLETION', 'NOTE_COMPLETION', 'TABLE_COMPLETION',
  ],
  // Real IELTS Reading asks TRUE/FALSE/NOT GIVEN about facts and
  // YES/NO/NOT GIVEN about the writer's views — both appear in one paper —
  // alongside the summary/sentence/note/table completion families.
  READING: [
    'MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE_NOTGIVEN', 'YES_NO_NOTGIVEN', 'MATCHING_HEADINGS',
    'SHORT_ANSWER', 'SENTENCE_COMPLETION', 'SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'TABLE_COMPLETION',
  ],
  SPEAKING:  ['SPEAKING_PROMPT'],
  WRITING:   ['ESSAY'],
  MATH:      ['MULTIPLE_CHOICE', 'SHORT_ANSWER'], // SHORT_ANSWER = grid-in
  GRAMMAR:   ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'SHORT_ANSWER'],
}

export const builderQuestionTypeSchema = z.enum(BUILDER_QUESTION_TYPES)
export type BuilderQuestionType = z.infer<typeof builderQuestionTypeSchema>

/** Human labels + the metadata the UI needs to render the right editor. */
export const BUILDER_TYPE_META: Record<
  BuilderQuestionType,
  { label: string; hasOptions: boolean; objective: boolean; hint: string }
> = {
  MULTIPLE_CHOICE: {
    label: 'Multiple choice (one answer)',
    hasOptions: true,
    objective: true,
    hint: 'Add options, tick exactly one correct answer.',
  },
  MULTI_SELECT: {
    label: 'Multiple choice (several answers)',
    hasOptions: true,
    objective: true,
    hint: 'Add options, tick every correct answer.',
  },
  TRUE_FALSE_NOTGIVEN: {
    label: 'True / False / Not Given',
    hasOptions: false,
    objective: true,
    hint: 'For statements about facts in the passage. Pick the correct value.',
  },
  YES_NO_NOTGIVEN: {
    label: 'Yes / No / Not Given',
    hasOptions: false,
    objective: true,
    hint: 'For statements about the writer’s views or claims. Pick the correct value.',
  },
  MATCHING_HEADINGS: {
    label: 'Matching headings',
    hasOptions: false,
    objective: true,
    hint: 'List the headings (i, ii, iii…), then add one question per paragraph and pick its correct heading.',
  },
  SHORT_ANSWER: {
    label: 'Short answer / gap fill',
    hasOptions: false,
    objective: true,
    hint: 'Type the accepted answer. Separate alternates with “/”, e.g. color/colour.',
  },
  SENTENCE_COMPLETION: {
    label: 'Sentence completion',
    hasOptions: false,
    objective: true,
    hint: 'Complete the sentence. One blank: “migration”. Several: separate with “;”. Alternates with “/”.',
  },
  SUMMARY_COMPLETION: {
    label: 'Summary completion',
    hasOptions: false,
    objective: true,
    hint: 'Fill the summary’s blanks. Separate blanks with “;”, alternates with “/”.',
  },
  NOTE_COMPLETION: {
    label: 'Note completion',
    hasOptions: false,
    objective: true,
    hint: 'Fill the notes’ blanks. Separate blanks with “;”, alternates with “/”.',
  },
  TABLE_COMPLETION: {
    label: 'Table completion',
    hasOptions: false,
    objective: true,
    hint: 'Fill the table’s blanks. Separate blanks with “;”, alternates with “/”.',
  },
  ESSAY: {
    label: 'Essay (writing)',
    hasOptions: false,
    objective: false,
    hint: 'No answer key — a coach or AI grades the response.',
  },
  SPEAKING_PROMPT: {
    label: 'Speaking prompt',
    hasOptions: false,
    objective: false,
    hint: 'No answer key — the recording is graded later.',
  },
}

/** Skills available per track (for the builder UI). */
export const TRACK_SKILLS: Record<string, { value: string; label: string }[]> = {
  IELTS:           [
    { value: 'LISTENING', label: 'Listening' },
    { value: 'READING',   label: 'Reading' },
    { value: 'SPEAKING',  label: 'Speaking' },
    { value: 'WRITING',   label: 'Writing' },
  ],
  SAT:             [
    { value: 'READING', label: 'English / EBRW' },
    { value: 'MATH',    label: 'Math' },
  ],
  GENERAL_ENGLISH: [
    { value: 'GRAMMAR',   label: 'Grammar' },
    { value: 'LISTENING', label: 'Listening' },
    { value: 'READING',   label: 'Reading' },
    { value: 'SPEAKING',  label: 'Speaking' },
    { value: 'WRITING',   label: 'Writing' },
  ],
}

/** True/False/Not Given accepted values (also the stored answer tokens). */
export const TFNG_VALUES = ['TRUE', 'FALSE', 'NOT_GIVEN'] as const

/** Yes/No/Not Given accepted values (also the stored answer tokens). */
export const YNG_VALUES = ['YES', 'NO', 'NOT_GIVEN'] as const

/** The accepted answer tokens for whichever of the two ternary types is in use. */
export function ternaryValuesFor(type: BuilderQuestionType): readonly string[] {
  return type === 'YES_NO_NOTGIVEN' ? YNG_VALUES : TFNG_VALUES
}

const builderOptionSchema = z.object({
  text: z.string().trim().min(1, 'Option text is required'),
  correct: z.boolean().default(false),
})
export type BuilderOption = z.infer<typeof builderOptionSchema>

const builderQuestionSchema = z.object({
  prompt: z.string().trim().min(1, 'Question text is required'),
  /** choice types only */
  options: z.array(builderOptionSchema).default([]),
  /** SHORT_ANSWER accepted answer, or a TFNG value */
  answerText: z.string().trim().default(''),
  explanation: z.string().trim().optional(),
  /** optional image URL shown above the question (e.g. Google Drive share link) */
  imageUrl: z.string().trim().optional(),
  points: z.number().int().min(1).max(20).default(1),
})
export type BuilderQuestion = z.infer<typeof builderQuestionSchema>

const builderGroupSchema = z.object({
  type: builderQuestionTypeSchema,
  instruction: z.string().trim().min(1, 'Group instruction is required'),
  /** MATCHING_HEADINGS only: the shared list of headings; keys derived by
   * position as roman numerals (i, ii, iii…). Author writes only the text. */
  headings: z.array(z.string().trim().min(1)).optional(),
  /** Theory/explanation shown to the student before the questions (General English). */
  explanation: z.string().trim().optional(),
  /** Grammar example sentences shown to the student before questions. */
  examples: z.array(z.string().trim().min(1)).optional(),
  /** Common error pairs: { wrong, correct }. Grammar only. */
  errors: z.array(z.object({
    wrong: z.string().trim().min(1),
    correct: z.string().trim().min(1),
  })).optional(),
  questions: z.array(builderQuestionSchema).min(1, 'Add at least one question'),
})
export type BuilderGroup = z.infer<typeof builderGroupSchema>

export const builderTaskSchema = z.object({
  title: z.string().trim().min(3, 'Give the test a title'),
  track: trackSchema,
  skill: skillSchema,
  type: taskTypeSchema.default('PRACTICE'),
  cefrLevel: cefrLevelSchema.optional(),
  durationMin: z.number().int().min(1).max(480).default(20),
  topics: z.array(z.string().trim().min(1)).default([]),
  instructions: z.string().trim().optional(),
  /** reading passage / writing context (HTML or plain text) */
  passageHtml: z.string().trim().optional(),
  /** listening audio URL (paste a link — file upload is phase 2) */
  audioUrl: z.string().trim().url('Audio must be a valid URL').optional().or(z.literal('')),
  transcript: z.string().trim().optional(),
  /** when true, OWNER/ADMIN publish straight away; coaches always go to review */
  publish: z.boolean().default(false),
  groups: z.array(builderGroupSchema).min(1, 'Add at least one question group'),
})
export type BuilderTask = z.infer<typeof builderTaskSchema>

/** Positional option key: 0 → "A", 1 → "B", … */
export function optionKey(index: number): string {
  return String.fromCharCode(65 + index)
}

/**
 * Positional heading key: 0 → "i", 1 → "ii", … (IELTS Matching Headings).
 * Must stay in lock-step with the runtime renderer's roman fallback so the
 * stored bank keys, the author's picked answer and the learner's dropdown all
 * agree.
 */
export function headingKey(index: number): string {
  const table: ReadonlyArray<readonly [number, string]> = [
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ]
  let out = ''
  let rem = index + 1
  for (const [val, sym] of table) {
    while (rem >= val) {
      out += sym
      rem -= val
    }
  }
  return out
}

/** URL-safe slug from a title, suffixed for uniqueness by the caller if needed. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Lower one builder question to a {@link NormalizedQuestion}, encoding the
 * answer key exactly the way `@/lib/grade` expects to read it back:
 *  - MULTIPLE_CHOICE      → data.options[], answer = correct key ("B")
 *  - MULTI_SELECT         → data.options[], answer = correct keys (["A","C"])
 *  - TRUE_FALSE_NOTGIVEN  → answer = "TRUE" | "FALSE" | "NOT_GIVEN"
 *  - SHORT_ANSWER         → answer = the accepted string ("color/colour")
 *  - ESSAY / SPEAKING     → answer = [] (subjective, graded later)
 *
 * Throws a descriptive Error when an answer key is missing/invalid so the API
 * can surface it to the author instead of writing an ungradeable question.
 */
function questionToNormalized(
  q: BuilderQuestion,
  type: BuilderQuestionType,
  order: number,
  headings: ReadonlyArray<{ key: string; text: string }> = [],
): NormalizedQuestion {
  const base = {
    order,
    type,
    prompt: q.prompt,
    explanation: q.explanation || undefined,
    points: q.points,
  }
  const img = q.imageUrl ? { imageUrl: q.imageUrl } : {}

  switch (type) {
    case 'MULTIPLE_CHOICE':
    case 'MULTI_SELECT': {
      const options = q.options.map((o, i) => ({ key: optionKey(i), text: o.text }))
      const correctKeys = q.options
        .map((o, i) => (o.correct ? optionKey(i) : null))
        .filter((k): k is string => k !== null)

      if (options.length < 2) throw new Error(`"${q.prompt}": add at least two options.`)
      if (type === 'MULTIPLE_CHOICE' && correctKeys.length !== 1) {
        throw new Error(`"${q.prompt}": tick exactly one correct option.`)
      }
      if (type === 'MULTI_SELECT' && correctKeys.length < 1) {
        throw new Error(`"${q.prompt}": tick at least one correct option.`)
      }
      return {
        ...base,
        data: { options, ...img },
        answer: type === 'MULTIPLE_CHOICE' ? correctKeys[0]! : correctKeys,
      }
    }

    case 'MATCHING_HEADINGS': {
      // One question per paragraph. The shared heading bank lives on the group
      // and is mirrored onto each question (the runtime reads it per-question);
      // the answer is the key of the correct heading (i, ii, iii…).
      if (headings.length < 2) {
        throw new Error(`"${q.prompt || 'Matching headings'}": add at least two headings to the list.`)
      }
      const key = q.answerText.trim()
      if (!key) throw new Error(`"${q.prompt}": pick the correct heading for this paragraph.`)
      if (!headings.some((h) => h.key === key)) {
        throw new Error(`"${q.prompt}": the chosen heading is not in the list.`)
      }
      return { ...base, data: { headings: [...headings], ...img }, answer: key }
    }

    case 'TRUE_FALSE_NOTGIVEN':
    case 'YES_NO_NOTGIVEN': {
      const accepted = ternaryValuesFor(type)
      const value = q.answerText.toUpperCase().replace(/\s+/g, '_')
      if (!accepted.includes(value)) {
        throw new Error(`"${q.prompt}": choose ${accepted.join(', ')}.`)
      }
      return { ...base, data: Object.keys(img).length ? img : undefined, answer: value }
    }

    case 'SHORT_ANSWER': {
      if (!q.answerText) throw new Error(`"${q.prompt}": enter the accepted answer.`)
      return { ...base, data: Object.keys(img).length ? img : undefined, answer: q.answerText }
    }

    case 'SENTENCE_COMPLETION':
    case 'SUMMARY_COMPLETION':
    case 'NOTE_COMPLETION':
    case 'TABLE_COMPLETION': {
      // ";" splits the blanks; "/" inside a blank stays untouched — the grader
      // expands it as accepted alternates. The stored array's length is what
      // tells the test player how many inputs to draw.
      const blanks = q.answerText
        .split(';')
        .map((b) => b.trim())
        .filter(Boolean)
      if (blanks.length === 0) {
        throw new Error(`"${q.prompt}": enter the accepted answer for each blank.`)
      }
      return { ...base, data: Object.keys(img).length ? img : undefined, answer: blanks }
    }

    case 'ESSAY':
    case 'SPEAKING_PROMPT':
      // Subjective — no answer key. Default a higher weight so it counts.
      return { ...base, data: Object.keys(img).length ? img : undefined, points: q.points > 1 ? q.points : 9, answer: [] }
  }
}

/** Lower a whole builder task to the portable NormalizedTask contract. */
export function builderToNormalized(input: BuilderTask): NormalizedTask {
  const groups: NormalizedQuestionGroup[] = input.groups.map((g, gi) => {
    const data: Record<string, unknown> = {}
    if (g.explanation) data.explanation = g.explanation
    if (g.examples?.length) data.examples = g.examples
    if (g.errors?.length) data.errors = g.errors
    // Heading bank: text-only from the author, keys derived by position. Stored
    // on the group (for the "List of headings" panel) and mirrored per-question.
    const headings =
      g.type === 'MATCHING_HEADINGS'
        ? (g.headings ?? []).map((text, i) => ({ key: headingKey(i), text }))
        : []
    if (headings.length) data.headings = headings
    return {
      order: gi,
      type: g.type,
      instruction: g.instruction,
      data: Object.keys(data).length ? data : undefined,
      questions: g.questions.map((q, qi) => questionToNormalized(q, g.type, qi, headings)),
    }
  })

  const audioUrl = input.audioUrl && input.audioUrl.length > 0 ? input.audioUrl : undefined

  return {
    slug: slugify(input.title) || `task-${Date.now()}`,
    title: input.title,
    track: input.track,
    skill: input.skill,
    type: input.type,
    cefrLevel: input.cefrLevel,
    durationMin: input.durationMin,
    topics: input.topics,
    source: 'manual-builder',
    instructions: input.instructions || undefined,
    passageHtml: input.passageHtml || undefined,
    audioUrl,
    transcript: input.transcript || undefined,
    groups,
  }
}
