import { parse, type HTMLElement } from 'node-html-parser'
import {
  type NormalizedQuestion,
  type NormalizedQuestionGroup,
  type NormalizedTask,
  type ParseResult,
  type QuestionType,
} from '@/types/task'

/**
 * HTML → unified Task parser.
 *
 * The source corpus (../svy-ielts/test-imports/_dump) is a pile of standalone,
 * self-grading IELTS practice pages authored by many different people. There is
 * no single template; in practice they fall into two families:
 *
 *  1. STATIC-DOM pages — the passage and every question are real DOM
 *     (`.passage`/`.passage-container`, `.question`/`.answer-input`, `<select>`,
 *     `<input>`, radio/checkbox groups, drag-and-drop `.draggable-option`s).
 *     The answer key lives in a JS object inside a `<script>`
 *     (`const correctAnswers = { q1: "TRUE", ... }` or `const answers = { 1: ... }`).
 *
 *  2. CONFIG-driven pages — the DOM body is mostly empty and a single
 *     `const CONFIG = { sections: [...] }` object is rendered client-side. These
 *     carry the richest structure (explicit `type`, `prompt`, `correct`,
 *     `headingsList`, `options`) so we parse the config directly.
 *
 * Everything is best-effort: we never throw. Anything ambiguous becomes a
 * warning; only a genuinely unusable file produces an error + `ok:false`.
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseHtmlTask(html: string, filename: string): ParseResult {
  const warnings: string[] = []
  const errors: string[] = []
  const source = filename

  try {
    const root = parse(html, {
      lowerCaseTagName: true,
      comment: false,
      blockTextElements: { script: true, style: true, noscript: true },
    })

    const scriptText = collectScriptText(root)
    const slug = slugFromFilename(filename)
    const title = extractTitle(root, filename) ?? slug
    const skill = detectSkill(root, html, filename, scriptText)

    // Prefer the CONFIG family — it is the most reliable, fully-structured form.
    const config = extractConfig(scriptText)
    const built = config
      ? buildFromConfig(config, { slug, title, skill, warnings })
      : buildFromDom(root, scriptText, { slug, title, skill, warnings })

    if (!built) {
      errors.push('No recognisable questions or passage could be extracted.')
      return { ok: false, source, warnings, errors }
    }

    if (built.groups.length === 0) {
      warnings.push('No question groups were detected.')
    }
    const total = built.groups.reduce((n, g) => n + g.questions.length, 0)
    if (total === 0) {
      warnings.push('No individual questions were detected.')
    }

    return { ok: true, source, task: built, warnings, errors }
  } catch (err) {
    // Defensive: parsing should never crash the batch importer.
    errors.push(`Unexpected parser failure: ${errorMessage(err)}`)
    return { ok: false, source, warnings, errors }
  }
}

// ---------------------------------------------------------------------------
// Shared context
// ---------------------------------------------------------------------------

interface BuildContext {
  slug: string
  title: string
  skill: NormalizedTask['skill']
  warnings: string[]
}

function baseTask(ctx: BuildContext, source: string): NormalizedTask {
  return {
    slug: ctx.slug,
    title: ctx.title,
    track: 'IELTS',
    skill: ctx.skill,
    type: 'PRACTICE',
    durationMin: ctx.skill === 'LISTENING' ? 30 : 20,
    topics: [],
    source,
    groups: [],
  }
}

// ---------------------------------------------------------------------------
// CONFIG-driven family
// ---------------------------------------------------------------------------

interface ConfigItem {
  id?: number | string
  prompt?: string
  correct?: unknown
  answer?: unknown
}

interface ConfigSection {
  type?: string
  heading?: string
  title?: string
  instructions?: unknown
  instruction?: unknown
  headingsList?: Array<{ key?: string; text?: string }>
  options?: Array<{ key?: string; text?: string }>
  items?: ConfigItem[]
  correct?: unknown
  answer?: unknown
}

interface ConfigShape {
  title?: string
  subtitle?: string
  passage?: string
  passageHtml?: string
  durationMinutes?: number
  sections?: ConfigSection[]
}

function buildFromConfig(
  config: ConfigShape,
  ctx: BuildContext,
): NormalizedTask | null {
  const sections = Array.isArray(config.sections) ? config.sections : []
  if (sections.length === 0) {
    ctx.warnings.push('CONFIG object found but it had no sections.')
    return null
  }

  const task = baseTask(ctx, ctx.slug)
  if (typeof config.title === 'string' && config.title.trim()) {
    task.title = cleanText(config.title)
  }
  if (typeof config.durationMinutes === 'number' && config.durationMinutes > 0) {
    task.durationMin = Math.round(config.durationMinutes)
  }
  if (typeof config.subtitle === 'string' && config.subtitle.trim()) {
    task.instructions = cleanText(config.subtitle)
  }

  const groups: NormalizedQuestionGroup[] = []
  let groupOrder = 0

  for (const sec of sections) {
    const type = configSectionType(sec)
    const instruction = configInstruction(sec)
    const data: Record<string, unknown> = {}

    const headingsBank = asArray(sec.headingsList)
      .filter((h) => h && (h.key || h.text))
      .map((h) => ({ key: String(h.key ?? ''), text: cleanText(h.text ?? '') }))
    if (headingsBank.length > 0) data.headings = headingsBank

    const optionBank = asArray(sec.options)
      .filter((o) => o && (o.key || o.text))
      .map((o) => ({ key: String(o.key ?? ''), text: cleanText(o.text ?? '') }))
    if (optionBank.length > 0) data.options = optionBank

    const questions: NormalizedQuestion[] = []
    const items = Array.isArray(sec.items) ? sec.items : []

    if (items.length > 0) {
      let order = 0
      for (const item of items) {
        const answer = normaliseAnswer(item.correct ?? item.answer)
        if (answer === undefined) {
          ctx.warnings.push(
            `Question ${item.id ?? order + 1} ("${truncate(item.prompt ?? '')}") has no answer key.`,
          )
        }
        questions.push({
          order: order++,
          type,
          prompt: cleanText(item.prompt ?? `Question ${item.id ?? order}`),
          data: questionData(type, optionBank, headingsBank),
          answer: answer ?? '',
          points: 1,
        })
      }
    } else {
      // Multi-select section: a single grouped question with an array answer.
      const answer = normaliseAnswer(sec.correct ?? sec.answer)
      if (answer === undefined) {
        ctx.warnings.push(`Section "${instruction || type}" has no answer key.`)
      }
      questions.push({
        order: 0,
        type,
        prompt: instruction || 'Choose the correct option(s).',
        data: questionData(type, optionBank, headingsBank),
        answer: answer ?? [],
        points: Array.isArray(answer) ? answer.length : 1,
      })
    }

    groups.push({
      order: groupOrder++,
      type,
      instruction: instruction || sec.heading || `Questions group ${groupOrder}`,
      data: Object.keys(data).length > 0 ? data : undefined,
      questions,
    })
  }

  task.groups = groups
  task.passageHtml = extractConfigPassage(config) ?? task.passageHtml
  return task
}

function configSectionType(sec: ConfigSection): QuestionType {
  const raw = (sec.type ?? '').toString().toLowerCase()
  const instruction = configInstruction(sec)
  switch (raw) {
    case 'headings':
      return 'MATCHING_HEADINGS'
    case 'msq':
    case 'multiselect':
    case 'multi-select':
      return 'MULTI_SELECT'
    case 'mcq':
    case 'multiple':
    case 'multiple-choice':
      return 'MULTIPLE_CHOICE'
    case 'matching':
    case 'match':
      return 'MATCHING'
    case 'tfng':
      return 'TRUE_FALSE_NOTGIVEN'
    case 'ynng':
      return 'YES_NO_NOTGIVEN'
    case 'gap':
    case 'completion':
    case 'fill':
      return completionType(instruction)
    case 'short':
    case 'shortanswer':
      return 'SHORT_ANSWER'
    default:
      // Fall back to instruction-based detection.
      return detectTypeFromInstruction(instruction, sec.options?.length ?? 0)
  }
}

function configInstruction(sec: ConfigSection): string {
  const parts: string[] = []
  for (const key of ['instructions', 'instruction'] as const) {
    const value = sec[key]
    if (Array.isArray(value)) {
      parts.push(...value.map((v) => cleanText(String(v))))
    } else if (typeof value === 'string') {
      parts.push(cleanText(value))
    }
  }
  return parts.filter(Boolean).join(' ')
}

function extractConfigPassage(config: ConfigShape): string | undefined {
  const raw = config.passageHtml ?? config.passage
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return undefined
}

// ---------------------------------------------------------------------------
// Static-DOM family
// ---------------------------------------------------------------------------

function buildFromDom(
  root: HTMLElement,
  scriptText: string,
  ctx: BuildContext,
): NormalizedTask | null {
  const task = baseTask(ctx, ctx.slug)

  const passageHtml = extractPassageHtml(root)
  if (passageHtml) task.passageHtml = passageHtml

  const answerKey = extractAnswerKey(scriptText)
  if (Object.keys(answerKey).length === 0 && task.skill !== 'LISTENING') {
    ctx.warnings.push('No embedded answer key was found; answers will be empty.')
  }

  const container = findQuestionsContainer(root)
  const groups = extractGroups(container, answerKey, ctx)
  task.groups = groups

  // Listening: pull the title-channel as a topic and flag missing audio.
  if (task.skill === 'LISTENING') {
    if (!root.querySelector('audio')) {
      ctx.warnings.push('Listening test has no <audio> element; audioUrl unknown.')
    } else {
      const src = root.querySelector('audio source')?.getAttribute('src')
      const direct = root.querySelector('audio')?.getAttribute('src')
      const audioUrl = src ?? direct
      if (audioUrl) task.audioUrl = audioUrl
    }
  }

  if (groups.length === 0 && !passageHtml) return null
  return task
}

/**
 * Locate the element that holds the questions, tolerating layout variants. We
 * prefer the first candidate that actually contains inputs/selects (some pages
 * have a `.questions-container` that is only an answer-key/options side-panel),
 * and ultimately fall back to the document root (some exports omit `<body>`).
 */
