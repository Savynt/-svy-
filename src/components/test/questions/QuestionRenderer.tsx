'use client'

import { useId } from 'react'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import type { QuestionType } from '@/types/task'

/**
 * Renders a single question's input(s) based on its QuestionType.
 *
 * The learner's answer is always reported up as `string | string[]`:
 * - single value for choice / single-blank / matching-slot questions
 * - string[] for MULTI_SELECT and multi-blank completion questions
 *
 * All free-text inputs carry T9 / autocorrect protection.
 */

/** One labelled option for choice / matching bank questions. */
export interface RunnerOption {
  key: string
  text: string
}

/** Client-safe question shape (no answer key). */
export interface RunnerQuestion {
  id: string
  order: number
  type: QuestionType
  prompt: string
  data: Record<string, unknown> | null
  points: number
  /** Number of expected blanks/slots (drives multi-input rendering). */
  blankCount: number
}

export type AnswerValue = string | string[]

interface QuestionRendererProps {
  question: RunnerQuestion
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
  /** Sequential number shown to the learner (1-based across the test). */
  displayNumber: number
  /** When true the test is submitted — inputs become read-only. */
  locked: boolean
  /** Post-submit correctness for styling (null = not yet / not graded). */
  isCorrect?: boolean | null
}

/* ------------------------------- data helpers ------------------------------ */

function readOptions(data: Record<string, unknown> | null): RunnerOption[] {
  if (!data) return []
  const raw = data.options
  if (!Array.isArray(raw)) return []
  return raw
    .map((o, i): RunnerOption | null => {
      if (typeof o === 'string') return { key: String.fromCharCode(65 + i), text: o }
      if (o && typeof o === 'object') {
        const rec = o as Record<string, unknown>
        const key = typeof rec.key === 'string' ? rec.key : String.fromCharCode(65 + i)
        const text = typeof rec.text === 'string' ? rec.text : typeof rec.label === 'string' ? rec.label : ''
        return { key, text }
      }
      return null
    })
    .filter((o): o is RunnerOption => o !== null)
}

/** Option bank shared via a group (headings, matching targets). */
function readBank(data: Record<string, unknown> | null, keys: string[]): RunnerOption[] {
  if (!data) return []
  for (const k of keys) {
    const raw = data[k]
    if (Array.isArray(raw)) {
      return raw
        .map((o, i): RunnerOption | null => {
          if (typeof o === 'string') {
            return { key: data.numbered ? String(i + 1) : romanOrLetter(i), text: o }
          }
          if (o && typeof o === 'object') {
            const rec = o as Record<string, unknown>
            const key = typeof rec.key === 'string' ? rec.key : romanOrLetter(i)
            const text = typeof rec.text === 'string' ? rec.text : ''
            return { key, text }
          }
          return null
        })
        .filter((o): o is RunnerOption => o !== null)
    }
  }
  return []
}

function romanOrLetter(i: number): string {
  return String.fromCharCode(65 + i)
}

/** Word/character limit hint, e.g. "NO MORE THAN TWO WORDS". */
function readWordLimit(data: Record<string, unknown> | null): string | null {
  if (!data) return null
  const v = data.wordLimit ?? data.limit
  return typeof v === 'string' ? v : null
}

/* ----------------------------- shared UI atoms ----------------------------- */

const textInputBase =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-navy-900 shadow-sm outline-none transition focus:border-navy-400 focus:ring-2 focus:ring-navy-200 disabled:cursor-not-allowed disabled:bg-navy-50/60 placeholder:text-navy-300'

function stateBorder(locked: boolean, isCorrect?: boolean | null): string {
  if (!locked || isCorrect == null) return 'border-navy-200'
  return isCorrect ? 'border-emerald-400 bg-emerald-50/40' : 'border-rose-300 bg-rose-50/40'
}

/** A single T9-protected gap-fill text box. */
function GapInput({
  value,
  onChange,
  locked,
  isCorrect,
  ariaLabel,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  locked: boolean
  isCorrect?: boolean | null
  ariaLabel: string
  placeholder?: string
}) {
  return (
    <input
      type="text"
      inputMode="text"
      autoCorrect="off"
      autoCapitalize="off"
      autoComplete="off"
      spellCheck={false}
      aria-label={ariaLabel}
      placeholder={placeholder ?? 'Type your answer'}
      disabled={locked}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(textInputBase, stateBorder(locked, isCorrect))}
    />
  )
}

