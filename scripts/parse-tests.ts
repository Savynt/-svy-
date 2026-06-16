/**
 * Batch HTML → NormalizedTask importer (run, do NOT build).
 *
 * Reads every `*.html` in an input directory, runs `parseHtmlTask`, validates
 * the result against `normalizedTaskSchema`, writes one `<slug>.json` per file
 * plus an `index.json` summary, and prints a console report.
 *
 * Usage (tsx, no build step):
 *   npx tsx scripts/parse-tests.ts [inputDir] [outputDir]
 *
 * Defaults:
 *   inputDir  = ../svy-ielts/test-imports/_dump
 *   outputDir = ../svy-ielts/test-imports/_parsed
 */

import { readdirSync, readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'

import { parseHtmlTask } from '@/lib/parser/html'
import { normalizedTaskSchema } from '@/types/task'

const DEFAULT_INPUT = resolve(
  process.cwd(),
  '..',
  'demo',
  'test-imports',
  '_dump',
)
const DEFAULT_OUTPUT = resolve(
  process.cwd(),
  '..',
  'demo',
  'test-imports',
  '_parsed',
)

interface IndexEntry {
  source: string
  slug: string | null
  title: string | null
  skill: string | null
  ok: boolean
  valid: boolean
  groups: number
  questions: number
  warnings: number
  errors: string[]
  output: string | null
}

function main(): void {
  const inputDir = resolve(process.argv[2] ?? DEFAULT_INPUT)
  const outputDir = resolve(process.argv[3] ?? DEFAULT_OUTPUT)

  if (!existsDir(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`)
    process.exitCode = 1
    return
  }
  mkdirSync(outputDir, { recursive: true })

  const files = readdirSync(inputDir)
    .filter((f) => /\.html?$/i.test(f))
    .sort((a, b) => a.localeCompare(b))

  if (files.length === 0) {
    console.error(`No .html files found in ${inputDir}`)
    process.exitCode = 1
    return
  }

  console.log(`Parsing ${files.length} HTML file(s) from ${inputDir}\n`)

  const index: IndexEntry[] = []
  const usedSlugs = new Map<string, number>()
  let okCount = 0
  let validCount = 0
  let totalQuestions = 0
  const skillCounts: Record<string, number> = {}
  const typeCounts: Record<string, number> = {}

  for (const file of files) {
    const fullPath = join(inputDir, file)
    let entry: IndexEntry

    try {
      const html = readFileSync(fullPath, 'utf8')
      const result = parseHtmlTask(html, basename(file))

      let valid = false
      let outputName: string | null = null
      let groups = 0
      let questions = 0

      if (result.ok && result.task) {
        const parsed = normalizedTaskSchema.safeParse(result.task)
        valid = parsed.success
        if (!valid && parsed.error) {
          result.errors.push(
            `Schema validation failed: ${parsed.error.issues
              .slice(0, 3)
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join('; ')}`,
          )
        }

        const task = result.task
        groups = task.groups.length
        questions = task.groups.reduce((n, g) => n + g.questions.length, 0)
        totalQuestions += questions
        skillCounts[task.skill] = (skillCounts[task.skill] ?? 0) + 1
        for (const g of task.groups) {
          for (const q of g.questions) {
            typeCounts[q.type] = (typeCounts[q.type] ?? 0) + 1
          }
        }

        // Guarantee a unique filename even on slug collisions.
        outputName = uniqueSlug(usedSlugs, task.slug)
        writeFileSync(
          join(outputDir, `${outputName}.json`),
          JSON.stringify(task, null, 2),
          'utf8',
        )
      }

      if (result.ok) okCount++
      if (valid) validCount++

      entry = {
        source: result.source,
        slug: result.task?.slug ?? null,
        title: result.task?.title ?? null,
        skill: result.task?.skill ?? null,
        ok: result.ok,
        valid,
        groups,
        questions,
        warnings: result.warnings.length,
        errors: result.errors,
        output: outputName ? `${outputName}.json` : null,
      }
    } catch (err) {
      entry = {
        source: basename(file),
        slug: null,
        title: null,
        skill: null,
        ok: false,
        valid: false,
        groups: 0,
        questions: 0,
        warnings: 0,
        errors: [err instanceof Error ? err.message : String(err)],
        output: null,
      }
    }

    index.push(entry)
    printLine(entry)
  }

  writeFileSync(
    join(outputDir, 'index.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        inputDir,
        outputDir,
        totals: {
          files: files.length,
          ok: okCount,
          valid: validCount,
          questions: totalQuestions,
          bySkill: skillCounts,
          byQuestionType: typeCounts,
        },
        files: index,
      },
      null,
      2,
    ),
    'utf8',
  )

  console.log('\n' + '-'.repeat(60))
  console.log(`Files:            ${files.length}`)
  console.log(`Parsed ok:        ${okCount}`)
  console.log(`Schema-valid:     ${validCount}`)
  console.log(`Total questions:  ${totalQuestions}`)
  console.log(`By skill:         ${formatCounts(skillCounts)}`)
  console.log(`By question type: ${formatCounts(typeCounts)}`)
  console.log(`Output written to ${outputDir} (index.json + per-task JSON)`)
}

function printLine(entry: IndexEntry): void {
  const status = !entry.ok ? 'FAIL' : entry.valid ? ' OK ' : 'WARN'
  const meta = `${entry.skill ?? '?'} · ${entry.groups}g/${entry.questions}q`
  const warn = entry.warnings > 0 ? ` · ${entry.warnings} warn` : ''
  const err = entry.errors.length > 0 ? ` · ${entry.errors[0]}` : ''
  console.log(`[${status}] ${entry.source.padEnd(42)} ${meta}${warn}${err}`)
}

function uniqueSlug(used: Map<string, number>, slug: string): string {
  const seen = used.get(slug)
  if (seen === undefined) {
    used.set(slug, 1)
    return slug
  }
  used.set(slug, seen + 1)
  return `${slug}-${seen + 1}`
}

function existsDir(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function formatCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return '(none)'
  return entries.map(([k, n]) => `${k}=${n}`).join(', ')
}

main()
