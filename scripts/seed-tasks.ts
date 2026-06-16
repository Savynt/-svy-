/**
 * Bulk task seeder.
 *
 * Reads the parser's JSON output (one file per source test) from
 *   ../svy-ielts/test-imports/_parsed/*.json
 * and upserts every task — with its question groups and questions — into the
 * database as PUBLISHED content, reusing the shared {@link persistNormalizedTask}
 * helper so the seed and the live import endpoint stay byte-for-byte consistent.
 *
 * Idempotent by slug: re-running updates existing tasks instead of duplicating
 * them, so it is safe to run after every parser pass.
 *
 * Run with:  npx tsx scripts/seed-tasks.ts
 * Override the source folder with the first CLI arg or PARSED_DIR env var.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'
import { prisma } from '@/lib/prisma'
import { persistNormalizedTask } from '@/lib/tasks/persist'
import { normalizedTaskSchema, type NormalizedTask } from '@/types/task'

// Default location of the parser output, relative to the svy-platform repo root.
const DEFAULT_PARSED_DIR = resolve(
  process.cwd(),
  '..',
  'demo',
  'test-imports',
  '_parsed',
)

/**
 * Parser output may be written either as a bare NormalizedTask or wrapped in a
 * ParseResult (`{ ok, source, task, warnings, errors }`). Pull the task out of
 * whichever shape we get, returning null for un-parseable / failed entries.
 */
function extractTask(raw: unknown, file: string): NormalizedTask | null {
  if (typeof raw !== 'object' || raw === null) {
    console.warn(`  ⚠ ${file}: not a JSON object — skipped`)
    return null
  }

  // ParseResult wrapper.
  if ('task' in raw || 'ok' in raw) {
    const wrapper = raw as { ok?: boolean; task?: unknown }
    if (wrapper.ok === false || wrapper.task == null) {
      console.warn(`  ⚠ ${file}: parser reported no usable task — skipped`)
      return null
    }
    return validate(wrapper.task, file)
  }

  // Bare NormalizedTask.
  return validate(raw, file)
}

function validate(candidate: unknown, file: string): NormalizedTask | null {
  const result = normalizedTaskSchema.safeParse(candidate)
  if (!result.success) {
    console.warn(`  ⚠ ${file}: failed schema validation — skipped`)
    for (const issue of result.error.issues.slice(0, 4)) {
      console.warn(`      · ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    }
    return null
  }
  return result.data
}

async function main(): Promise<void> {
  const dir = resolve(process.argv[2] ?? process.env.PARSED_DIR ?? DEFAULT_PARSED_DIR)
  console.log(`Seeding tasks from: ${dir}\n`)

  let entries: string[]
  try {
    entries = (await readdir(dir))
      .filter((f) => f.toLowerCase().endsWith('.json'))
      // `index.json` is the parser's run summary, not a task — skip it.
      .filter((f) => f.toLowerCase() !== 'index.json')
      .sort()
  } catch {
    console.error(
      `✗ Could not read "${dir}". Run the parser first so it can write _parsed/*.json, ` +
        `or pass the folder as an argument: npx tsx scripts/seed-tasks.ts <dir>`,
    )
    process.exitCode = 1
    return
  }

  if (entries.length === 0) {
    console.warn('No .json files found — nothing to seed.')
    return
  }

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0
  let groupTotal = 0
  let questionTotal = 0

  for (const file of entries) {
    const label = basename(file)
    let raw: unknown
    try {
      raw = JSON.parse(await readFile(join(dir, file), 'utf8'))
    } catch {
      console.warn(`  ⚠ ${label}: invalid JSON — skipped`)
      skipped++
      continue
    }

    const task = extractTask(raw, label)
    if (!task) {
      skipped++
      continue
    }

    try {
      const res = await persistNormalizedTask(task, { status: 'PUBLISHED', authorId: null })
      groupTotal += res.groupCount
      questionTotal += res.questionCount
      if (res.created) created++
      else updated++
      console.log(
        `  ${res.created ? '+' : '~'} ${res.slug}  (${res.groupCount} groups, ${res.questionCount} questions)`,
      )
    } catch (err) {
      failed++
      const message = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${label}: ${message}`)
    }
  }

  console.log(
    [
      '\nDone.',
      `  files:     ${entries.length}`,
      `  created:   ${created}`,
      `  updated:   ${updated}`,
      `  skipped:   ${skipped}`,
      `  failed:    ${failed}`,
      `  groups:    ${groupTotal}`,
      `  questions: ${questionTotal}`,
    ].join('\n'),
  )

  if (failed > 0) process.exitCode = 1
}

main()
  .catch((err: unknown) => {
    console.error('Seeder crashed:', err)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