/** A selectable card/row used for choice + true-false rows. */
function ChoiceRow({
  selected,
  onSelect,
  locked,
  multi,
  badge,
  children,
}: {
  selected: boolean
  onSelect: () => void
  locked: boolean
  multi: boolean
  badge?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300',
        selected
          ? 'border-navy-500 bg-navy-50 text-navy-900 shadow-sm'
          : 'border-navy-200 bg-white text-navy-700 hover:border-navy-300 hover:bg-sky-50',
        locked && 'cursor-not-allowed opacity-90',
      )}
    >
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center border text-xs font-bold',
          multi ? 'rounded-md' : 'rounded-full',
          selected ? 'border-navy-600 bg-navy-600 text-white' : 'border-navy-300 text-navy-400',
        )}
      >
        {badge ?? (selected ? '✓' : '')}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  )
}

/* ------------------------------- renderers --------------------------------- */

function ChoiceQuestion({
  options,
  value,
  onChange,
  locked,
  multi,
}: {
  options: RunnerOption[]
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
  locked: boolean
  multi: boolean
}) {
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : [])

  const toggle = (key: string) => {
    if (locked) return
    if (multi) {
      const next = new Set(selected)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      onChange([...next])
    } else {
      onChange(key)
    }
  }

  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <ChoiceRow
          key={o.key}
          selected={selected.has(o.key)}
          onSelect={() => toggle(o.key)}
          locked={locked}
          multi={multi}
          badge={selected.has(o.key) ? undefined : o.key}
        >
          <span className="font-medium text-navy-500">{o.key}.</span> {o.text}
        </ChoiceRow>
      ))}
    </div>
  )
}

function VerdictQuestion({
  options,
  value,
  onChange,
  locked,
}: {
  options: RunnerOption[]
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
  locked: boolean
}) {
  const current = typeof value === 'string' ? value : ''
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = current === o.key
        return (
          <button
            key={o.key}
            type="button"
            disabled={locked}
            onClick={() => !locked && onChange(o.key)}
            aria-pressed={active}
            className={cn(
              'rounded-xl border px-4 py-2 text-sm font-semibold transition',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300',
              active
                ? 'border-navy-600 bg-navy-700 text-white shadow-sm'
                : 'border-navy-200 bg-white text-navy-600 hover:border-navy-300 hover:bg-sky-50',
              locked && 'cursor-not-allowed opacity-90',
            )}
          >
            {o.text}
          </button>
        )
      })}
    </div>
  )
}

function CompletionQuestion({
  question,
  value,
  onChange,
  locked,
  isCorrect,
  wordLimit,
}: {
  question: RunnerQuestion
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
  locked: boolean
  isCorrect?: boolean | null
  wordLimit: string | null
}) {
  const count = Math.max(1, question.blankCount)

  if (count === 1) {
    const single = Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
    return (
      <div className="max-w-sm">
        <GapInput
          value={single}
          onChange={(v) => onChange(v)}
          locked={locked}
          isCorrect={isCorrect}
          ariaLabel={`Answer for question ${question.order}`}
          placeholder={wordLimit ? wordLimit : 'Type your answer'}
        />
      </div>
    )
  }

  const values = Array.isArray(value) ? value : value ? [value] : []
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <label key={i} className="flex items-center gap-2">
          <span className="w-6 text-right text-xs font-semibold text-navy-400">{i + 1}</span>
          <GapInput
            value={values[i] ?? ''}
            onChange={(v) => {
              const next = [...values]
              while (next.length < count) next.push('')
              next[i] = v
              onChange(next)
            }}
            locked={locked}
            isCorrect={isCorrect}
            ariaLabel={`Blank ${i + 1} for question ${question.order}`}
          />
        </label>
      ))}
    </div>
  )
}

