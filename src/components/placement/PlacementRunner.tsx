'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Gauge,
  Trophy,
  BookOpen,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { PlacementQuestion, PlacementSkill } from '@/data/placement-questions'
import {
  START_LEVEL,
  nextLevel,
  selectNextQuestion,
  plannedQuestionCount,
  type AnsweredItem,
  type CefrLevel,
} from '@/lib/placement'

/* ------------------------------- API shapes -------------------------------- */

interface PlacementResultPayload {
  resultId: string
  cefrLevel: CefrLevel
  cefrLabel: string
  ieltsBand: number | null
  correctCount: number
  total: number
  guidance: { label: string; summary: string; focus: string[] }
  perLevel: Array<{ level: string; correct: number; total: number }>
}

interface ApiError {
  error?: string
}

/* --------------------------------- helpers --------------------------------- */

const SKILL_LABEL: Record<PlacementSkill, string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  reading: 'Reading',
}

const TOTAL = plannedQuestionCount()
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

/** Pick the very first question deterministically (B1, first unused). */
function firstQuestion(): PlacementQuestion | null {
  return selectNextQuestion(START_LEVEL, new Set<string>())
}

/* -------------------------------- component -------------------------------- */

type Phase = 'running' | 'submitting' | 'done'

export function PlacementRunner() {
  const [current, setCurrent] = useState<PlacementQuestion | null>(() => firstQuestion())
  const [servedIds, setServedIds] = useState<Set<string>>(() =>
    current ? new Set([current.id]) : new Set(),
  )
  const [level, setLevel] = useState<CefrLevel>(START_LEVEL)
  const [answers, setAnswers] = useState<AnsweredItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [phase, setPhase] = useState<Phase>('running')
  const [result, setResult] = useState<PlacementResultPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 1-based position of the question the learner is currently looking at.
  const questionNumber = answers.length + 1
  const progressPct = Math.round((answers.length / TOTAL) * 100)

  const submit = useCallback(async (finalAnswers: AnsweredItem[]) => {
    setPhase('submitting')
    setError(null)
    try {
      const res = await fetch('/api/placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: finalAnswers.map((a) => ({ questionId: a.questionId, correct: a.correct })),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiError | null
        throw new Error(body?.error ?? `Could not save your result (${res.status}).`)
      }
      const data = (await res.json()) as PlacementResultPayload
      setResult(data)
      setPhase('done')
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong saving your result.')
      // Stay on the last question so the learner can retry submitting.
      setPhase('running')
    }
  }, [])

  const handleNext = useCallback(() => {
    if (!current || selectedId == null || phase !== 'running') return

    const wasCorrect = selectedId === current.correctId
    const answered: AnsweredItem = {
      questionId: current.id,
      level: current.level,
      correct: wasCorrect,
    }
    const nextAnswers = [...answers, answered]
    setAnswers(nextAnswers)
    setSelectedId(null)

    // Adapt difficulty, then either serve the next question or finish.
    const desired = nextLevel(level, wasCorrect)
    setLevel(desired)

    const reachedTarget = nextAnswers.length >= TOTAL
    const nextQuestion = reachedTarget ? null : selectNextQuestion(desired, servedIds)

    if (!nextQuestion) {
      setCurrent(null)
      void submit(nextAnswers)
      return
    }

    setServedIds((prev) => {
      const updated = new Set(prev)
      updated.add(nextQuestion.id)
      return updated
    })
    setCurrent(nextQuestion)
  }, [answers, current, level, phase, selectedId, servedIds, submit])

  const restart = useCallback(() => {
    const first = firstQuestion()
    setCurrent(first)
    setServedIds(first ? new Set([first.id]) : new Set())
    setLevel(START_LEVEL)
    setAnswers([])
    setSelectedId(null)
    setResult(null)
    setError(null)
    setPhase('running')
  }, [])

  // Empty bank — defensive, the built-in bank is never empty.
  if (!current && phase === 'running' && answers.length === 0) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-accent-500" aria-hidden="true" />
          <p className="font-display text-lg font-bold text-navy-800">Test unavailable</p>
          <p className="max-w-sm text-sm text-navy-500">
            We couldn’t load the placement questions right now. Please refresh the page and try
            again.
          </p>
        </CardBody>
      </Card>
    )
  }

  if (phase === 'done' && result) {
    return <ResultScreen result={result} onRetake={restart} />
  }

  return (
    <Card className="overflow-hidden">
      {/* Progress header */}
      <div className="border-b border-navy-100 bg-sky-50/70 px-5 py-4 sm:px-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-navy-700">
            Question {Math.min(questionNumber, TOTAL)} of {TOTAL}
          </span>
          <Badge tone="gray">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" /> Level {level}
          </Badge>
        </div>
        <ProgressBar value={progressPct} />
      </div>

      <CardBody className="space-y-5">
        {current && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="sky">{SKILL_LABEL[current.skill]}</Badge>
              {current.skill === 'reading' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-navy-400">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Read, then answer
                </span>
              )}
            </div>

            {current.passage && (
              <p className="rounded-xl border border-navy-100 bg-sky-50 p-3.5 text-sm leading-relaxed text-navy-700">
                {current.passage}
              </p>
            )}

            <fieldset>
              <legend className="font-display text-lg font-bold leading-snug text-navy-800">
                {current.prompt}
              </legend>

              <div className="mt-4 space-y-2.5" role="radiogroup" aria-label="Answer options">
                {current.options.map((opt, i) => {
                  const checked = selectedId === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() => setSelectedId(opt.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-50',
                        'min-h-[48px]',
                        checked
                          ? 'border-navy-500 bg-navy-50 text-navy-800 shadow-sm'
                          : 'border-navy-200 bg-white text-navy-700 hover:border-navy-300 hover:bg-navy-50/60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                          checked ? 'bg-navy-700 text-white' : 'bg-sky-100 text-navy-600',
                        )}
                        aria-hidden="true"
                      >
                        {OPTION_KEYS[i]}
                      </span>
                      <span className="min-w-0">{opt.text}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </>
        )}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-navy-400">
            {questionNumber >= TOTAL ? 'Last question — finish to see your level.' : 'Pick the best answer.'}
          </p>
          <Button
            type="button"
            variant={questionNumber >= TOTAL ? 'accent' : 'primary'}
            onClick={handleNext}
            disabled={selectedId == null || phase === 'submitting'}
          >
            {phase === 'submitting'
              ? 'Scoring…'
              : questionNumber >= TOTAL
                ? 'Finish & see level'
                : 'Next question'}
            {phase !== 'submitting' && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

/* ------------------------------ result screen ------------------------------ */

function ResultScreen({
  result,
  onRetake,
}: {
  result: PlacementResultPayload
  onRetake: () => void
}) {
  const scorePct = result.total > 0 ? Math.round((result.correctCount / result.total) * 100) : 0
  // Levels covered, in ladder order, for a compact breakdown.
  const breakdown = useMemo(
    () => result.perLevel.filter((row) => row.total > 0),
    [result.perLevel],
  )

  return (
    <div className="space-y-6">
      {/* Headline result */}
      <Card className="overflow-hidden border-navy-200 bg-gradient-to-br from-navy-800 via-navy-700 to-navy-600">
        <CardBody className="text-white">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-400">
            <Trophy className="h-4 w-4" aria-hidden="true" /> Your level
          </p>
          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-4xl font-extrabold tracking-tight">
                {result.cefrLevel}
              </h2>
              <p className="mt-1 text-sm font-medium text-sky-100">{result.cefrLabel}</p>
            </div>
            <div className="flex items-stretch gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <div className="font-display text-2xl font-extrabold">
                  {result.correctCount}/{result.total}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-sky-200">Correct</div>
              </div>
              {result.ieltsBand != null && (
                <div className="rounded-2xl bg-accent-500 px-4 py-3 text-center text-navy-900">
                  <div className="font-display text-2xl font-extrabold">
                    {result.ieltsBand.toFixed(1)}
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide">Est. IELTS</div>
                </div>
              )}
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm text-sky-100">{result.guidance.summary}</p>
        </CardBody>
      </Card>

      {/* What to study next */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-500" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold text-navy-800">What to study next</h3>
          </div>
          <ul className="space-y-2.5">
            {result.guidance.focus.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-navy-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {breakdown.length > 0 && (
            <div className="rounded-xl border border-navy-100 bg-sky-50 p-3.5">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                How you did by level
              </p>
              <div className="space-y-2">
                {breakdown.map((row) => {
                  const pct = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0
                  return (
                    <div key={row.level} className="flex items-center gap-3">
                      <span className="w-7 shrink-0 text-sm font-bold text-navy-700">{row.level}</span>
                      <ProgressBar value={pct} className="flex-1" />
                      <span className="w-12 shrink-0 text-right text-xs font-medium text-navy-400">
                        {row.correct}/{row.total}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-navy-400">
            You scored {scorePct}% across {result.total} adaptive questions. Your level is now saved
            to your profile and powers your recommendations.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button href="/practice" variant="primary">
              Start practising
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button href="/dashboard" variant="secondary">
              Go to dashboard
            </Button>
            <Button type="button" variant="ghost" onClick={onRetake}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retake
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export default PlacementRunner
