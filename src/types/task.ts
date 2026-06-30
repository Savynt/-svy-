import { z } from 'zod'

/**
 * Unified Task format — the single shape every importer (HTML/DOCX/manual)
 * normalises to, and what the test player consumes. Mirrors the Prisma models
 * but is the portable JSON contract (parser output → seed → DB).
 */

export const trackSchema = z.enum(['IELTS', 'SAT', 'GENERAL_ENGLISH', 'CEFR', 'MULTILEVEL'])
export const skillSchema = z.enum(['LISTENING', 'READING', 'SPEAKING', 'WRITING', 'MATH'])
export const taskTypeSchema = z.enum(['PRACTICE', 'MOCK', 'FULL', 'PLACEMENT'])
export const cefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])

export const questionTypeSchema = z.enum([
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
  'ESSAY',
  'SPEAKING_PROMPT',
])
export type QuestionType = z.infer<typeof questionTypeSchema>

/** One option for choice/matching questions. */
export const optionSchema = z.object({
  key: z.string(), // "A", "i", "1"
  text: z.string(),
})

export const questionSchema = z.object({
  order: z.number().int(),
  type: questionTypeSchema,
  prompt: z.string(),
  /** type-specific payload: options, headings bank, blanks, table rows… */
  data: z.record(z.string(), z.unknown()).optional(),
  /** correct answer(s) — string for single, string[] for multi/ordered */
  answer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().optional(),
  points: z.number().int().default(1),
})
export type NormalizedQuestion = z.infer<typeof questionSchema>

export const questionGroupSchema = z.object({
  order: z.number().int(),
  type: questionTypeSchema,
  instruction: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  questions: z.array(questionSchema),
})
export type NormalizedQuestionGroup = z.infer<typeof questionGroupSchema>

export const normalizedTaskSchema = z.object({
  slug: z.string(),
  title: z.string(),
  track: trackSchema,
  skill: skillSchema,
  type: taskTypeSchema.default('PRACTICE'),
  cefrLevel: cefrLevelSchema.optional(),
  ieltsBandMin: z.number().optional(),
  ieltsBandMax: z.number().optional(),
  durationMin: z.number().int().default(20),
  topics: z.array(z.string()).default([]),
  source: z.string().optional(),

  instructions: z.string().optional(),
  passageHtml: z.string().optional(), // reading text / writing context
  audioUrl: z.string().optional(),
  transcript: z.string().optional(),

  groups: z.array(questionGroupSchema).default([]),
})
export type NormalizedTask = z.infer<typeof normalizedTaskSchema>

/** Result of parsing one source file. */
export interface ParseResult {
  ok: boolean
  source: string
  task?: NormalizedTask
  warnings: string[]
  errors: string[]
}