function findQuestionsContainer(root: HTMLElement): HTMLElement {
  const selectors = [
    '.questions-container',
    'form#listening-test',
    '.questions',
    '#qroot',
    '.left-panel',
    'main',
    'form',
    'body',
  ]
  let best: HTMLElement | null = null
  let bestInputs = -1
  for (const sel of selectors) {
    for (const el of root.querySelectorAll(sel)) {
      // Strictly-greater keeps the earliest (most specific) selector on ties,
      // while still rejecting a small side-panel in favour of the real list.
      const count = el.querySelectorAll('input, select').length
      if (count > bestInputs) {
        best = el
        bestInputs = count
      }
    }
  }
  return best ?? root
}

/**
 * Walk the question container in document order, opening a new group whenever a
 * "Questions X–Y" heading + instruction block appears, then attaching every
 * `.question`/`.answer-input`/`.part` payload that follows to the open group.
 */
function extractGroups(
  container: HTMLElement,
  answerKey: AnswerKey,
  ctx: BuildContext,
): NormalizedQuestionGroup[] {
  const groups: NormalizedQuestionGroup[] = []
  let current: MutableGroup | null = null
  let pendingInstruction: string[] = []
  let groupOrder = 0

  const flush = () => {
    if (current && current.questions.length > 0) {
      groups.push(finaliseGroup(current, groupOrder++, ctx))
    }
    current = null
  }

  // Sections (listening) are themselves group boundaries.
  const sections = container.querySelectorAll('.part')
  const walkRoots = sections.length > 0 ? sections : [container]

  // Inputs already consumed by a leaf block, so loose-input capture skips them.
  const consumed = new Set<HTMLElement>()

  for (const sectionEl of walkRoots) {
    for (const node of descendantsInOrder(sectionEl)) {
      // A "Questions 1-5" boundary (heading OR instructions block) starts a
      // new group.
      if (isGroupBoundary(node)) {
        flush()
        pendingInstruction = [cleanText(node.text)]
        current = newGroup(cleanText(node.text))
        continue
      }

      // Instruction paragraphs / lists accumulate onto the open group — but
      // only those that live outside an actual leaf question block.
      if (isInstructionNode(node)) {
        const text = cleanText(node.text)
        if (text) {
          if (!current) current = newGroup('')
          pendingInstruction.push(text)
          current.instruction = joinInstruction(pendingInstruction)
        }
        continue
      }

      // Question payloads — only true leaves (wrapper sections are transparent,
      // so the walker descends to the real inputs/headings inside them).
      if (isLeafQuestionBlock(node)) {
        if (!current) current = newGroup('')
        for (const inp of node.querySelectorAll('input, select')) {
          consumed.add(inp)
        }
        const parsed = parseQuestionBlock(node, answerKey, ctx)
        for (const q of parsed) current.questions.push(q)
        continue
      }

      // Loose inputs: completion blanks / selects sitting directly in a
      // (transparent) wrapper with no `.question`/`.answer-input` of their own
      // (e.g. businesscards Qs 6-13 are bare `<p>...<input></p>`).
      if (isLooseAnswerInput(node) && !consumed.has(node)) {
        consumed.add(node)
        if (!current) current = newGroup('')
        const q = parseLooseInput(node, answerKey)
        if (q) current.questions.push(q)
      }
    }
  }

  flush()
  return groups
}

