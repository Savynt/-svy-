/**
 * Offline audit: build a task with the manual builder mapper, then grade learner
 * answers through the real grader to prove the answer keys round-trip. No DB.
 * Run: npx tsx scripts/audit-builder.ts
 */
import { builderToNormalized, type BuilderTask } from '@/types/builder'
import { gradeAnswer } from '@/lib/grade'

const draft: BuilderTask = {
  title: 'Audit Reading Set',
  track: 'IELTS',
  skill: 'READING',
  type: 'PRACTICE',
  durationMin: 20,
  topics: ['audit'],
  publish: false,
  groups: [
    {
      type: 'MULTIPLE_CHOICE',
      instruction: 'Questions 1: choose the correct letter.',
      questions: [
        {
          prompt: 'Capital of France?',
          options: [
            { text: 'Berlin', correct: false },
            { text: 'Paris', correct: true },
            { text: 'Rome', correct: false },
          ],
          answerText: '',
          points: 1,
        },
      ],
    },
    {
      type: 'MULTI_SELECT',
      instruction: 'Questions 2: choose TWO letters.',
      questions: [
        {
          prompt: 'Which are primary colours?',
          options: [
            { text: 'Red', correct: true },
            { text: 'Green', correct: false },
            { text: 'Blue', correct: true },
          ],
          answerText: '',
          points: 2,
        },
      ],
    },
    {
      type: 'TRUE_FALSE_NOTGIVEN',
      instruction: 'Questions 3.',
      questions: [
        { prompt: 'The sky is green.', options: [], answerText: 'FALSE', points: 1 },
      ],
    },
    {
      type: 'SHORT_ANSWER',
      instruction: 'Questions 4: one word.',
      questions: [
        { prompt: 'British spelling of color.', options: [], answerText: 'colour/color', points: 1 },
      ],
    },
    {
      type: 'ESSAY',
      instruction: 'Write 250 words.',
      questions: [{ prompt: 'Discuss.', options: [], answerText: '', points: 9 }],
    },
  ],
}

const task = builderToNormalized(draft)
const allQ = task.groups.flatMap((g) => g.questions)

interface Case {
  label: string
  qi: number
  response: string | string[]
  expect: boolean | null
}
const cases: Case[] = [
  { label: 'MCQ correct (B=Paris)', qi: 0, response: 'B', expect: true },
  { label: 'MCQ wrong (A)', qi: 0, response: 'A', expect: false },
  { label: 'MULTI_SELECT correct {A,C}', qi: 1, response: ['A', 'C'], expect: true },
  { label: 'MULTI_SELECT wrong {A,B}', qi: 1, response: ['A', 'B'], expect: false },
  { label: 'TFNG correct FALSE', qi: 2, response: 'FALSE', expect: true },
  { label: 'SHORT_ANSWER alt "color"', qi: 3, response: 'color', expect: true },
  { label: 'SHORT_ANSWER wrong "red"', qi: 3, response: 'red', expect: false },
  { label: 'ESSAY → subjective (null)', qi: 4, response: 'whatever', expect: null },
]

let pass = 0
for (const c of cases) {
  const q = allQ[c.qi]!
  const got = gradeAnswer(q.type, c.response, q.answer)
  const ok = got === c.expect
  if (ok) pass++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.label}  → got=${got} expect=${c.expect}`)
}
console.log(`\nanswer keys: ${allQ.map((q) => JSON.stringify(q.answer)).join('  ')}`)
console.log(`${pass}/${cases.length} passed`)
process.exit(pass === cases.length ? 0 : 1)
