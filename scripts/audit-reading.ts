/**
 * Reading-task audit gate (run, do NOT build).
 *
 * The HTML corpus is hand-authored with no shared template, so a task can parse
 * and validate against the schema while still being unusable in the player — a
 * TRUE/FALSE picker with no statement to judge, a "choose TWO letters" question
 * with nothing to choose from, or a question range that silently lost half its
 * questions. Schema-valid is not the same as answerable.
 *
 * This script answers one question per task: *could a learner actually sit this
 * test and be graded fairly?* Anything that fails is reported and excluded — it
 * is better to publish fewer tests than to publish broken ones.
 *
 * Usage:
 *   npx tsx scripts/audit-reading.ts [parsedDir] [--copy-clean <dir>] [--limit N]
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const DEFAULT_PARSED = resolve(process.cwd(), '..', 'demo', 'test-imports', '_parsed')

/** Minimum passage length (plain characters) for a real reading passage. */
const MIN_PASSAGE_CHARS = 1200

/** Question types that are unanswerable without a bank of choices to pick from. */
const BANK_KEYS: Readonly<Record<string, readonly string[]>> = {
  MATCHING_HEADINGS: ['headings', 'options', 'bank'],
  MATCHING: ['options', 'matches', 'bank'],
  MULTIPLE_CHOICE: ['options'],
  MULTI_SELECT: ['options'],
}

/** A prompt that carries no question — just a number or a stub. */
const PLACEHOLDER_PROMPT = /^(?:questions?|q)\s*\d+\s*$|^complete the blank\.?$|^\s*$/i

interface Question {
  prompt?: string
  type: string
  answer?: unknown
  data?: Record<string, unknown> | null
}
interface Group {
  type: string
  instruction?: string
  data?: Record<string, unknown> | null
  questions: Question[]
}
interface Task {
  slug: string
  title: string
  skill: string
  passageHtml?: string
  groups: Group[]
}

export interface AuditResult {
  slug: string
  title: string
  file: string
  questions: number
  types: string[]
  passageChars: number
  defects: string[]
  passageHash: string
}

function plain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * How many questions the rubric promises: "Questions 27-31" → 5, "Questions
 * 35-37" → 3. Returns null when the instruction states no range, which is
 * common and not itself a defect.
 */
function promisedCount(instruction: string): number | null {
  // en dash, em dash and hyphen are all used, sometimes in the same file.
  const m = /questions?\s+(\d+)\s*[-–—]\s*(\d+)/i.exec(instruction)
  if (!m) return null
  const from = Number(m[1])
  const to = Number(m[2])
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null
  return to - from + 1
}

/**
 * "Which THREE of the following… write the letters in boxes 35-37" occupies
 * three answer-sheet boxes but is one question with a three-letter answer, so a
 * 3-box rubric answered by a single 3-element array is correct, not a loss.
 */
function isGroupedMultiSelect(group: Group, promised: number): boolean {
  if (group.questions.length !== 1) return false
  const only = group.questions[0]
  if (only.type !== 'MULTI_SELECT') return false
  return Array.isArray(only.answer) && only.answer.length === promised
}

function hasBank(group: Group, question: Question): boolean {
  const keys = BANK_KEYS[question.type]
  if (!keys) return true
  const merged = { ...(group.data ?? {}), ...(question.data ?? {}) }
  return keys.some((k) => Array.isArray(merged[k]) && (merged[k] as unknown[]).length > 0)
}