/** A heading or instruction block that announces a new "Questions N–M" set. */
function isGroupBoundary(node: HTMLElement): boolean {
  if (isQuestionsHeading(node)) return true
  const cls = node.classNames
  // `.instructions` / `.part-head` / `.top-note` blocks announce a new set when
  // their text leads with "Questions N…" (covers the .section/.card dialect).
  if (
    cls.includes('instructions') ||
    cls.includes('part-head') ||
    cls.includes('top-note')
  ) {
    return /^\s*(part\s+\d+|section\s+\d+|questions?\s+\d+)/i.test(
      cleanText(node.text),
    )
  }
  return false
}

/** A standalone text/select input not wrapped in a recognised question block. */
function isLooseAnswerInput(node: HTMLElement): boolean {
  const tag = node.tagName?.toLowerCase()
  if (tag === 'select') return !isInsideLeafQuestion(node)
  if (tag === 'input') {
    const type = (node.getAttribute('type') ?? 'text').toLowerCase()
    if (type === 'radio' || type === 'checkbox' || type === 'hidden') return false
    return !isInsideLeafQuestion(node)
  }
  return false
}

function parseLooseInput(
  input: HTMLElement,
  answerKey: AnswerKey,
): NormalizedQuestion | null {
  const tag = input.tagName?.toLowerCase()
  const id = input.getAttribute('id') ?? input.getAttribute('name') ?? ''
  const num = questionNumberFrom(id)
  if (tag === 'select') {
    const options = input
      .querySelectorAll('option')
      .map((o) => cleanText(o.text))
      .filter((t) => t && !/^select answer$/i.test(t))
    const type = detectChoiceType(options)
    return {
      order: 0,
      type,
      prompt: promptForInput(input, input, num),
      data: {
        options: options.map((text) => ({ key: text, text })),
        numbered: num,
      },
      answer: lookupAnswer(answerKey, id, num) ?? '',
      points: 1,
    }
  }
  return {
    order: 0,
    type: 'NOTE_COMPLETION',
    prompt: promptForInput(input, input, num),
    data: { numbered: num },
    answer: lookupAnswer(answerKey, id, num) ?? '',
    points: 1,
  }
}

interface MutableGroup {
  instruction: string
  rawHeading: string
  questions: NormalizedQuestion[]
}

function newGroup(heading: string): MutableGroup {
  return { instruction: heading, rawHeading: heading, questions: [] }
}

function finaliseGroup(
  group: MutableGroup,
  order: number,
  ctx: BuildContext,
): NormalizedQuestionGroup {
  // Re-order question indices within the group and derive the group type from
  // the dominant per-question type.
  const counts = new Map<QuestionType, number>()
  group.questions.forEach((q, i) => {
    q.order = i
    counts.set(q.type, (counts.get(q.type) ?? 0) + 1)
  })
  let groupType: QuestionType = group.questions[0]?.type ?? 'SHORT_ANSWER'
  let best = 0
  for (const [type, n] of counts) {
    if (n > best) {
      best = n
      groupType = type
    }
  }

  // Collect any shared option/heading bank present on member questions.
  const data: Record<string, unknown> = {}
  const sharedHeadings = group.questions.find((q) => q.data?.headings)?.data
    ?.headings
  const sharedOptions = group.questions.find((q) => q.data?.bank)?.data?.bank
  if (sharedHeadings) data.headings = sharedHeadings
  if (sharedOptions) data.bank = sharedOptions

  if (!group.instruction) {
    ctx.warnings.push(`Group ${order + 1} has no instruction text.`)
  }

  return {
    order,
    type: groupType,
    instruction: group.instruction || group.rawHeading || `Group ${order + 1}`,
    data: Object.keys(data).length > 0 ? data : undefined,
    questions: group.questions,
  }
}

