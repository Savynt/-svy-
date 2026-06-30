'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock,
  ListChecks,
  Headphones,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CircleDashed,
  ChevronLeft,
  Award,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  QuestionRenderer,
  type AnswerValue,
  type RunnerQuestion,
} from '@/components/test/questions/QuestionRenderer'
import type { QuestionType } from '@/types/task'

/* --------------------------------- types ---------------------------------- */

export interface RunnerGroup {
  id: string
  order: number
  type: QuestionType
  instruction: string
  data: Record<string, unknown> | null
  questions: RunnerQuestion[]
}

export interface RunnerTask {
  id: string
  slug: string
  title: string
  track: 'IELTS' | 'SAT' | 'GENERAL_ENGLISH' | 'CEFR' | 'MULTILEVEL'
  skill: 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING' | 'MATH'
  type: 'PRACTICE' | 'MOCK' | 'FULL' | 'PLACEMENT'
  cefrLevel: string | null
  durationMin: number
  instructions: string | null
  passageHtml: string | null
  audioUrl: string | null
  transcript: string | null
  groups: RunnerGroup[]
}

interface QuestionResult {
  questionId: string
  isCorrect: boolean | null
  pointsAwarded: number
  points: number
  correctAnswer: string | string[] | null
  explanation: string | null
  needsGrading: boolean
}

interface AttemptResult {
  attemptId: string
  status: 'SUBMITTED' | 'GRADED'
  score: number
  totalPoints: number
  correctCount: number
  gradedCount: number
  percent: number
  bandEstimate: number | null
  needsGradingCount: number
  results: QuestionResult[]
}

/* ------------------------------- utilities -------------------------------- */

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

const SKILL_ICON: Record<RunnerTask['skill'], typeof BookOpen> = {
  LISTENING: Headphones,
  READING: BookOpen,
  SPEAKING: ListChecks,
  WRITING: ListChecks,
  MATH: ListChecks,
}

function answerToText(answer: string | string[] | null): string {
  if (answer == null) return '—'
  if (Array.isArray(answer)) return answer.join(', ')
  // Friendly verdict labels.
  const map: Record<string, string> = {
    TRUE: 'True',
    FALSE: 'False',
    YES: 'Yes',
    NO: 'No',
    NOT_GIVEN: 'Not Given',
  }
  return map[answer] ?? answer
}

/* -------------------------------- component -------------------------------- */

