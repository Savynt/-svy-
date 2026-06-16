/**
 * Built-in placement question bank (A1 → C2).
 *
 * The platform's DB content can be sparse early on, so the placement test ships
 * with its own self-contained mini-bank of graded reading / grammar / vocabulary
 * multiple-choice questions. Each item carries a difficulty level on the CEFR
 * scale, which the adaptive engine in `@/lib/placement` uses to raise or lower
 * difficulty as the learner answers.
 *
 * This is plain data — no React, no I/O — so it can be imported on the server
 * (scoring) and the client (running the test) alike.
 */

/** CEFR difficulty band a question targets. Mirrors the Prisma `CefrLevel` enum. */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

/** Which competence a question probes — shown as a subtle tag in the UI. */
export type PlacementSkill = 'grammar' | 'vocabulary' | 'reading'

export interface PlacementOption {
  /** Stable id used as the answer key + React key (never re-indexed). */
  id: string
  text: string
}

export interface PlacementQuestion {
  id: string
  level: CefrLevel
  skill: PlacementSkill
  /** Optional short reading stem shown above the prompt (reading items). */
  passage?: string
  prompt: string
  options: PlacementOption[]
  /** `id` of the single correct option. */
  correctId: string
}

/**
 * The bank: ~4 questions per level, A1 → C2 (24 total). Each level is ordered so
 * the engine can pick "the next unused item at level X" deterministically.
 * Keep prompts compact and unambiguous — placement is about signal, not length.
 */