/**
 * Parse one `.question` / `.answer-input` / `.drag-match-container` block into
 * one or more normalised questions. A single block can carry several inputs
 * (e.g. a summary paragraph with three `<input>` blanks), so we return a list.
 */
function parseQuestionBlock(
  block: HTMLElement,
  answerKey: AnswerKey,
  ctx: BuildContext,
): NormalizedQuestion[] {
  // Drag-and-drop matching (listening Qs 17-20 / 26-30).
  if (
    block.classNames.includes('drag-match-container') ||
    block.querySelector('.draggable-option')
  ) {
    return parseDragMatch(block, answerKey)
  }

  const selects = block.querySelectorAll('select')
  const textInputs = block.querySelectorAll('input[type="text"]')
  const bareInputs = block
    .querySelectorAll('input')
    .filter((i) => {
      const t = (i.getAttribute('type') ?? 'text').toLowerCase()
      return t !== 'radio' && t !== 'checkbox' && t !== 'hidden'
    })
  const radios = block.querySelectorAll('input[type="radio"]')
  const checkboxes = block.querySelectorAll('input[type="checkbox"]')

  // Radio group → single multiple-choice question.
  if (radios.length > 0) {
    return [parseRadioQuestion(block, radios, answerKey)]
  }

  // Checkbox group → one multi-select question.
  if (checkboxes.length > 0) {
    return [parseCheckboxQuestion(block, checkboxes, answerKey, ctx)]
  }

  // Select dropdowns → one TF/NG or YN/NG question per select.
  if (selects.length > 0) {
    return selects.map((sel) => parseSelectQuestion(block, sel, answerKey))
  }

  // Text inputs → completion / short-answer, one per blank.
  const inputs = textInputs.length > 0 ? textInputs : bareInputs
  if (inputs.length > 0) {
    return parseInputQuestions(block, inputs, answerKey)
  }

  return []
}

function parseSelectQuestion(
  block: HTMLElement,
  select: HTMLElement,
  answerKey: AnswerKey,
): NormalizedQuestion {
  const id = select.getAttribute('id') ?? select.getAttribute('name') ?? ''
  const num = questionNumberFrom(id)
  const options = select
    .querySelectorAll('option')
    .map((o) => cleanText(o.text))
    .filter((t) => t && !/^select answer$/i.test(t))
  const type = detectChoiceType(options)
  const prompt = promptForInput(block, select, num)
  return {
    order: 0,
    type,
    prompt,
    data: {
      options: options.map((text) => ({ key: text, text })),
      numbered: num,
    },
    answer: lookupAnswer(answerKey, id, num) ?? '',
    points: 1,
  }
}

function parseRadioQuestion(
  block: HTMLElement,
  radios: HTMLElement[],
  answerKey: AnswerKey,
): NormalizedQuestion {
  const name = radios[0]?.getAttribute('name') ?? ''
  const num = questionNumberFrom(name)
  const options = radios.map((r) => ({
    key: r.getAttribute('value') ?? '',
    text: labelTextFor(block, r),
  }))
  const prompt = questionTextFrom(block) || `Question ${num ?? ''}`.trim()
  return {
    order: 0,
    type: 'MULTIPLE_CHOICE',
    prompt,
    data: { options, numbered: num },
    answer: lookupAnswer(answerKey, name, num) ?? '',
    points: 1,
  }
}

function parseCheckboxQuestion(
  block: HTMLElement,
  checkboxes: HTMLElement[],
  answerKey: AnswerKey,
  ctx: BuildContext,
): NormalizedQuestion {
  const options = checkboxes.map((c) => {
    const id = c.getAttribute('id') ?? ''
    return {
      id,
      key: deriveOptionLetter(c, block),
      text: labelTextFor(block, c),
    }
  })
  // The answer key for checkbox groups stores `true` per selected id
  // (e.g. q35a:true) — collect those ids and map to their option letters.
  const answer: string[] = []
  for (const opt of options) {
    if (opt.id && answerKey[opt.id] === true) answer.push(opt.key)
  }
  // Some pages store an array under the group number instead.
  if (answer.length === 0) {
    const num = questionNumberFrom(options[0]?.id ?? '')
    const grouped = lookupAnswer(answerKey, '', num)
    if (Array.isArray(grouped)) answer.push(...grouped)
  }
  if (answer.length === 0) {
    ctx.warnings.push('Multi-select question has no resolvable answer key.')
  }
  return {
    order: 0,
    type: 'MULTI_SELECT',
    prompt: questionTextFrom(block) || 'Choose all that apply.',
    data: { options: options.map(({ key, text }) => ({ key, text })) },
    answer,
    points: Math.max(1, answer.length),
  }
}

