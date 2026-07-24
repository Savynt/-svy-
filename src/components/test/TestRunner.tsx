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
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PassageReader } from '@/components/test/PassageReader'
import {
  QuestionRenderer,
  isSpeakingAnswer,
  readBank,
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
  skill: 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING' | 'MATH' | 'GRAMMAR'
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
  GRAMMAR: BookOpen,
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
  /** SAT Math: the calculator is cramped at its inline size — let students blow it up. */
  const [desmosFullscreen, setDesmosFullscreen] = useState(false)

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
      // Speaking: a recording counts as answered on its own — notes are optional.
      if (isSpeakingAnswer(v)) {
        return acc + (v.audioUrl || (v.notes ?? '').trim().length > 0 ? 1 : 0)
      }
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

  // Esc leaves the fullscreen calculator. Listener only exists while expanded so
  // it can never swallow Esc from anything else on the page.
  useEffect(() => {
    if (!desmosFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDesmosFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [desmosFullscreen])

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
        <div className="container-app max-w-[92rem] flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
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

      {/* Wider than the app default: a reading passage and its questions have to
          sit side by side without either turning into a narrow column. */}
      <div className="container-app max-w-[92rem] pt-6">
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
          // Wrapper + classes only — the iframe element itself is never moved or
          // re-created when toggling, so Desmos keeps whatever the student typed.
          <div className={cn(desmosFullscreen ? 'fixed inset-0 z-50 bg-navy-50 p-3 sm:p-4' : 'mb-6')}>
            <Card className={desmosFullscreen ? 'h-full' : undefined}>
              <CardBody>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-navy-600">Desmos Graphing Calculator</p>
                  <button
                    type="button"
                    onClick={() => setDesmosFullscreen((v) => !v)}
                    aria-pressed={desmosFullscreen}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-2.5 py-1 text-xs font-medium text-navy-600 transition hover:bg-navy-50 hover:text-navy-900"
                  >
                    {desmosFullscreen ? (
                      <>
                        <Minimize2 className="h-3.5 w-3.5" /> Exit fullscreen
                        <span className="ml-1 hidden text-navy-300 sm:inline">Esc</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
                      </>
                    )}
                  </button>
                </div>
                <iframe
                  src="https://www.desmos.com/calculator"
                  className={cn(
                    'w-full rounded-lg border border-navy-200',
                    desmosFullscreen ? 'h-[calc(100vh-7.5rem)]' : 'h-72',
                  )}
                  title="Desmos Graphing Calculator"
                />
              </CardBody>
            </Card>
          </div>
        )}

        <div
          className={cn(
            'grid gap-6',
            // The passage gets the larger share: it is read continuously, while
            // the answer column only holds short inputs.
            hasPassage ? 'lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : 'lg:grid-cols-1',
          )}
        >
          {/* Passage / audio column */}
          {(hasPassage || hasAudio) && (
            <div className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
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
                    <PassageReader
                      html={task.passageHtml ?? ''}
                      className="prose-passage space-y-3 text-[0.9375rem] leading-7 text-navy-700 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-navy-800 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-navy-800 [&_mark]:cursor-pointer [&_p]:mb-4 [&_strong]:text-navy-800"
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

                  {/* Grammar: example sentences */}
                  {group.data && Array.isArray((group.data as Record<string, unknown>).examples) && ((group.data as Record<string, unknown>).examples as string[]).length > 0 && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-navy-700">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-600">Examples</p>
                      <ul className="space-y-1">
                        {((group.data as Record<string, unknown>).examples as string[]).map((ex, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="shrink-0 font-semibold text-sky-500">{i + 1}.</span>
                            <span className="italic">{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Grammar: common errors */}
                  {group.data && Array.isArray((group.data as Record<string, unknown>).errors) && ((group.data as Record<string, unknown>).errors as {wrong:string;correct:string}[]).length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-navy-700">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-600">Common errors</p>
                      <ul className="space-y-1.5">
                        {((group.data as Record<string, unknown>).errors as {wrong:string;correct:string}[]).map((e, i) => (
                          <li key={i} className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 line-through">{e.wrong}</span>
                            <span className="text-navy-400">→</span>
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{e.correct}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-6">
                    {clozeTemplate(group) ? (
                      <ClozeGroup
                        group={group}
                        answers={answers}
                        setAnswer={setAnswer}
                        numberById={numberById}
                        submitted={submitted}
                        resultById={resultById}
                      />
                    ) : (
                      group.questions.map((q) => {
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
                      })
                    )}
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
          <div className="container-app max-w-[92rem] flex items-center justify-between gap-3 py-3">
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

/* ------------------------------ cloze summary ------------------------------ */

/** Placeholder tokens the parser leaves in a shared-paragraph prompt. */
const GAP_TOKEN = /_{3,}|\.\.\.|…/g

/**
 * A summary / notes group where every question is the *same* paragraph with a
 * different blank filled in should render as one cloze passage with inline
 * inputs — not as N cards each repeating the whole paragraph. This returns the
 * ordered pieces of that paragraph when the group fits the pattern, or null.
 *
 * Each question's prompt carries its own blank as "_____" and the others as
 * "…", so with every gap token flattened the prompts are identical — that
 * sameness is the signal, and the flattened text is the template to split.
 */
function clozeTemplate(group: RunnerGroup): string[] | null {
  const type = group.type
  const isCompletion =
    type === 'SUMMARY_COMPLETION' || type === 'NOTE_COMPLETION' || type === 'TABLE_COMPLETION'
  if (!isCompletion || group.questions.length < 2) return null

  // Collapse every gap token to one sentinel that never occurs in prose, so
  // prompts differing only in which blank is theirs become identical. Split on
  // the sentinel (not on spaces) to recover the paragraph around the gaps.
  const SENTINEL = '␟'
  const flat = group.questions.map((q) => q.prompt.replace(GAP_TOKEN, SENTINEL))
  if (!flat.every((f) => f === flat[0])) return null

  const segments = flat[0].split(SENTINEL)
  // One blank per question: N gaps split the paragraph into N+1 pieces.
  if (segments.length !== group.questions.length + 1) return null
  if (segments.join('').trim().length < 20) return null
  return segments
}

/** Renders a shared-paragraph completion group as one inline cloze. */
function ClozeGroup({
  group,
  answers,
  setAnswer,
  numberById,
  submitted,
  resultById,
}: {
  group: RunnerGroup
  answers: Record<string, AnswerValue>
  setAnswer: (id: string, v: AnswerValue) => void
  numberById: Map<string, number>
  submitted: boolean
  resultById: Map<string, QuestionResult>
}) {
  const segments = clozeTemplate(group)
  if (!segments) return null

  return (
    <div>
      <p className="text-[0.95rem] leading-8 text-navy-700">
        {segments.map((seg, i) => {
          const q = i > 0 ? group.questions[i - 1] : null
          return (
            <span key={i}>
              {seg}
              {q && (
                <ClozeInput
                  number={numberById.get(q.id) ?? q.order}
                  value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                  onChange={(v) => setAnswer(q.id, v)}
                  locked={submitted}
                  isCorrect={submitted ? (resultById.get(q.id)?.isCorrect ?? null) : null}
                />
              )}
            </span>
          )
        })}
      </p>

      {submitted && (
        <div className="mt-4 space-y-1.5">
          {group.questions.map((q) => {
            const r = resultById.get(q.id)
            if (!r || r.isCorrect) return null
            return (
              <p key={q.id} className="text-sm text-navy-600">
                <span className="font-semibold text-navy-500">
                  {numberById.get(q.id) ?? q.order}.
                </span>{' '}
                correct answer:{' '}
                <span className="font-semibold text-emerald-700">
                  {answerToText(r.correctAnswer)}
                </span>
              </p>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** One numbered blank inside a cloze paragraph. */
function ClozeInput({
  number,
  value,
  onChange,
  locked,
  isCorrect,
}: {
  number: number
  value: string
  onChange: (v: string) => void
  locked: boolean
  isCorrect: boolean | null
}) {
  const border =
    isCorrect == null
      ? 'border-navy-300 focus:border-navy-500 focus:ring-2 focus:ring-navy-200'
      : isCorrect
        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
        : 'border-rose-300 bg-rose-50 text-rose-700'
  return (
    <span className="mx-1 inline-flex items-baseline gap-1 align-baseline">
      <span className="text-xs font-bold text-navy-400">{number}</span>
      <input
        type="text"
        inputMode="text"
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
        aria-label={`Answer for gap ${number}`}
        disabled={locked}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-32 rounded-md border-b-2 border-x-0 border-t-0 bg-transparent px-1 py-0.5 text-center text-sm font-medium text-navy-900 outline-none transition disabled:cursor-not-allowed',
          border,
        )}
      />
    </span>
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

  // Same source of truth as the per-question dropdown (QuestionRenderer.readBank),
  // so the listed keys can never disagree with the options a learner picks from.
  const items = readBank(data, [bankKey], type === 'MATCHING_HEADINGS' ? 'roman' : 'letter')
  if (items.length === 0) return null

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
  // Speaking answers hold a recording (+ optional notes) rather than text.
  const speaking = isSpeakingAnswer(userAnswer) ? userAnswer : null
  const userText = (() => {
    if (userAnswer == null) return '—'
    if (isSpeakingAnswer(userAnswer)) {
      return userAnswer.notes?.trim() || (userAnswer.audioUrl ? 'Recording submitted' : '—')
    }
    if (Array.isArray(userAnswer)) {
      return userAnswer.filter(Boolean).map((a) => answerToText(a)).join(', ') || '—'
    }
    return answerToText(userAnswer) || '—'
  })()

  if (result.needsGrading) {
    return (
      <div className="ml-10 mt-3 space-y-2 rounded-xl border border-accent-400/40 bg-accent-400/10 px-3.5 py-2.5 text-sm">
        <div className="flex items-start gap-2">
          <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
          <span className="text-navy-600">
            Saved for grading. A coach or AI examiner will review your response and add a band score.
          </span>
        </div>
        {/* Let the student hear back exactly what the coach will hear. */}
        {speaking?.audioUrl && (
          <audio controls src={speaking.audioUrl} className="h-9 w-full max-w-sm" />
        )}
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