export function TestRunner({ task }: { task: RunnerTask }) {
  const flatQuestions = useMemo(() => task.groups.flatMap((g) => g.questions), [task.groups])
  const totalQuestions = flatQuestions.length

  // Map questionId -> display number.
  // Uses data.numbered if the question carries an explicit exam number (e.g. 14–26
  // for IELTS Passage 2), otherwise falls back to sequential 1-based index.
  const numberById = useMemo(() => {
    const m = new Map<string, number>()
    flatQuestions.forEach((q, i) => {
      const explicit = q.data && typeof q.data.numbered === 'number' ? q.data.numbered : null
      m.set(q.id, explicit ?? i + 1)
    })
    return m
  }, [flatQuestions])

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const durationSec = task.durationMin * 60
  const [remaining, setRemaining] = useState(durationSec)
  // Wall-clock anchors, set on mount in an effect (no impure call during render).
  const startedAtRef = useRef<number | null>(null)
  const deadlineRef = useRef<number | null>(null)
  const submitted = result !== null

  const answeredCount = useMemo(() => {
    return flatQuestions.reduce((acc, q) => {
      const v = answers[q.id]
      if (v == null) return acc
      if (Array.isArray(v)) return acc + (v.some((x) => x.trim().length > 0) ? 1 : 0)
      return acc + (v.trim().length > 0 ? 1 : 0)
    }, 0)
  }, [answers, flatQuestions])

  const setAnswer = useCallback((questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (submitted || submitting) return
    setConfirmOpen(false)
    setSubmitting(true)
    setError(null)

    const startedAt = startedAtRef.current ?? Date.now()
    const timeSpentSec = Math.round((Date.now() - startedAt) / 1000)
    const payload = {
      taskId: task.id,
      timeSpentSec,
      answers: flatQuestions
        .map((q) => ({ questionId: q.id, response: answers[q.id] }))
        .filter((a): a is { questionId: string; response: AnswerValue } => a.response != null),
    }

    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `Submission failed (${res.status}).`)
      }
      const data = (await res.json()) as AttemptResult
      setResult(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong submitting your test.')
    } finally {
      setSubmitting(false)
    }
  }, [answers, flatQuestions, submitted, submitting, task.id])

  // Anchor the start time + deadline once, on mount (impure call lives in effect).
  useEffect(() => {
    const now = Date.now()
    startedAtRef.current = now
    deadlineRef.current = now + durationSec * 1000
    // durationSec is derived from a stable prop; intentionally mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Countdown timer — ticks from the wall-clock deadline, auto-submits at zero.
  useEffect(() => {
    if (submitted) return
    const tick = () => {
      const deadline = deadlineRef.current
      if (deadline == null) return
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        window.clearInterval(id)
        void handleSubmit()
      }
    }
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [submitted, handleSubmit])

  const resultById = useMemo(() => {
    const m = new Map<string, QuestionResult>()
    result?.results.forEach((r) => m.set(r.questionId, r))
    return m
  }, [result])

  const SkillIcon = SKILL_ICON[task.skill]
  const lowTime = !submitted && remaining <= 60
  const hasPassage = Boolean(task.passageHtml)
  const hasAudio = Boolean(task.audioUrl)
  const hasDesmos = task.track === 'SAT' && task.skill === 'MATH'
  const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0

  return (
    <div className="min-h-screen bg-sky-50 pb-28">
      {/* Sticky exam header with timer */}
      <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur">
        <div className="container-app flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
          <Button href="/practice" variant="ghost" size="sm" className="hidden sm:inline-flex">
            <ChevronLeft className="h-4 w-4" /> Exit
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <SkillIcon className="h-4 w-4 shrink-0 text-navy-500" aria-hidden />
              <h1 className="truncate font-display text-sm font-bold text-navy-800 sm:text-base">
                {task.title}
              </h1>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <ProgressBar value={progressPct} className="max-w-[180px]" />
              <span className="text-xs font-medium text-navy-400">
                {answeredCount}/{totalQuestions}
              </span>
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums',
              submitted
                ? 'bg-emerald-50 text-emerald-700'
                : lowTime
                  ? 'animate-pulse bg-rose-50 text-rose-600'
                  : 'bg-navy-50 text-navy-700',
            )}
            role="timer"
            aria-live={lowTime ? 'assertive' : 'off'}
          >
            <Clock className="h-4 w-4" aria-hidden />
            {submitted ? 'Submitted' : formatClock(remaining)}
          </div>
        </div>
      </header>

      <div className="container-app pt-6">
        {/* Result banner */}
        {result && <ResultBanner result={result} track={task.track} />}

        {/* Intro / instructions (pre-submit only) */}
        {!submitted && (
          <Card className="mb-6">
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="navy">{task.track}</Badge>
                <Badge tone="sky">{task.skill[0] + task.skill.slice(1).toLowerCase()}</Badge>
                {task.cefrLevel && <Badge tone="gray">{task.cefrLevel}</Badge>}
                <span className="text-xs text-navy-400">
                  {totalQuestions} question{totalQuestions === 1 ? '' : 's'} · {task.durationMin} min
                </span>
              </div>
              {task.instructions && (
                <p className="max-w-xl text-sm text-navy-500">{task.instructions}</p>
              )}
            </CardBody>
          </Card>
        )}

        {hasDesmos && (
          <Card className="mb-6">
            <CardBody>
              <p className="mb-2 text-xs font-semibold text-navy-600">Desmos Graphing Calculator</p>
              <iframe
                src="https://www.desmos.com/calculator"
                className="h-72 w-full rounded-lg border border-navy-200"
                title="Desmos Graphing Calculator"
              />
            </CardBody>
          </Card>
        )}

        <div
          className={cn(
            'grid gap-6',
            hasPassage ? 'lg:grid-cols-2' : 'lg:grid-cols-1',
          )}
        >
          {/* Passage / audio column */}
          {(hasPassage || hasAudio) && (
            <div className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              {hasAudio && (
                <Card className="mb-4">
                  <CardBody>
                    <div className="mb-3 flex items-center gap-2">
                      <Headphones className="h-4 w-4 text-navy-500" aria-hidden />
                      <h2 className="font-display text-sm font-bold text-navy-800">Audio</h2>
                    </div>
                    <audio controls preload="none" src={task.audioUrl ?? undefined} className="w-full">
                      Your browser does not support audio playback.
                    </audio>
                    {task.transcript && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setShowTranscript((s) => !s)}
                          className="text-xs font-semibold text-navy-500 underline-offset-2 hover:text-navy-700 hover:underline"
                        >
                          {showTranscript ? 'Hide transcript' : 'Show transcript'}
                        </button>
                        {showTranscript && (
                          <p className="mt-2 whitespace-pre-line rounded-xl bg-sky-50 p-3 text-sm leading-relaxed text-navy-600">
                            {task.transcript}
                          </p>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {hasPassage && (
                <Card>
                  <CardBody>
                    <div className="mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-navy-500" aria-hidden />
                      <h2 className="font-display text-sm font-bold text-navy-800">Passage</h2>
                    </div>
                    <div
                      className="prose-passage space-y-3 text-sm leading-relaxed text-navy-700 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-navy-800 [&_p]:mb-3 [&_strong]:text-navy-800"
                      // Passage HTML is authored/moderated content from the DB.
                      dangerouslySetInnerHTML={{ __html: task.passageHtml ?? '' }}
                    />
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* Questions column */}
          <div className="space-y-6">
            {task.groups.map((group) => (
              <Card key={group.id}>
                <CardBody className="space-y-5">
                  <div className="border-b border-navy-50 pb-3">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-navy-400" aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                        {questionRange(group, numberById)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-navy-700">{group.instruction}</p>
                    <GroupContext data={group.data} type={group.type} />
                  </div>

                  {/* Theory/explanation block for General English */}
                  {group.data && typeof (group.data as Record<string, unknown>).explanation === 'string' && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-navy-700">
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-600">Theory</p>
                      <p className="whitespace-pre-line">{(group.data as Record<string, unknown>).explanation as string}</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {group.questions.map((q) => {
                      const r = submitted ? resultById.get(q.id) : undefined
                      return (
                        <div key={q.id}>
                          <QuestionRenderer
                            question={q}
                            value={answers[q.id]}
                            onChange={(v) => setAnswer(q.id, v)}
                            displayNumber={numberById.get(q.id) ?? q.order}
                            locked={submitted}
                            isCorrect={r ? r.isCorrect : undefined}
                          />
                          {r && <ResultFeedback result={r} userAnswer={answers[q.id]} />}
                        </div>
                      )
                    })}
                  </div>
                </CardBody>
              </Card>
            ))}

            {totalQuestions === 0 && (
              <Card>
                <CardBody className="flex items-center gap-3 text-sm text-navy-500">
                  <AlertTriangle className="h-5 w-5 text-accent-500" aria-hidden />
                  This test has no questions yet. Please check back soon.
                </CardBody>
              </Card>
            )}

            {/* Post-submit actions */}
            {submitted && (
              <div className="flex flex-wrap gap-3">
                <Button href="/dashboard" variant="primary">
                  <Award className="h-4 w-4" /> View my progress
                </Button>
                <Button href="/practice" variant="secondary">
                  Back to practice
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky submit bar (pre-submit) */}
      {!submitted && totalQuestions > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-100 bg-white/95 backdrop-blur">
          <div className="container-app flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              {error ? (
                <p className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
                  <XCircle className="h-4 w-4 shrink-0" /> {error}
                </p>
              ) : (
                <p className="truncate text-sm text-navy-500">
                  <span className="font-semibold text-navy-700">{answeredCount}</span> of{' '}
                  {totalQuestions} answered
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="accent"
              size="lg"
              onClick={() => setConfirmOpen(true)}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit test'}
            </Button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmOpen && !submitted && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <Card className="w-full max-w-md">
            <CardBody className="space-y-4">
              <h3 id="confirm-title" className="font-display text-lg font-bold text-navy-800">
                Submit your test?
              </h3>
              <p className="text-sm text-navy-500">
                You’ve answered{' '}
                <span className="font-semibold text-navy-700">
                  {answeredCount} of {totalQuestions}
                </span>{' '}
                questions. You can’t change your answers after submitting.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
                  Keep working
                </Button>
                <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Yes, submit'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ sub-components ----------------------------- */

function questionRange(group: RunnerGroup, numberById: Map<string, number>): string {
  const nums = group.questions.map((q) => numberById.get(q.id) ?? q.order).filter((n) => n > 0)
  if (nums.length === 0) return 'Questions'
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  return min === max ? `Question ${min}` : `Questions ${min}–${max}`
}

/** Renders a shared option/heading bank that belongs to a group. */
function GroupContext({
  data,
  type,
}: {
  data: Record<string, unknown> | null
  type: QuestionType
}) {
  if (!data) return null
  const bankKey =
    type === 'MATCHING_HEADINGS' ? 'headings' : type === 'MATCHING' ? 'options' : null
  if (!bankKey) return null
  const bank = data[bankKey]
  if (!Array.isArray(bank) || bank.length === 0) return null

  const items = bank.map((b, i) => {
    if (typeof b === 'string') return { key: String.fromCharCode(65 + i), text: b }
    if (b && typeof b === 'object') {
      const rec = b as Record<string, unknown>
      return {
        key: typeof rec.key === 'string' ? rec.key : String.fromCharCode(65 + i),
        text: typeof rec.text === 'string' ? rec.text : '',
      }
    }
    return { key: String.fromCharCode(65 + i), text: '' }
  })

  return (
    <div className="mt-3 rounded-xl border border-navy-100 bg-sky-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
        {type === 'MATCHING_HEADINGS' ? 'List of headings' : 'Options'}
      </p>
      <ul className="space-y-1 text-sm text-navy-700">
        {items.map((it) => (
          <li key={it.key} className="flex gap-2">
            <span className="font-semibold text-navy-500">{it.key}</span>
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResultBanner({
  result,
  track,
}: {
  result: AttemptResult
  track: RunnerTask['track']
}) {
  const showBand = track === 'IELTS' && result.bandEstimate != null
  return (
    <Card className="mb-6 overflow-hidden border-navy-200 bg-gradient-to-br from-navy-800 via-navy-700 to-navy-600">
      <CardBody className="text-white">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-400">
              Test complete
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">
              {result.gradedCount > 0
                ? `${result.score} / ${result.totalPoints} correct`
                : 'Answers submitted'}
            </h2>
            <p className="mt-1 text-sm text-sky-100">
              {result.gradedCount > 0 && (
                <>
                  {result.percent}% on auto-graded questions
                  {result.needsGradingCount > 0 && ' · '}
                </>
              )}
              {result.needsGradingCount > 0 &&
                `${result.needsGradingCount} response${
                  result.needsGradingCount === 1 ? '' : 's'
                } sent for coach review`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {result.gradedCount > 0 && (
              <div className="text-center">
                <div className="font-display text-3xl font-extrabold text-white">
                  {result.percent}%
                </div>
                <div className="text-[11px] uppercase tracking-wide text-sky-200">Score</div>
              </div>
            )}
            {showBand && (
              <div className="rounded-2xl bg-accent-500 px-4 py-3 text-center text-navy-900">
                <div className="font-display text-3xl font-extrabold">
                  {result.bandEstimate?.toFixed(1)}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wide">Est. band</div>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function ResultFeedback({
  result,
  userAnswer,
}: {
  result: QuestionResult
  userAnswer: AnswerValue | undefined
}) {
  const userText =
    userAnswer == null
      ? '—'
      : Array.isArray(userAnswer)
        ? userAnswer.filter(Boolean).map((a) => answerToText(a)).join(', ') || '—'
        : answerToText(userAnswer) || '—'

  if (result.needsGrading) {
    return (
      <div className="ml-10 mt-3 flex items-start gap-2 rounded-xl border border-accent-400/40 bg-accent-400/10 px-3.5 py-2.5 text-sm">
        <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
        <span className="text-navy-600">
          Saved for grading. A coach or AI examiner will review your response and add a band score.
        </span>
      </div>
    )
  }

  const correct = result.isCorrect === true
  return (
    <div
      className={cn(
        'ml-10 mt-3 space-y-1.5 rounded-xl border px-3.5 py-2.5 text-sm',
        correct ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50',
      )}
    >
      <div className="flex items-center gap-2 font-semibold">
        {correct ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            <span className="text-emerald-700">Correct</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-rose-500" aria-hidden />
            <span className="text-rose-700">Incorrect</span>
          </>
        )}
      </div>
      <p className="text-navy-600">
        <span className="font-medium text-navy-500">Your answer:</span> {userText}
      </p>
      {!correct && (
        <p className="text-navy-600">
          <span className="font-medium text-navy-500">Correct answer:</span>{' '}
          <span className="font-semibold text-emerald-700">
            {answerToText(result.correctAnswer)}
          </span>
        </p>
      )}
      {result.explanation && (
        <p className="text-navy-500">
          <span className="font-medium">Why:</span> {result.explanation}
        </p>
      )}
    </div>
  )
}

export default TestRunner