function parseInputQuestions(
  block: HTMLElement,
  inputs: HTMLElement[],
  answerKey: AnswerKey,
): NormalizedQuestion[] {
  return inputs.map((input) => {
    const id = input.getAttribute('id') ?? input.getAttribute('name') ?? ''
    const num = questionNumberFrom(id)
    const prompt = promptForInput(block, input, num)
    return {
      order: 0,
      type: 'NOTE_COMPLETION',
      prompt,
      data: { numbered: num },
      answer: lookupAnswer(answerKey, id, num) ?? '',
      points: 1,
    }
  })
}

function parseDragMatch(
  block: HTMLElement,
  answerKey: AnswerKey,
): NormalizedQuestion[] {
  const bank = block
    .querySelectorAll('.draggable-option')
    .map((o) => {
      const key = o.getAttribute('data-option-id') ?? ''
      const text = cleanText(o.text).replace(/^[A-Za-z]\s+/, '')
      return { key, text }
    })
    .filter((o) => o.key)

  const targets = block.querySelectorAll('.question-drop-target')
  return targets.map((target) => {
    const qid = target.getAttribute('data-question-id') ?? ''
    const num = questionNumberFrom(qid)
    return {
      order: 0,
      type: 'MATCHING',
      prompt: dragPromptFor(target, num),
      data: { bank, numbered: num },
      answer: normaliseLetter(lookupAnswer(answerKey, qid, num)) ?? '',
      points: 1,
    }
  })
}

// ---------------------------------------------------------------------------
// Passage extraction
// ---------------------------------------------------------------------------

function extractPassageHtml(root: HTMLElement): string | undefined {
  const candidates = [
    root.querySelector('.passage-container .passage'),
    root.querySelector('.passage'),
    root.querySelector('.passage-container'),
    root.querySelector('#passage'),
    root.querySelector('article'),
  ]
  for (const el of candidates) {
    if (!el) continue
    const html = sanitisePassage(el)
    if (html && plainLength(html) > 120) return html
  }
  return undefined
}

/** Keep paragraph/heading structure, strip interactive + script/style noise. */
function sanitisePassage(el: HTMLElement): string {
  const clone = parse(el.innerHTML)
  for (const junk of clone.querySelectorAll(
    'script, style, button, input, select, .timer, .results, .telegram-btn, .check-answers',
  )) {
    junk.remove()
  }
  return clone.innerHTML.trim()
}

// ---------------------------------------------------------------------------
// Answer key extraction (from <script> text)
// ---------------------------------------------------------------------------

type AnswerKey = Record<string, unknown>

/**
 * Find the answer-key object inside the page scripts. We look for the common
 * declaration names first (`correctAnswers`, `answers`, `ANSWERS`, `answerKey`)
 * and otherwise scan for any object literal whose keys look like question keys
 * (`q12` / `12`). Values may be strings, arrays of accepted strings, or `true`.
 */
function extractAnswerKey(scriptText: string): AnswerKey {
  const src = stripJsComments(scriptText)
  const names = ['correctAnswers', 'answers', 'ANSWERS', 'answerKey', 'correct']
  for (const name of names) {
    const obj = extractObjectLiteral(src, name)
    if (obj && looksLikeAnswerKey(obj)) return obj
  }
  // Last resort: scan every `{...}` that looks like an answer map.
  for (const literal of scanObjectLiterals(src)) {
    const obj = safeParseJsObject(literal)
    if (obj && looksLikeAnswerKey(obj)) return obj
  }
  return {}
}

function looksLikeAnswerKey(obj: AnswerKey): boolean {
  const keys = Object.keys(obj)
  if (keys.length === 0) return false
  const matchy = keys.filter((k) => /^q?\d+[a-z]?$/i.test(k)).length
  return matchy >= Math.max(1, Math.floor(keys.length / 2))
}

/** Pull `name = { ... }` and JSON-ise the object literal. */
function extractObjectLiteral(src: string, name: string): AnswerKey | null {
  const re = new RegExp(`${name}\\s*=\\s*\\{`, 'g')
  const match = re.exec(src)
  if (!match) return null
  const start = src.indexOf('{', match.index)
  const literal = sliceBalanced(src, start)
  if (!literal) return null
  return safeParseJsObject(literal)
}

/**
 * Remove `//` and block comments while respecting string literals, so a `//`
 * inside a URL string survives and an apostrophe inside a `/* … *​/` comment
 * (e.g. `writer's claims`) can't break later brace/quote tracking.
 */
function stripJsComments(src: string): string {
  let out = ''
  let inStr: string | null = null
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    const next = src[i + 1]
    if (inStr) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i++
      } else if (ch === inStr) {
        inStr = null
      }
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch
      out += ch
      continue
    }
    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n' && src[i] !== '\r') i++
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
      i++ // skip the closing '/'
      continue
    }
    out += ch
  }
  return out
}

/**
 * Slice from an opening `{` to its matching `}`, skipping over string literals
 * (single/double/backtick) so braces inside text never confuse the count.
 */
function sliceBalanced(src: string, open: number): string | null {
  let depth = 0
  let inStr: string | null = null
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (inStr) {
      if (ch === '\\') i++
      else if (ch === inStr) inStr = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') inStr = ch
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return src.slice(open, i + 1)
    }
  }
  return null
}

function scanObjectLiterals(src: string): string[] {
  const out: string[] = []
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '{') {
      const lit = sliceBalanced(src, i)
      if (lit && /['"]?q?\d+['"]?\s*:/i.test(lit)) out.push(lit)
    }
  }
  return out
}