function MatchingQuestion({
  question,
  bank,
  value,
  onChange,
  locked,
  isCorrect,
}: {
  question: RunnerQuestion
  bank: RunnerOption[]
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
  locked: boolean
  isCorrect?: boolean | null
}) {
  const selectId = useId()
  const current = typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? '') : ''
  return (
    <select
      id={selectId}
      disabled={locked}
      value={current}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Match for question ${question.order}`}
      className={cn(
        'w-full max-w-md rounded-xl border bg-white px-3.5 py-2.5 text-sm text-navy-900 shadow-sm outline-none transition focus:border-navy-400 focus:ring-2 focus:ring-navy-200 disabled:cursor-not-allowed disabled:bg-navy-50/60',
        stateBorder(locked, isCorrect),
      )}
    >
      <option value="">Select…</option>
      {bank.map((o) => (
        <option key={o.key} value={o.key}>
          {o.key}. {o.text}
        </option>
      ))}
    </select>
  )
}

function FreeResponseQuestion({
  question,
  value,
  onChange,
  locked,
  speaking,
}: {
  question: RunnerQuestion
  value: AnswerValue | undefined
  onChange: (v: AnswerValue) => void
  locked: boolean
  speaking: boolean
}) {
  const text = typeof value === 'string' ? value : Array.isArray(value) ? value.join(' ') : ''
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge tone="accent">Graded later</Badge>
        <span className="text-xs text-navy-400">
          {speaking ? 'Speaking — reviewed by a coach / AI' : 'Writing — reviewed by a coach / AI'}
        </span>
      </div>
      {speaking && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-navy-200 bg-sky-50/60 px-4 py-3 text-sm text-navy-500">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500"
            aria-hidden
          >
            ●
          </span>
          <span>
            Audio recording opens here on test day. For now, jot speaking notes below — they’re saved
            with your attempt for coach review.
          </span>
        </div>
      )}
      <textarea
        rows={speaking ? 4 : 8}
        disabled={locked}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        autoCorrect="off"
        autoCapitalize="sentences"
        autoComplete="off"
        spellCheck={false}
        aria-label={`Response for question ${question.order}`}
        placeholder={
          speaking ? 'Notes for your spoken answer…' : 'Write your response here…'
        }
        className={cn(
          'w-full resize-y rounded-xl border border-navy-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-navy-900 shadow-sm outline-none transition focus:border-navy-400 focus:ring-2 focus:ring-navy-200 disabled:cursor-not-allowed disabled:bg-navy-50/60 placeholder:text-navy-300',
        )}
      />
      <p className="text-right text-xs text-navy-400">{words} words</p>
    </div>
  )
}

/* ------------------------------- main switch ------------------------------- */

const VERDICT_TFNG: RunnerOption[] = [
  { key: 'TRUE', text: 'True' },
  { key: 'FALSE', text: 'False' },
  { key: 'NOT_GIVEN', text: 'Not Given' },
]
const VERDICT_YNNG: RunnerOption[] = [
  { key: 'YES', text: 'Yes' },
  { key: 'NO', text: 'No' },
  { key: 'NOT_GIVEN', text: 'Not Given' },
]

export function QuestionRenderer({
  question,
  value,
  onChange,
  displayNumber,
  locked,
  isCorrect,
}: QuestionRendererProps) {
  const { type, data } = question
  const wordLimit = readWordLimit(data)

  let control: React.ReactNode
  switch (type) {
    case 'TRUE_FALSE_NOTGIVEN':
      control = <VerdictQuestion options={VERDICT_TFNG} value={value} onChange={onChange} locked={locked} />
      break
    case 'YES_NO_NOTGIVEN':
      control = <VerdictQuestion options={VERDICT_YNNG} value={value} onChange={onChange} locked={locked} />
      break
    case 'MULTIPLE_CHOICE':
      control = (
        <ChoiceQuestion options={readOptions(data)} value={value} onChange={onChange} locked={locked} multi={false} />
      )
      break
    case 'MULTI_SELECT':
      control = (
        <ChoiceQuestion options={readOptions(data)} value={value} onChange={onChange} locked={locked} multi />
      )
      break
    case 'MATCHING':
      control = (
        <MatchingQuestion
          question={question}
          bank={readBank(data, ['options', 'matches', 'bank'])}
          value={value}
          onChange={onChange}
          locked={locked}
          isCorrect={isCorrect}
        />
      )
      break
    case 'MATCHING_HEADINGS':
      control = (
        <MatchingQuestion
          question={question}
          bank={readBank(data, ['headings', 'options', 'bank'])}
          value={value}
          onChange={onChange}
          locked={locked}
          isCorrect={isCorrect}
        />
      )
      break
    case 'SENTENCE_COMPLETION':
    case 'SUMMARY_COMPLETION':
    case 'NOTE_COMPLETION':
    case 'TABLE_COMPLETION':
    case 'SHORT_ANSWER':
    case 'LABELLING':
      control = (
        <CompletionQuestion
          question={question}
          value={value}
          onChange={onChange}
          locked={locked}
          isCorrect={isCorrect}
          wordLimit={wordLimit}
        />
      )
      break
    case 'ESSAY':
      control = (
        <FreeResponseQuestion question={question} value={value} onChange={onChange} locked={locked} speaking={false} />
      )
      break
    case 'SPEAKING_PROMPT':
      control = (
        <FreeResponseQuestion question={question} value={value} onChange={onChange} locked={locked} speaking />
      )
      break
    default: {
      // Exhaustiveness guard — TS errors here if a QuestionType is unhandled.
      const _never: never = type
      control = null
      void _never
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-700 text-xs font-bold text-white">
          {displayNumber}
        </span>
        <p className="text-sm font-medium leading-relaxed text-navy-800 sm:text-[0.95rem]">
          {question.prompt}
        </p>
      </div>
      <div className="pl-10">
        {wordLimit && (type.endsWith('COMPLETION') || type === 'SHORT_ANSWER' || type === 'LABELLING') && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-600">{wordLimit}</p>
        )}
        {control}
      </div>
    </div>
  )
}

export default QuestionRenderer
