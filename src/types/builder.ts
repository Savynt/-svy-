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
  'TRUE_FALSE_NOTGIVEN', // TRUE / FALSE / NOT_GIVEN
  'SHORT_ANSWER', // typed answer (gap-fill); "/" separates accepted alternates
  'ESSAY', // writing — graded by coach/AI later
  'SPEAKING_PROMPT', // speaking — recorded, graded later
] as const

/** Which question types are allowed per skill. */
export const SKILL_ALLOWED_TYPES: Record<string, readonly (typeof BUILDER_QUESTION_TYPES)[number][]> = {
  LISTENING: ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE_NOTGIVEN', 'SHORT_ANSWER'],
  READING:   ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE_NOTGIVEN', 'SHORT_ANSWER'],
  SPEAKING:  ['SPEAKING_PROMPT'],
  WRITING:   ['ESSAY'],
  MATH:      ['MULTIPLE_CHOICE', 'SHORT_ANSWER'], // SHORT_ANSWER = grid-in
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
    hint: 'Pick the correct statement value.',
  },
  SHORT_ANSWER: {
    label: 'Short answer / gap fill',
    hasOptions: false,
    objective: true,
    hint: 'Type the accepted answer. Separate alternates with “/”, e.g. color/colour.',
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
    { value: 'LISTENING', label: 'Listening' },
    { value: 'READING',   label: 'Reading' },
    { value: 'SPEAKING',  label: 'Speaking' },
    { value: 'WRITING',   label: 'Writing' },
  ],
}

/** True/False/Not Given accepted values (also the stored answer tokens). */
export const TFNG_VALUES = ['TRUE', 'FALSE', 'NOT_GIVEN'] as const

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
  /** Theory/explanation shown to the student before the questions (General English). */
  explanation: z.string().trim().optional(),
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

    case 'TRUE_FALSE_NOTGIVEN': {
      const value = q.answerText.toUpperCase().replace(/\s+/g, '_')
      if (!TFNG_VALUES.includes(value as (typeof TFNG_VALUES)[number])) {
        throw new Error(`"${q.prompt}": choose TRUE, FALSE or NOT_GIVEN.`)
      }
      return { ...base, data: Object.keys(img).length ? img : undefined, answer: value }
    }

    case 'SHORT_ANSWER': {
      if (!q.answerText) throw new Error(`"${q.prompt}": enter the accepted answer.`)
      return { ...base, data: Object.keys(img).length ? img : undefined, answer: q.answerText }
    }

    case 'ESSAY':
    case 'SPEAKING_PROMPT':
      // Subjective — no answer key. Default a higher weight so it counts.
      return { ...base, data: Object.keys(img).length ? img : undefined, points: q.points > 1 ? q.points : 9, answer: [] }
  }
}

/** Lower a whole builder task to the portable NormalizedTask contract. */
export function builderToNormalized(input: BuilderTask): NormalizedTask {
  const groups: NormalizedQuestionGroup[] = input.groups.map((g, gi) => ({
    order: gi,
    type: g.type,
    instruction: g.instruction,
    data: g.explanation ? { explanation: g.explanation } : undefined,
    questions: g.questions.map((q, qi) => questionToNormalized(q, g.type, qi)),
  }))

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