/**
 * Interpret a loose JS object literal (answer key or CONFIG). First we try a
 * fast regex JSON-isation (handles single quotes, bare keys, trailing commas);
 * if that fails on quirkier literals (embedded quotes, template strings,
 * em-dashes, `it's`) we fall back to evaluating the literal as pure data.
 *
 * Safety: these literals come from local, author-written practice files that the
 * importer processes OFFLINE (never in the request path), and the evaluator is
 * gated by {@link isPureDataLiteral} which rejects anything that looks like code
 * (calls, arrows, control-flow), runs with no arguments, and returns only the
 * value. It is effectively a JSON5-style reader, not a JS sandbox escape risk.
 */
function safeParseJsObject(literal: string): AnswerKey | null {
  const json = literal
    // Strip `//` line comments, but never the `//` inside a URL (`https://`).
    .replace(/(^|[^:"'])\/\/[^\n\r]*/g, '$1')
    // Strip block comments (used between CONFIG sections).
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Collapse real line breaks / tabs — raw control chars break JSON.parse.
    .replace(/[\r\n\t]+/g, ' ')
    // Single-quoted strings → double-quoted (escape inner doubles first).
    .replace(/'((?:\\.|[^'\\])*)'/g, (_m, inner: string) => {
      return '"' + inner.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'
    })
    // Backtick strings → double-quoted.
    .replace(/`((?:\\.|[^`\\])*)`/g, (_m, inner: string) => {
      return '"' + inner.replace(/"/g, '\\"') + '"'
    })
    // Quote bare object keys (q12: / 12: / title: → "q12": / "12": / "title":).
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*|\d+)\s*:/g, '$1"$2":')
    // Drop trailing commas.
    .replace(/,(\s*[}\]])/g, '$1')

  try {
    const parsed: unknown = JSON.parse(json)
    if (isPlainObject(parsed)) return parsed as AnswerKey
  } catch {
    // fall through to the data-literal evaluator
  }

  return evalDataLiteral(literal)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Reject literals that contain anything beyond data so the evaluator can only
 * ever produce a value (no function calls, no arrow/function expressions, no
 * control flow, no template interpolation, no member access on identifiers).
 */
function isPureDataLiteral(literal: string): boolean {
  // Mask out string contents so prose like "don't call me" can't trip the gate.
  const masked = literal
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
  if (/[A-Za-z_$][\w$]*\s*\(/.test(masked)) return false // function call
  if (/=>|\bfunction\b/.test(masked)) return false // function expression
  if (/\b(?:return|new|while|for|if|=)\b/.test(masked)) return false // statements
  if (/\$\{/.test(masked)) return false // template interpolation
  return true
}

function evalDataLiteral(literal: string): AnswerKey | null {
  if (!isPureDataLiteral(literal)) return null
  try {
    // No args, returns the value only. `"use strict"` blocks `with`-style tricks.
    const fn = new Function(`"use strict"; return (${literal});`)
    const value: unknown = fn()
    return isPlainObject(value) ? (value as AnswerKey) : null
  } catch {
    return null
  }
}

/** Find a `CONFIG = { ... }` object and JSON-ise it (best fidelity family). */
function extractConfig(scriptText: string): ConfigShape | null {
  const src = stripJsComments(scriptText)
  const re = /(?:const|let|var)?\s*CONFIG\s*=\s*\{/.exec(src)
  if (!re) return null
  const start = src.indexOf('{', re.index)
  const literal = sliceBalanced(src, start)
  if (!literal) return null
  const obj = safeParseJsObject(literal)
  if (obj && Array.isArray((obj as ConfigShape).sections)) {
    return obj as ConfigShape
  }
  return null
}

// ---------------------------------------------------------------------------
// Answer normalisation + lookup
// ---------------------------------------------------------------------------

/** Look up an answer by element id, then by bare question number. */
function lookupAnswer(
  key: AnswerKey,
  id: string,
  num: number | undefined,
): string | string[] | undefined {
  if (id && id in key) return normaliseAnswer(key[id])
  if (num !== undefined) {
    if (`q${num}` in key) return normaliseAnswer(key[`q${num}`])
    if (String(num) in key) return normaliseAnswer(key[String(num)])
  }
  return undefined
}

/**
 * Reduce a raw answer value to the contract shape: `string` or `string[]`.
 * Accepted-variants arrays (`['march 30 1988', '30/03/1988']`) collapse to the
 * first/canonical form. `true`/`false` flags are not real answers here.
 */
function normaliseAnswer(value: unknown): string | string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return cleanAnswerText(value)
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return undefined
  if (Array.isArray(value)) {
    const items = value
      .filter((v) => typeof v === 'string' || typeof v === 'number')
      .map((v) => cleanAnswerText(String(v)))
      .filter(Boolean)
    if (items.length === 0) return undefined
    // Heuristic: a short list of single letters is a multi-answer; a list of
    // longer phrases is an accepted-variants list → keep only the first.
    const allLetters = items.every((s) => /^[A-Za-z]{1,3}$/.test(s))
    return allLetters && items.length > 1 ? items : items[0]
  }
  return undefined
}

function normaliseLetter(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value.toUpperCase()
  if (Array.isArray(value) && value.length > 0) return value[0].toUpperCase()
  return undefined
}

function cleanAnswerText(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Type detection
// ---------------------------------------------------------------------------

function detectSkill(
  root: HTMLElement,
  html: string,
  filename: string,
  scriptText: string,
): NormalizedTask['skill'] {
  const hay = `${filename} ${root.querySelector('title')?.text ?? ''}`.toLowerCase()
  if (root.querySelector('audio') || root.querySelector('.audio-controls')) {
    return 'LISTENING'
  }
  if (/listening|audio|\bsection\s*[1-4]\b/.test(hay)) return 'LISTENING'
  if (/part-title/.test(html) && /\bsection\b/i.test(html)) return 'LISTENING'
  if (/\baudioFiles\b|new Audio\(/.test(scriptText)) return 'LISTENING'
  if (/writing|essay|task\s*[12]/.test(hay)) return 'WRITING'
  if (/speaking|cue card/.test(hay)) return 'SPEAKING'
  return 'READING'
}

function detectChoiceType(options: string[]): QuestionType {
  const upper = options.map((o) => o.toUpperCase().trim())
  const set = new Set(upper)
  if (set.has('YES') && set.has('NO')) return 'YES_NO_NOTGIVEN'
  if (set.has('TRUE') && set.has('FALSE')) return 'TRUE_FALSE_NOTGIVEN'
  // A,B,C style answers from a select → multiple choice.
  return 'MULTIPLE_CHOICE'
}

function detectTypeFromInstruction(
  instruction: string,
  optionCount: number,
): QuestionType {
  const text = instruction.toLowerCase()
  if (/\bnot given\b/.test(text) && /\byes\b/.test(text)) return 'YES_NO_NOTGIVEN'
  if (/\bnot given\b/.test(text) && /\btrue\b/.test(text)) {
    return 'TRUE_FALSE_NOTGIVEN'
  }
  if (/correct heading|list of headings/.test(text)) return 'MATCHING_HEADINGS'
  if (/which (two|three|four|five)|choose (two|three|four)/.test(text)) {
    return 'MULTI_SELECT'
  }
  if (/match|next to questions|from the box|choose .* answers/.test(text)) {
    return 'MATCHING'
  }
  if (/label the|labelling/.test(text)) return 'LABELLING'
  if (/choose the correct letter|choose the correct answer/.test(text)) {
    return 'MULTIPLE_CHOICE'
  }
  if (/complete|fill in|write .* word|no more than/.test(text)) {
    return completionType(text)
  }
  if (/answer the questions|short answer/.test(text)) return 'SHORT_ANSWER'
  return optionCount > 0 ? 'MULTIPLE_CHOICE' : 'SHORT_ANSWER'
}

function completionType(instruction: string): QuestionType {
  const text = instruction.toLowerCase()
  if (/summary/.test(text)) return 'SUMMARY_COMPLETION'
  if (/\btable\b/.test(text)) return 'TABLE_COMPLETION'
  if (/\bsentence/.test(text)) return 'SENTENCE_COMPLETION'
  if (/\bnotes?\b|form below|flow-?chart/.test(text)) return 'NOTE_COMPLETION'
  return 'NOTE_COMPLETION'
}

function questionData(
  type: QuestionType,
  options: Array<{ key: string; text: string }>,
  headings: Array<{ key: string; text: string }>,
): Record<string, unknown> | undefined {
  if (type === 'MATCHING_HEADINGS' && headings.length > 0) {
    return { headings }
  }
  if (
    (type === 'MULTIPLE_CHOICE' ||
      type === 'MULTI_SELECT' ||
      type === 'MATCHING') &&
    options.length > 0
  ) {
    return { options }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// DOM text helpers
// ---------------------------------------------------------------------------

function isQuestionsHeading(node: HTMLElement): boolean {
  const tag = node.tagName?.toLowerCase()
  if (tag !== 'h1' && tag !== 'h2' && tag !== 'h3' && tag !== 'h4') return false
  return /^questions?\s+\d+/i.test(cleanText(node.text))
}

function isInstructionNode(node: HTMLElement): boolean {
  const tag = node.tagName?.toLowerCase()
  if (node.classNames.includes('instructions')) return true
  if (tag === 'ul' || tag === 'ol' || tag === 'p') {
    // Instruction text lives outside leaf question blocks; a paragraph inside a
    // real question is its prompt and is handled per block, not here. A <p>
    // that itself contains an answer blank is a question prompt, not guidance.
    if (node.querySelector('input, select')) return false
    return !isInsideLeafQuestion(node)
  }
  return false
}

/**
 * A "leaf" question block is the smallest `.question` / `.answer-input` /
 * `.question-item` / drag container that actually holds inputs and has no
 * nested question heading or nested question block. Wrapper sections (a
 * `.question` div that contains a `Questions 1-5` heading plus inner
 * `.answer-input` blocks) are transparent so the walker reaches the real
 * leaves and avoids double-counting.
 */
const LEAF_CLASSES = [
  'question',
  'answer-input',
  'question-item',
  'q-block',
  'mcq-question',
  'drag-match-container',
] as const
const LEAF_SELECTOR = LEAF_CLASSES.map((c) => `.${c}`).join(', ')

function hasClass(node: HTMLElement, name: string): boolean {
  return node.classList.contains(name)
}

function isLeafQuestionBlock(node: HTMLElement): boolean {
  const isCandidate =
    node.tagName?.toLowerCase() === 'div' &&
    LEAF_CLASSES.some((c) => hasClass(node, c))
  if (!isCandidate) return false

  // Drag containers are always handled as a single unit.
  if (hasClass(node, 'drag-match-container')) return true

  // A wrapper that contains its own questions-heading is transparent.
  if (
    node.querySelector('h1, h2, h3, h4') &&
    node
      .querySelectorAll('h1, h2, h3, h4')
      .some((h) => /^questions?\s+\d+/i.test(cleanText(h.text)))
  ) {
    return false
  }

  // A wrapper that contains nested leaf blocks is transparent.
  if (node.querySelector('.answer-input, .question-item, .q-block, .drag-match-container')) {
    return false
  }
  const nestedQuestions = node
    .querySelectorAll('.question')
    .filter((q) => q !== node)
  if (nestedQuestions.length > 0) return false

  // Must actually contain an input/select to be a leaf question.
  return node.querySelector('input, select') !== null
}

function isInsideLeafQuestion(node: HTMLElement): boolean {
  const owner = node.closest(LEAF_SELECTOR)
  return owner !== null && owner !== node && isLeafQuestionBlock(owner)
}

function joinInstruction(parts: string[]): string {
  return parts.map((p) => p.trim()).filter(Boolean).join(' ')
}

/** Determine the prompt text for an input/select inside a block. */
function promptForInput(
  block: HTMLElement,
  input: HTMLElement,
  num: number | undefined,
): string {
  // For completion blanks we use the surrounding paragraph text so the player
  // can show where the blank sits within the sentence/note.
  const para = input.closest('p') ?? block
  const text = promptTextOf(para)
  if (text) return text
  return num !== undefined ? `Question ${num}` : 'Complete the blank.'
}

/**
 * Plain prompt text for an element, stripping `<select>`/`<option>` dropdown
 * noise (e.g. the "Select answer / YES / NO / NOT GIVEN" option list) so the
 * prompt is just the question sentence.
 */
function promptTextOf(el: HTMLElement): string {
  const clone = parse(el.outerHTML || el.innerHTML)
  for (const sel of clone.querySelectorAll('select')) sel.remove()
  return cleanText(clone.text).replace(/\bselect answer\b/gi, '').trim()
}

function dragPromptFor(target: HTMLElement, num: number | undefined): string {
  const item = target.closest('.question-item')
  const text = item ? cleanText(item.text) : ''
  return text || (num !== undefined ? `Question ${num}` : 'Match the option.')
}

function questionTextFrom(block: HTMLElement): string {
  const qt = block.querySelector('.question-text')
  if (qt) {
    // For radio MCQs the number sits in a sibling .question-number span.
    const numEl = block.querySelector('.question-number')
    const prefix = numEl ? `${cleanText(numEl.text)} ` : ''
    return cleanText(`${prefix}${qt.text}`)
  }
  // `.qno` (the .q-block dialect) holds the numbered prompt directly.
  const qno = block.querySelector('.qno')
  if (qno) return cleanText(qno.text)
  const firstP = block.querySelector('p')
  if (firstP && !firstP.querySelector('input, select')) {
    return cleanText(firstP.text)
  }
  // Otherwise take the block's own text minus its option labels.
  const labels = block.querySelectorAll('label, .opts').map((l) => l.text)
  let text = block.text
  for (const l of labels) text = text.replace(l, ' ')
  return cleanText(text)
}

function labelTextFor(block: HTMLElement, input: HTMLElement): string {
  const id = input.getAttribute('id')
  if (id) {
    const label = block.querySelector(`label[for="${id}"]`)
    if (label) return cleanText(label.text)
  }
  const label = input.closest('label')
  if (label) return cleanText(label.text)
  // Fall back to the parent paragraph minus the leading letter.
  const p = input.closest('p')
  if (p) return cleanText(p.text)
  return ''
}

function deriveOptionLetter(input: HTMLElement, block: HTMLElement): string {
  const value = input.getAttribute('value')
  if (value) return value.toUpperCase()
  // Whale-style ids look like q35a/q35c → take the trailing letter.
  const id = input.getAttribute('id') ?? ''
  const tail = /([a-z])$/i.exec(id)
  if (tail) return tail[1].toUpperCase()
  const label = labelTextFor(block, input)
  const lead = /^([A-Z])\b/.exec(label)
  return lead ? lead[1] : ''
}

function questionNumberFrom(id: string): number | undefined {
  const m = /(\d+)/.exec(id)
  return m ? Number(m[1]) : undefined
}

// ---------------------------------------------------------------------------
// Title / slug / skill helpers
// ---------------------------------------------------------------------------

function extractTitle(root: HTMLElement, filename: string): string | null {
  const docTitle = root.querySelector('title')?.text
  if (docTitle) {
    const cleaned = cleanText(docTitle)
      .replace(/IELTS\s+(Academic\s+)?(Reading|Listening)\s+Practice\s*-?\s*/i, '')
      .replace(/\s*-\s*IELTS.*$/i, '')
      .trim()
    if (cleaned && cleaned.length > 2) return cleaned
  }
  const h1 = root.querySelector('h1')
  if (h1) {
    const t = cleanText(h1.text)
    if (t && !/^reading passage/i.test(t) && !/^questions?\b/i.test(t)) return t
  }
  // Title-case the slug as a last resort.
  return prettifyFilename(filename)
}

function slugFromFilename(filename: string): string {
  const base = filename
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
  const slug = base
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
  return slug || 'untitled-task'
}

function prettifyFilename(filename: string): string {
  return filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function collectScriptText(root: HTMLElement): string {
  return root
    .querySelectorAll('script')
    .map((s) => s.text)
    .join('\n')
}

/** Coerce a possibly-missing/non-array CONFIG field into a typed array. */
function asArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : []
}

/**
 * All element descendants in document order. Uses `querySelectorAll('*')`,
 * which is robust against malformed trees (some exported files have no `<body>`
 * and contain void-element quirks that break manual child recursion).
 */
function descendantsInOrder(el: HTMLElement): HTMLElement[] {
  return el.querySelectorAll('*')
}

function cleanText(s: string): string {
  return s
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function plainLength(html: string): number {
  return cleanText(parse(html).text).length
}

function truncate(s: string, n = 48): string {
  const t = cleanText(s)
  return t.length > n ? `${t.slice(0, n)}…` : t
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
