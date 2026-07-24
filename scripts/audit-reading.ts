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

/** Rationale text that belongs in `explanation`, never in the question. */
const LEAKED_EXPLANATION = /\b(?:explanation|answer\s+explanation)\s*[:—–-]/i

/** An option key is a label: "A", "iii", "12" — never a sentence. */
const MAX_KEY_LENGTH = 4

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

/** The option keys a learner can actually pick for this question. */
function bankKeys(group: Group, question: Question): string[] {
  const fields = BANK_KEYS[question.type]
  if (!fields) return []
  const merged = { ...(group.data ?? {}), ...(question.data ?? {}) }
  for (const field of fields) {
    const raw = merged[field]
    if (!Array.isArray(raw) || raw.length === 0) continue
    return raw.map((entry, i) => {
      if (typeof entry === 'string') return entry
      const key = (entry as { key?: unknown })?.key
      return typeof key === 'string' && key ? key : String.fromCharCode(65 + i)
    })
  }
  return []
}

/**
 * Can the stored answer be chosen from the options shown?
 *
 * A bank truncated during extraction (headings i–iv listed, answer "vii") is
 * invisible to every other check: the question has text, has options and has an
 * answer key — it is simply impossible to get right.
 */
function answerIsOnBank(keys: string[], answer: unknown): boolean {
  if (keys.length === 0) return true
  const given = (Array.isArray(answer) ? answer : [answer]).filter(
    (a): a is string => typeof a === 'string' && a.trim() !== '',
  )
  if (given.length === 0) return true
  const normalise = (s: string): string => s.trim().toLowerCase().replace(/[_\s]+/g, ' ')
  const allowed = new Set(keys.map(normalise))
  return given.every((a) => allowed.has(normalise(a)))
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

      if (LEAKED_EXPLANATION.test(prompt)) {
        defects.push(`${label}: "${prompt.slice(0, 40)}" prints the answer explanation in the question`)
      }

      if (!hasBank(group, question)) {
        defects.push(`${label}: "${prompt.slice(0, 40)}" has no options to choose from`)
      } else {
        const keys = bankKeys(group, question)
        const oversized = keys.find((k) => k.length > MAX_KEY_LENGTH)
        if (oversized !== undefined) {
          defects.push(`${label}: option key is a whole label ("${oversized.slice(0, 40)}…")`)
        }
        if (!answerIsOnBank(keys, answer)) {
          defects.push(
            `${label}: answer ${JSON.stringify(answer)} is not among the options ${JSON.stringify(keys.slice(0, 8))}`,
          )
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

  // Which defect keeps the most tests out? That is the next parser fix to make,
  // and the individual listing is far too long to read it off by eye.
  if (broken.length > 0) {
    const kinds = new Map<string, Set<string>>()
    for (const r of broken) {
      for (const defect of r.defects) {
        const kind = defect
          .replace(/^group \d+ \([A-Z_]+\): /, '')
          .replace(/"[^"]*"/g, '…')
          .replace(/\[[^\]]*\]/g, '[…]')
          .replace(/\d+/g, 'N')
        if (!kinds.has(kind)) kinds.set(kind, new Set())
        kinds.get(kind)!.add(r.slug)
      }
    }
    console.log('--- defects by number of tests they block ---')
    for (const [kind, slugs] of [...kinds].sort((a, b) => b[1].size - a[1].size)) {
      console.log(`  ${String(slugs.size).padStart(3)}  ${kind}`)
    }
    console.log()
  }

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