export function auditTask(task: Task, file: string): AuditResult {
  const defects: string[] = []
  const passage = plain(task.passageHtml ?? '')
  const types: string[] = []
  let questions = 0
  /** Answer-sheet boxes: a "choose THREE letters" question fills three. */
  let marks = 0

  if (passage.length < MIN_PASSAGE_CHARS) {
    defects.push(`passage too short (${passage.length} chars) — nothing to read`)
  }

  for (const [gi, group] of task.groups.entries()) {
    if (!types.includes(group.type)) types.push(group.type)
    const label = `group ${gi + 1} (${group.type})`
    const instruction = (group.instruction ?? '').trim()

    if (!instruction) defects.push(`${label}: no instruction — the learner is not told what to do`)

    // A lost question is invisible in the player: the task simply ends early.
    const promised = promisedCount(instruction)
    if (promised !== null && promised !== group.questions.length && !isGroupedMultiSelect(group, promised)) {
      defects.push(
        `${label}: rubric promises ${promised} question(s) but ${group.questions.length} were extracted`,
      )
    }

    const seenPrompts = new Map<string, number>()
    for (const question of group.questions) {
      // The rubric must tell the learner what to do — not restate the questions
      // above the questions.
      const probe = (question.prompt ?? '').slice(0, 30).trim()
      if (probe.length >= 12 && instruction.includes(probe)) {
        defects.push(`${label}: instruction repeats the questions ("${probe}…")`)
      }
      questions++
      marks += Array.isArray(question.answer) && question.type === 'MULTI_SELECT'
        ? question.answer.length
        : 1
      const prompt = (question.prompt ?? '').trim()

      // A heading/matching prompt IS the paragraph label ("Paragraph B"), so a
      // bare number there is expected; everywhere else it means lost text.
      if (group.type !== 'MATCHING_HEADINGS' && PLACEHOLDER_PROMPT.test(prompt)) {
        defects.push(`${label}: question "${prompt}" has no question text`)
      }

      const answer = question.answer
      const emptyAnswer =
        answer === '' || answer == null || (Array.isArray(answer) && answer.length === 0)
      if (emptyAnswer) defects.push(`${label}: "${prompt.slice(0, 40)}" has no answer key`)

      if (!hasBank(group, question)) {
        defects.push(`${label}: "${prompt.slice(0, 40)}" has no options to choose from`)
      }

      if (group.type === 'MATCHING_HEADINGS') {
        const bank = ((group.data?.headings ?? question.data?.headings) ?? []) as Array<{
          key?: string
        }>
        if (Array.isArray(bank) && bank.length > 0 && typeof answer === 'string') {
          if (!bank.some((h) => h.key === answer)) {
            defects.push(`${label}: answer "${answer}" is not one of the listed headings`)
          }
        }
      }

      // Repeated prompts mean one blank's sentence was copied onto every blank —
      // the learner sees the same text N times and cannot tell them apart.
      if (prompt) seenPrompts.set(prompt, (seenPrompts.get(prompt) ?? 0) + 1)
    }
    for (const [prompt, n] of seenPrompts) {
      if (n > 1) {
        defects.push(`${label}: prompt repeated ${n}× — "${prompt.slice(0, 50)}"`)
      }
    }
  }

  if (questions < 8) defects.push(`only ${questions} question(s) — too thin for a reading test`)

  // A whole group can go missing with no group left to notice, so check the
  // paper-level range too ("You should spend about 20 minutes on Questions
  // 27-40") — the source states it in the passage or the task instructions.
  const overall = promisedCount(plain(`${task.passageHtml ?? ''}`).slice(0, 600))
  if (overall !== null && overall !== marks) {
    defects.push(`paper covers ${overall} answer box(es) but only ${marks} were extracted`)
  }

  return {
    slug: task.slug,
    title: task.title,
    file,
    questions,
    types,
    passageChars: passage.length,
    defects,
    passageHash: createHash('sha1').update(passage.slice(0, 4000)).digest('hex'),
  }
}

function loadTasks(dir: string): Array<{ task: Task; file: string }> {
  const out: Array<{ task: Task; file: string }> = []
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.json') || file === 'index.json') continue
    const raw: unknown = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    const rec = raw as { task?: Task }
    const task = (rec.task ?? raw) as Task
    if (!task || task.skill !== 'READING') continue
    out.push({ task, file })
  }
  return out
}

function main(): void {
  const args = process.argv.slice(2)
  const copyIdx = args.indexOf('--copy-clean')
  const copyTo = copyIdx >= 0 ? resolve(args[copyIdx + 1]) : null
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity
  const dir = resolve(args.find((a) => !a.startsWith('--') && a !== args[copyIdx + 1] && a !== args[limitIdx + 1]) ?? DEFAULT_PARSED)

  const results = loadTasks(dir).map(({ task, file }) => auditTask(task, file))
  const clean = results.filter((r) => r.defects.length === 0)
  const broken = results.filter((r) => r.defects.length > 0)

  console.log(`Audited ${results.length} READING task(s) from ${dir}\n`)
  console.log(`  clean:  ${clean.length}`)
  console.log(`  broken: ${broken.length}\n`)

  if (broken.length > 0) {
    console.log('--- rejected ---')
    for (const r of broken.sort((a, b) => a.defects.length - b.defects.length)) {
      console.log(`\n  ${r.slug} (${r.questions}q) — ${r.defects.length} defect(s)`)
      for (const d of r.defects.slice(0, 4)) console.log(`      · ${d}`)
      if (r.defects.length > 4) console.log(`      · … +${r.defects.length - 4} more`)
    }
  }

  if (!copyTo) return

  // De-duplicate: the corpus contains literal re-uploads of the same test.
  const seen = new Set<string>()
  const unique = clean.filter((r) => {
    if (seen.has(r.passageHash)) return false
    seen.add(r.passageHash)
    return true
  })

  // Prefer variety: tests carrying a rarer question type go in first.
  const frequency = new Map<string, number>()
  for (const r of unique) for (const t of r.types) frequency.set(t, (frequency.get(t) ?? 0) + 1)
  const rarity = (r: AuditResult): number =>
    Math.min(...r.types.map((t) => frequency.get(t) ?? Infinity))

  const picked = [...unique]
    .sort((a, b) => rarity(a) - rarity(b) || b.questions - a.questions || a.slug.localeCompare(b.slug))
    .slice(0, limit)

  rmSync(copyTo, { recursive: true, force: true })
  mkdirSync(copyTo, { recursive: true })
  const tally: Record<string, number> = {}
  for (const r of picked) {
    writeFileSync(join(copyTo, r.file), readFileSync(join(dir, r.file)))
    for (const t of r.types) tally[t] = (tally[t] ?? 0) + 1
  }

  console.log(`\n--- accepted ---`)
  console.log(`unique clean tasks: ${unique.length}, copied ${picked.length} → ${copyTo}`)
  console.log(`questions: ${picked.reduce((s, r) => s + r.questions, 0)}`)
  console.log('type coverage:', tally)
}

// Only run as a CLI — `auditTask` is imported by other checks (e.g. auditing
// what actually landed in the database rather than what the parser produced).
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/audit-reading.ts')) {
  main()
}