export const PLACEMENT_QUESTIONS: readonly PlacementQuestion[] = [
  /* ───────────────────────────── A1 ───────────────────────────── */
  {
    id: 'a1-g1',
    level: 'A1',
    skill: 'grammar',
    prompt: 'She ___ a teacher.',
    options: [
      { id: 'a', text: 'is' },
      { id: 'b', text: 'are' },
      { id: 'c', text: 'am' },
      { id: 'd', text: 'be' },
    ],
    correctId: 'a',
  },
  {
    id: 'a1-v1',
    level: 'A1',
    skill: 'vocabulary',
    prompt: 'You write with a ___.',
    options: [
      { id: 'a', text: 'spoon' },
      { id: 'b', text: 'pen' },
      { id: 'c', text: 'chair' },
      { id: 'd', text: 'door' },
    ],
    correctId: 'b',
  },
  {
    id: 'a1-g2',
    level: 'A1',
    skill: 'grammar',
    prompt: 'There ___ two apples on the table.',
    options: [
      { id: 'a', text: 'is' },
      { id: 'b', text: 'has' },
      { id: 'c', text: 'are' },
      { id: 'd', text: 'be' },
    ],
    correctId: 'c',
  },
  {
    id: 'a1-r1',
    level: 'A1',
    skill: 'reading',
    passage: 'Tom gets up at 7 o’clock. He eats breakfast and goes to school by bus.',
    prompt: 'How does Tom go to school?',
    options: [
      { id: 'a', text: 'By car' },
      { id: 'b', text: 'On foot' },
      { id: 'c', text: 'By bus' },
      { id: 'd', text: 'By train' },
    ],
    correctId: 'c',
  },

  /* ───────────────────────────── A2 ───────────────────────────── */
  {
    id: 'a2-g1',
    level: 'A2',
    skill: 'grammar',
    prompt: 'Yesterday we ___ to the cinema.',
    options: [
      { id: 'a', text: 'go' },
      { id: 'b', text: 'went' },
      { id: 'c', text: 'going' },
      { id: 'd', text: 'gone' },
    ],
    correctId: 'b',
  },
  {
    id: 'a2-v1',
    level: 'A2',
    skill: 'vocabulary',
    prompt: 'My brother is very ___; he never gives money to anyone.',
    options: [
      { id: 'a', text: 'generous' },
      { id: 'b', text: 'mean' },
      { id: 'c', text: 'friendly' },
      { id: 'd', text: 'tall' },
    ],
    correctId: 'b',
  },
  {
    id: 'a2-g2',
    level: 'A2',
    skill: 'grammar',
    prompt: 'There isn’t ___ milk in the fridge.',
    options: [
      { id: 'a', text: 'some' },
      { id: 'b', text: 'many' },
      { id: 'c', text: 'any' },
      { id: 'd', text: 'a' },
    ],
    correctId: 'c',
  },
  {
    id: 'a2-r1',
    level: 'A2',
    skill: 'reading',
    passage:
      'The shop opens at 9 a.m. and closes at 6 p.m. from Monday to Friday. On Saturday it closes early, at 2 p.m. It is closed on Sunday.',
    prompt: 'When is the shop closed all day?',
    options: [
      { id: 'a', text: 'Saturday' },
      { id: 'b', text: 'Friday' },
      { id: 'c', text: 'Monday' },
      { id: 'd', text: 'Sunday' },
    ],
    correctId: 'd',
  },

  /* ───────────────────────────── B1 ───────────────────────────── */
  {
    id: 'b1-g1',
    level: 'B1',
    skill: 'grammar',
    prompt: 'If it ___ tomorrow, we will stay at home.',
    options: [
      { id: 'a', text: 'will rain' },
      { id: 'b', text: 'rains' },
      { id: 'c', text: 'rained' },
      { id: 'd', text: 'is raining' },
    ],
    correctId: 'b',
  },
  {
    id: 'b1-v1',
    level: 'B1',
    skill: 'vocabulary',
    prompt: 'I couldn’t ___ a decision, so I asked my parents for advice.',
    options: [
      { id: 'a', text: 'do' },
      { id: 'b', text: 'make' },
      { id: 'c', text: 'take' },
      { id: 'd', text: 'get' },
    ],
    correctId: 'b',
  },
  {
    id: 'b1-g2',
    level: 'B1',
    skill: 'grammar',
    prompt: 'She has lived here ___ 2015.',
    options: [
      { id: 'a', text: 'for' },
      { id: 'b', text: 'since' },
      { id: 'c', text: 'from' },
      { id: 'd', text: 'during' },
    ],
    correctId: 'b',
  },
  {
    id: 'b1-r1',
    level: 'B1',
    skill: 'reading',
    passage:
      'Although the weather forecast had promised sunshine, dark clouds gathered all afternoon and the match was eventually called off.',
    prompt: 'What happened to the match?',
    options: [
      { id: 'a', text: 'It was cancelled' },
      { id: 'b', text: 'It started late' },
      { id: 'c', text: 'It finished early' },
      { id: 'd', text: 'It was played in the sun' },
    ],
    correctId: 'a',
  },

  /* ───────────────────────────── B2 ───────────────────────────── */
  {
    id: 'b2-g1',
    level: 'B2',
    skill: 'grammar',
    prompt: 'By the time we arrived, the film ___ already ___.',
    options: [
      { id: 'a', text: 'has / started' },
      { id: 'b', text: 'had / started' },
      { id: 'c', text: 'was / starting' },
      { id: 'd', text: 'have / started' },
    ],
    correctId: 'b',
  },
  {
    id: 'b2-v1',
    level: 'B2',
    skill: 'vocabulary',
    prompt: 'The new policy had a significant ___ on small businesses.',
    options: [
      { id: 'a', text: 'affect' },
      { id: 'b', text: 'effect' },
      { id: 'c', text: 'effort' },
      { id: 'd', text: 'event' },
    ],
    correctId: 'b',
  },
  {
    id: 'b2-g2',
    level: 'B2',
    skill: 'grammar',
    prompt: 'I’d rather you ___ smoke in the house.',
    options: [
      { id: 'a', text: 'don’t' },
      { id: 'b', text: 'didn’t' },
      { id: 'c', text: 'won’t' },
      { id: 'd', text: 'not' },
    ],
    correctId: 'b',
  },
  {
    id: 'b2-r1',
    level: 'B2',
    skill: 'reading',
    passage:
      'Remote work has blurred the boundary between professional and private life. While many employees value the flexibility, others struggle to switch off, finding that work quietly expands to fill the hours once reserved for rest.',
    prompt: 'What downside of remote work does the text highlight?',
    options: [
      { id: 'a', text: 'It is less flexible' },
      { id: 'b', text: 'It is harder to disconnect from work' },
      { id: 'c', text: 'It reduces productivity' },
      { id: 'd', text: 'It requires more travel' },
    ],
    correctId: 'b',
  },

  /* ───────────────────────────── C1 ───────────────────────────── */
  {
    id: 'c1-g1',
    level: 'C1',
    skill: 'grammar',
    prompt: 'Not only ___ the deadline, but he also exceeded every target.',
    options: [
      { id: 'a', text: 'he met' },
      { id: 'b', text: 'did he meet' },
      { id: 'c', text: 'he did meet' },
      { id: 'd', text: 'met he' },
    ],
    correctId: 'b',
  },
  {
    id: 'c1-v1',
    level: 'C1',
    skill: 'vocabulary',
    prompt: 'Her argument was so ___ that even her critics were persuaded.',
    options: [
      { id: 'a', text: 'cogent' },
      { id: 'b', text: 'mundane' },
      { id: 'c', text: 'tedious' },
      { id: 'd', text: 'reluctant' },
    ],
    correctId: 'a',
  },
  {
    id: 'c1-g2',
    level: 'C1',
    skill: 'grammar',
    prompt: 'Had I known about the traffic, I ___ earlier.',
    options: [
      { id: 'a', text: 'would leave' },
      { id: 'b', text: 'will have left' },
      { id: 'c', text: 'would have left' },
      { id: 'd', text: 'had left' },
    ],
    correctId: 'c',
  },
  {
    id: 'c1-r1',
    level: 'C1',
    skill: 'reading',
    passage:
      'The committee’s report, while ostensibly even-handed, betrays a marked preference for the status quo, couching its reluctance to reform in the cautious language of "further consultation".',
    prompt: 'What is the writer suggesting about the report?',
    options: [
      { id: 'a', text: 'It is genuinely neutral' },
      { id: 'b', text: 'It secretly favours keeping things as they are' },
      { id: 'c', text: 'It strongly demands radical reform' },
      { id: 'd', text: 'It was written too quickly' },
    ],
    correctId: 'b',
  },

  /* ───────────────────────────── C2 ───────────────────────────── */
  {
    id: 'c2-v1',
    level: 'C2',
    skill: 'vocabulary',
    prompt: 'The minister’s remarks were widely seen as ___ — calculated to wound under a veneer of politeness.',
    options: [
      { id: 'a', text: 'insipid' },
      { id: 'b', text: 'barbed' },
      { id: 'c', text: 'candid' },
      { id: 'd', text: 'verbose' },
    ],
    correctId: 'b',
  },
  {
    id: 'c2-g1',
    level: 'C2',
    skill: 'grammar',
    prompt: 'Seldom ___ such a comprehensive account of the period been attempted.',
    options: [
      { id: 'a', text: 'has' },
      { id: 'b', text: 'have' },
      { id: 'c', text: 'had it' },
      { id: 'd', text: 'it has' },
    ],
    correctId: 'a',
  },
  {
    id: 'c2-r1',
    level: 'C2',
    skill: 'reading',
    passage:
      'To dismiss the novel as mere escapism is to overlook the quiet subversion at its core: beneath the comforting cadences of romance, it interrogates the very institutions it appears to celebrate.',
    prompt: 'The critic argues that the novel ___.',
    options: [
      { id: 'a', text: 'is nothing more than light entertainment' },
      { id: 'b', text: 'openly attacks romance as a genre' },
      { id: 'c', text: 'quietly challenges the institutions it seems to praise' },
      { id: 'd', text: 'fails to engage with serious themes' },
    ],
    correctId: 'c',
  },
  {
    id: 'c2-v2',
    level: 'C2',
    skill: 'vocabulary',
    prompt: 'His ___ for detail made him an exacting but respected editor.',
    options: [
      { id: 'a', text: 'indifference' },
      { id: 'b', text: 'punctiliousness' },
      { id: 'c', text: 'negligence' },
      { id: 'd', text: 'ambivalence' },
    ],
    correctId: 'b',
  },
]
