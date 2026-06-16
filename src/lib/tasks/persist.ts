import { prisma } from '@/lib/prisma'
import { normalizedTaskSchema, type NormalizedTask } from '@/types/task'
import { Prisma, type PrismaClient, type TaskStatus } from '@prisma/client'

/**
 * Shared persistence layer: turn a {@link NormalizedTask} (the portable JSON the
 * importers/seed produce) into real `Task` + `QuestionGroup` + `Question` rows.
 *
 * Used by:
 *  - the coach Upload endpoint (`/api/tasks/import?persist=1`)
 *  - the bulk seeder (`scripts/seed-tasks.ts`)
 *
 * Guarantees:
 *  - one atomic transaction per task (groups + questions never half-written)
 *  - idempotent by `slug` — re-running upserts the same task instead of cloning
 *    it (existing groups/questions are wiped and rebuilt so edits propagate)
 *  - enum fields are validated against the contract before they hit Prisma, so a
 *    malformed payload fails loudly instead of writing a broken row
 */

export interface PersistOptions {
  /** Lifecycle status for the task. Caller decides (coach → PENDING_REVIEW). */
  status: TaskStatus
  /** User id to attribute authorship to (null for system seeds). */
  authorId?: string | null
}

export interface PersistResult {
  taskId: string
  slug: string
  /** false when an existing task with the same slug was updated. */
  created: boolean
  groupCount: number
  questionCount: number
}

/**
 * A Prisma client or an interactive transaction client — lets callers either
 * pass their own `$transaction` scope or fall back to the module singleton.
 */
type Db = PrismaClient | Prisma.TransactionClient

/**
 * Nullable Json columns: normalise `undefined`/`null` to `Prisma.JsonNull`, the
 * sentinel that writes a real SQL NULL (a bare `null` would be rejected by the
 * `InputJsonValue` type). Anything else passes through as JSON.
 */
function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

/**
 * Persist a normalised task and all of its groups/questions in one transaction.
 *
 * @param input  a NormalizedTask (will be re-validated against the contract)
 * @param opts   target status + author attribution
 * @param db     optional existing transaction client (else a new tx is opened)
 */
export async function persistNormalizedTask(
  input: NormalizedTask,
  opts: PersistOptions,
  db?: Db,
): Promise<PersistResult> {
  // Re-validate (and apply defaults) so callers that hand us loosely-typed JSON
  // still get a contract-correct task before anything touches the DB.
  const task = normalizedTaskSchema.parse(input)

  const run = (tx: Prisma.TransactionClient) => writeTask(tx, task, opts)

  // A full PrismaClient exposes `$transaction`; an interactive TransactionClient
  // does not. If the caller is already inside a transaction, reuse it so the
  // whole import stays atomic; otherwise open our own.
  if (db && !('$transaction' in db)) {
    return run(db)
  }
  const client: PrismaClient = db ?? prisma
  return client.$transaction((tx) => run(tx))
}

async function writeTask(
  tx: Prisma.TransactionClient,
  task: NormalizedTask,
  opts: PersistOptions,
): Promise<PersistResult> {
  const publishedAt = opts.status === 'PUBLISHED' ? new Date() : null

  const baseData = {
    title: task.title,
    track: task.track,
    skill: task.skill,
    type: task.type,
    status: opts.status,
    cefrLevel: task.cefrLevel ?? null,
    ieltsBandMin: task.ieltsBandMin ?? null,
    ieltsBandMax: task.ieltsBandMax ?? null,
    durationMin: task.durationMin,
    topics: task.topics,
    source: task.source ?? null,
    instructions: task.instructions ?? null,
    passageHtml: task.passageHtml ?? null,
    audioUrl: task.audioUrl ?? null,
    transcript: task.transcript ?? null,
    authorId: opts.authorId ?? null,
    publishedAt,
  } satisfies Omit<Prisma.TaskUncheckedCreateInput, 'slug'>

  // Detect an existing task so we can report created vs. updated and so the
  // upsert wipes stale children rather than appending duplicates.
  const existing = await tx.task.findUnique({
    where: { slug: task.slug },
    select: { id: true },
  })

  if (existing) {
    // Idempotent update: cascade-delete children (FK onDelete: Cascade) and
    // rebuild them from the incoming payload.
    await tx.question.deleteMany({ where: { taskId: existing.id } })
    await tx.questionGroup.deleteMany({ where: { taskId: existing.id } })
    await tx.task.update({ where: { id: existing.id }, data: baseData })
    const counts = await writeGroups(tx, existing.id, task)
    return { taskId: existing.id, slug: task.slug, created: false, ...counts }
  }

  const created = await tx.task.create({
    data: { slug: task.slug, ...baseData },
    select: { id: true },
  })
  const counts = await writeGroups(tx, created.id, task)
  return { taskId: created.id, slug: task.slug, created: true, ...counts }
}

/**
 * Create every group and its questions for a task. Questions carry both their
 * group id and the task id so the test player can fetch a flat ordered list or
 * a grouped one. A global running order keeps questions stable across groups.
 */
async function writeGroups(
  tx: Prisma.TransactionClient,
  taskId: string,
  task: NormalizedTask,
): Promise<{ groupCount: number; questionCount: number }> {
  let questionCount = 0
  let globalOrder = 0

  for (const group of task.groups) {
    const createdGroup = await tx.questionGroup.create({
      data: {
        taskId,
        order: group.order,
        type: group.type,
        instruction: group.instruction,
        data: toJson(group.data),
      },
      select: { id: true },
    })

    if (group.questions.length === 0) continue

    await tx.question.createMany({
      data: group.questions.map((q) => ({
        taskId,
        groupId: createdGroup.id,
        order: globalOrder++,
        type: q.type,
        prompt: q.prompt,
        data: toJson(q.data),
        // `answer` is a required Json column — never null; default to [].
        answer: (q.answer ?? []) as Prisma.InputJsonValue,
        explanation: q.explanation ?? null,
        points: q.points,
      })),
    })
    questionCount += group.questions.length
  }

  return { groupCount: task.groups.length, questionCount }
}
