'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Copy, CheckCircle2, AlertCircle, Save,
  ChevronRight, ChevronLeft, Headphones, PenLine,
  Mic, Brain, Calculator, GripVertical, BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ImageField } from '@/components/builder/ImageField'
import { cn } from '@/lib/cn'
import {
  BUILDER_TYPE_META, ternaryValuesFor, TRACK_SKILLS, SKILL_ALLOWED_TYPES,
  type BuilderQuestionType,
} from '@/types/builder'

/* ------------------------------------------------------------------ */
/* Draft types                                                          */
/* ------------------------------------------------------------------ */

/** Stable client-only id for React keys — never sent to the server. */
const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`

interface OptionDraft { uid: string; text: string; correct: boolean }
interface QuestionDraft {
  uid: string
  prompt: string
  options: OptionDraft[]
  answerText: string
  explanation: string
  imageUrl: string
  points: number
}
interface ErrorDraft { wrong: string; correct: string }
interface GroupDraft {
  uid: string
  type: BuilderQuestionType
  instruction: string
  explanation: string
  examples: string[]
  errors: ErrorDraft[]
  questions: QuestionDraft[]
}
interface Paragraph { label: string; text: string }

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const TRACKS = ['IELTS', 'SAT', 'GENERAL_ENGLISH'] as const
const TASK_TYPES = ['PRACTICE', 'MOCK', 'FULL', 'PLACEMENT'] as const

const MODULE_CARDS = [
  {
    value: 'IELTS' as const,
    label: 'IELTS',
    desc: 'Listening · Reading · Writing · Speaking',
    icon: Headphones,
    idle: 'border-sky-200 bg-sky-50 hover:border-sky-300',
    active: 'border-sky-500 bg-sky-100 ring-2 ring-sky-400',
  },
  {
    value: 'SAT' as const,
    label: 'SAT',
    desc: 'English (EBRW) · Math',
    icon: Calculator,
    idle: 'border-violet-200 bg-violet-50 hover:border-violet-300',
    active: 'border-violet-500 bg-violet-100 ring-2 ring-violet-400',
  },
  {
    value: 'GENERAL_ENGLISH' as const,
    label: 'General English',
    desc: 'Grammar · Listening · Reading · Writing · Speaking',
    icon: Brain,
    idle: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300',
    active: 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400',
  },
]

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function emptyQuestion(type: BuilderQuestionType): QuestionDraft {
  const hasOptions = BUILDER_TYPE_META[type].hasOptions
  return {
    uid: uid(),
    prompt: '',
    options: hasOptions
      ? [{ uid: uid(), text: '', correct: false }, { uid: uid(), text: '', correct: false }]
      : [],
    answerText: '',
    explanation: '',
    imageUrl: '',
    points: type === 'ESSAY' || type === 'SPEAKING_PROMPT' ? 9 : 1,
  }
}

function emptyGroup(skill?: string): GroupDraft {
  const allowed = skill
    ? (SKILL_ALLOWED_TYPES[skill] ?? ['MULTIPLE_CHOICE'])
    : ['MULTIPLE_CHOICE']
  const type = (allowed[0] ?? 'MULTIPLE_CHOICE') as BuilderQuestionType
  return { uid: uid(), type, instruction: '', explanation: '', examples: [], errors: [], questions: [emptyQuestion(type)] }
}

function cloneGroup(g: GroupDraft): GroupDraft {
  return {
    ...g,
    uid: uid(),
    examples: [...g.examples],
    errors: g.errors.map(e => ({ ...e })),
    questions: g.questions.map(q => ({
      ...q,
      uid: uid(),
      options: q.options.map(o => ({ ...o, uid: uid() })),
    })),
  }
}

/* ------------------------------------------------------------------ */
/* Style constants                                                      */
/* ------------------------------------------------------------------ */

const labelCls = 'mb-1.5 block text-sm font-semibold text-navy-700'
const selectCls = 'block w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-navy-800 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400'
const textareaCls = 'block w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-navy-800 placeholder:text-navy-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400'
const inlineCls = 'block w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-800 placeholder:text-navy-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400'

/* ================================================================== */
/* Main component                                                       */
/* ================================================================== */

export function TestBuilder({ canPublish }: { canPublish: boolean }) {
  const router = useRouter()

  /* wizard */
  const [step, setStep] = useState<1 | 2 | 3>(1)

  /* meta */
  const [title, setTitle] = useState('')
  const [track, setTrack] = useState<(typeof TRACKS)[number]>('IELTS')
  const [skill, setSkill] = useState<string>('READING')
  const [taskType, setTaskType] = useState<(typeof TASK_TYPES)[number]>('PRACTICE')
  const [cefrLevel, setCefrLevel] = useState<string>('')
  const [topic, setTopic] = useState('')          // Grammar: stored as instructions
  const [durationMin, setDurationMin] = useState(20)
  const [topics, setTopics] = useState('')
  const [instructions, setInstructions] = useState('')

  /* passage */
  const [passageHtml, setPassageHtml] = useState('')
  const [paragraphMode, setParagraphMode] = useState(false)
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([{ label: 'A', text: '' }])

  /* audio */
  const [audioUrl, setAudioUrl] = useState('')
  const [transcript, setTranscript] = useState('')

  const [publish, setPublish] = useState(false)
  const [groups, setGroups] = useState<GroupDraft[]>([emptyGroup('READING')])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  /* derived */
  const isGrammar = skill === 'GRAMMAR'
  const isIeltsWriting = track === 'IELTS' && skill === 'WRITING'
  const isIeltsSpeaking = track === 'IELTS' && skill === 'SPEAKING'
  const showPassage = (skill === 'READING' || skill === 'WRITING') && !isGrammar
  const showAudio = skill === 'LISTENING'
  const showDesmos = track === 'SAT' && skill === 'MATH'
  const showCefrLevel = track === 'GENERAL_ENGLISH'
  const trackSkills = TRACK_SKILLS[track] ?? TRACK_SKILLS['IELTS']!
  const allowedTypes = (SKILL_ALLOWED_TYPES[skill] ?? ['MULTIPLE_CHOICE']) as BuilderQuestionType[]

  /* --- track / skill handlers --- */
  function handleTrackChange(newTrack: (typeof TRACKS)[number]) {
    const skills = TRACK_SKILLS[newTrack] ?? TRACK_SKILLS['IELTS']!
    const newSkill = skills[0]?.value ?? 'READING'
    setTrack(newTrack)
    setSkill(newSkill)
    setGroups([emptyGroup(newSkill)])
  }

  function handleSkillChange(newSkill: string) {
    setSkill(newSkill)
    const allowed = (SKILL_ALLOWED_TYPES[newSkill] ?? ['MULTIPLE_CHOICE']) as BuilderQuestionType[]
    setGroups(gs =>
      gs.map(g => {
        const validType = allowed.includes(g.type) ? g.type : (allowed[0] ?? 'MULTIPLE_CHOICE')
        return validType !== g.type
          ? { ...g, type: validType, questions: g.questions.map(() => emptyQuestion(validType)) }
          : g
      }),
    )
  }

  /* --- group mutations --- */
  const updateGroup = (gi: number, patch: Partial<GroupDraft>) =>
    setGroups(gs => gs.map((g, i) => (i === gi ? { ...g, ...patch } : g)))

  const changeGroupType = (gi: number, type: BuilderQuestionType) =>
    setGroups(gs =>
      gs.map((g, i) =>
        i === gi ? { ...g, type, questions: g.questions.map(() => emptyQuestion(type)) } : g,
      ),
    )

  const addGroup = () => setGroups(gs => [...gs, emptyGroup(skill)])
  const addNamedGroup = (instruction: string) =>
    setGroups(gs => [...gs, { ...emptyGroup(skill), instruction }])
  const dupGroup = (gi: number) =>
    setGroups(gs => [...gs.slice(0, gi + 1), cloneGroup(gs[gi]!), ...gs.slice(gi + 1)])
  const removeGroup = (gi: number) => setGroups(gs => gs.filter((_, i) => i !== gi))

  /* --- question mutations --- */
  const updateQuestion = (gi: number, qi: number, patch: Partial<QuestionDraft>) =>
    setGroups(gs =>
      gs.map((g, i) =>
        i !== gi ? g : { ...g, questions: g.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) },
      ),
    )

  const addQuestion = (gi: number) =>
    setGroups(gs =>
      gs.map((g, i) =>
        i !== gi ? g : { ...g, questions: [...g.questions, emptyQuestion(g.type)] },
      ),
    )

  const removeQuestion = (gi: number, qi: number) =>
    setGroups(gs =>
      gs.map((g, i) =>
        i !== gi ? g : { ...g, questions: g.questions.filter((_, j) => j !== qi) },
      ),
    )

  /* --- option mutations --- */
  const updateOption = (gi: number, qi: number, oi: number, patch: Partial<OptionDraft>) =>
    setGroups(gs =>
      gs.map((g, i) => {
        if (i !== gi) return g
        return {
          ...g,
          questions: g.questions.map((q, j) => {
            if (j !== qi) return q
            let options = q.options.map((o, k) => (k === oi ? { ...o, ...patch } : o))
            if (patch.correct && g.type === 'MULTIPLE_CHOICE') {
              options = options.map((o, k) => ({ ...o, correct: k === oi }))
            }
            return { ...q, options }
          }),
        }
      }),
    )

  const addOption = (gi: number, qi: number) =>
    setGroups(gs =>
      gs.map((g, i) =>
        i !== gi
          ? g
          : {
              ...g,
              questions: g.questions.map((q, j) =>
                j !== qi ? q : { ...q, options: [...q.options, { uid: uid(), text: '', correct: false }] },
              ),
            },
      ),
    )

  const removeOption = (gi: number, qi: number, oi: number) =>
    setGroups(gs =>
      gs.map((g, i) =>
        i !== gi
          ? g
          : {
              ...g,
              questions: g.questions.map((q, j) =>
                j !== qi ? q : { ...q, options: q.options.filter((_, k) => k !== oi) },
              ),
            },
      ),
    )

  /* --- paragraph helpers --- */
  const updateParagraph = (pi: number, patch: Partial<Paragraph>) =>
    setParagraphs(ps => ps.map((p, i) => (i === pi ? { ...p, ...patch } : p)))

  function passageFromParagraphs(): string {
    return paragraphs
      .filter(p => p.text.trim())
      .map(p => `<p><strong>[${p.label}]</strong> ${p.text}</p>`)
      .join('\n')
  }

  /* --- submit --- */
  async function handleSubmit() {
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const effectivePassage = showPassage
        ? (paragraphMode ? passageFromParagraphs() : passageHtml) || undefined
        : undefined

      const payload = {
        title,
        track,
        skill,
        type: isGrammar ? ('PRACTICE' as const) : taskType,
        cefrLevel: cefrLevel || undefined,
        durationMin: isGrammar ? 20 : durationMin,
        topics: topics.split(',').map(t => t.trim()).filter(Boolean),
        instructions: isGrammar ? (topic || undefined) : (instructions || undefined),
        passageHtml: effectivePassage,
        audioUrl: showAudio && audioUrl ? audioUrl : undefined,
        transcript: showAudio && transcript ? transcript : undefined,
        publish: canPublish && publish,
        groups: groups.map(g => ({
          type: g.type,
          instruction: isGrammar ? (g.instruction || 'Answer the questions below.') : g.instruction,
          explanation: g.explanation || undefined,
          examples: isGrammar && g.examples.length ? g.examples : undefined,
          errors: isGrammar && g.errors.length ? g.errors : undefined,
          questions: g.questions.map(q => ({
            prompt: q.prompt,
            options: q.options,
            answerText: q.answerText,
            explanation: q.explanation || undefined,
            imageUrl: q.imageUrl || undefined,
            points: q.points,
          })),
        })),
      }

      const body = JSON.stringify(payload)
      let res = await fetch('/api/tasks/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      // Access token may have expired — try refresh once and retry
      if (res.status === 401) {
        const refreshed = await fetch('/api/auth/refresh', { method: 'POST' })
        if (refreshed.ok) {
          res = await fetch('/api/tasks/manual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          })
        } else {
          // Refresh token also expired/revoked — send to login
          router.push('/login?next=/coach/tasks/new')
          return
        }
      }

      const data: {
        error?: string
        issues?: { formErrors: string[]; fieldErrors: Record<string, string[]> }
        saved?: { questionCount: number; status: string; slug: string }
      } = await res.json()

      if (!res.ok) {
        const issueMsg = data.issues
          ? [...data.issues.formErrors, ...Object.values(data.issues.fieldErrors).flat()].join(' · ')
          : ''
        setError(data.error ? `${data.error}${issueMsg ? ` — ${issueMsg}` : ''}` : 'Could not save the test.')
        return
      }

      const saved = data.saved!
      setSuccess(`Saved "${saved.slug}" — ${saved.questionCount} questions, status ${saved.status}.`)
      setTimeout(() => router.push('/coach/review'), 1400)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalQuestions = groups.reduce((n, g) => n + g.questions.length, 0)

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      <StepBar step={step} />

      {/* ═══ Step 1: Module & Skill ═══ */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {MODULE_CARDS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => handleTrackChange(m.value)}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all',
                  track === m.value ? m.active : m.idle,
                )}
              >
                <m.icon className="h-6 w-6 text-navy-700" />
                <div>
                  <p className="font-display text-base font-bold text-navy-900">{m.label}</p>
                  <p className="mt-0.5 text-xs text-navy-500">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div>
            <p className={labelCls}>Skill</p>
            <div className="flex flex-wrap gap-2">
              {trackSkills.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => handleSkillChange(s.value)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                    skill === s.value
                      ? 'border-navy-700 bg-navy-700 text-white'
                      : 'border-navy-200 bg-white text-navy-600 hover:border-navy-400',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)}>
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Step 2: Details ═══ */}
      {step === 2 && (
        <div className="space-y-4">
          {isGrammar ? (
            <GrammarDetails
              title={title} setTitle={setTitle}
              topic={topic} setTopic={setTopic}
              cefrLevel={cefrLevel} setCefrLevel={setCefrLevel}
              topics={topics} setTopics={setTopics}
              labelCls={labelCls} selectCls={selectCls}
            />
          ) : (
            <GeneralDetails
              title={title} setTitle={setTitle}
              skill={skill}
              taskType={taskType} setTaskType={v => setTaskType(v as typeof taskType)}
              cefrLevel={cefrLevel} setCefrLevel={setCefrLevel}
              showCefrLevel={showCefrLevel}
              durationMin={durationMin} setDurationMin={setDurationMin}
              topics={topics} setTopics={setTopics}
              instructions={instructions} setInstructions={setInstructions}
              showPassage={showPassage}
              passageHtml={passageHtml} setPassageHtml={setPassageHtml}
              paragraphMode={paragraphMode} setParagraphMode={setParagraphMode}
              paragraphs={paragraphs} setParagraphs={setParagraphs}
              updateParagraph={updateParagraph}
              showAudio={showAudio}
              audioUrl={audioUrl} setAudioUrl={setAudioUrl}
              transcript={transcript} setTranscript={setTranscript}
              showDesmos={showDesmos}
              labelCls={labelCls} selectCls={selectCls} textareaCls={textareaCls}
            />
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)}>
              Add questions <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Step 3: Questions ═══ */}
      {step === 3 && (
        <div className="space-y-4">
          {groups.map((group, gi) => (
            <GroupCard
              key={group.uid}
              gi={gi}
              group={group}
              isGrammar={isGrammar}
              allowedTypes={allowedTypes}
              track={track}
              skill={skill}
              totalGroups={groups.length}
              onUpdateGroup={patch => updateGroup(gi, patch)}
              onChangeType={type => changeGroupType(gi, type)}
              onDup={() => dupGroup(gi)}
              onRemove={() => removeGroup(gi)}
              onUpdateQuestion={(qi, patch) => updateQuestion(gi, qi, patch)}
              onAddQuestion={() => addQuestion(gi)}
              onRemoveQuestion={qi => removeQuestion(gi, qi)}
              onUpdateOption={(qi, oi, patch) => updateOption(gi, qi, oi, patch)}
              onAddOption={qi => addOption(gi, qi)}
              onRemoveOption={(qi, oi) => removeOption(gi, qi, oi)}
              labelCls={labelCls} selectCls={selectCls} textareaCls={textareaCls}
            />
          ))}

          {isIeltsWriting ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => addNamedGroup('IELTS Writing Task 1 — Describe a visual (graph / chart / map / diagram)')}
                className="flex-1 border border-dashed border-navy-200"
              >
                <Plus className="h-4 w-4" /> Add Writing Task 1
              </Button>
              <Button
                variant="ghost"
                onClick={() => addNamedGroup('IELTS Writing Task 2 — Essay response')}
                className="flex-1 border border-dashed border-navy-200"
              >
                <Plus className="h-4 w-4" /> Add Writing Task 2
              </Button>
            </div>
          ) : isIeltsSpeaking ? (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="ghost"
                onClick={() => addNamedGroup('Speaking Part 1 — Introduction & interview (familiar topics)')}
                className="flex-1 border border-dashed border-navy-200"
              >
                <Plus className="h-4 w-4" /> Add Part 1
              </Button>
              <Button
                variant="ghost"
                onClick={() => addNamedGroup('Speaking Part 2 — Long turn (cue card, speak for 2 minutes)')}
                className="flex-1 border border-dashed border-navy-200"
              >
                <Plus className="h-4 w-4" /> Add Part 2
              </Button>
              <Button
                variant="ghost"
                onClick={() => addNamedGroup('Speaking Part 3 — Two-way discussion (abstract questions)')}
                className="flex-1 border border-dashed border-navy-200"
              >
                <Plus className="h-4 w-4" /> Add Part 3
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={addGroup}
              className="border border-dashed border-navy-200"
            >
              <Plus className="h-4 w-4" />
              {isGrammar ? 'Add exercise' : 'Add question group'}
            </Button>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {success}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
            <div className="text-sm text-navy-500">
              <span className="font-semibold text-navy-800">{totalQuestions}</span> questions in{' '}
              <span className="font-semibold text-navy-800">{groups.length}</span>{' '}
              {isGrammar ? 'exercise(s)' : 'group(s)'}
              {!canPublish && (
                <p className="mt-0.5 text-xs text-navy-400">Submitted tests go to admin review before going live.</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Button variant="secondary" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {canPublish && (
                <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
                  <input
                    type="checkbox"
                    checked={publish}
                    onChange={e => setPublish(e.target.checked)}
                    className="h-4 w-4 rounded border-navy-300"
                  />
                  Publish immediately
                </label>
              )}
              <Button onClick={handleSubmit} disabled={submitting}>
                <Save className="h-4 w-4" />
                {submitting ? 'Saving…' : canPublish && publish ? 'Save & publish' : 'Save test'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* Step indicator                                                       */
/* ================================================================== */

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const STEPS = ['Module & Skill', 'Details', 'Questions'] as const
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const active = step === n
        const done = step > n
        return (
          <div key={n} className="flex items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors',
                done ? 'bg-emerald-500 text-white' :
                active ? 'bg-navy-800 text-white' :
                'bg-navy-100 text-navy-400',
              )}
            >
              {done ? '✓' : n}
            </div>
            <span
              className={cn(
                'ml-2 text-sm font-semibold',
                active ? 'text-navy-800' : done ? 'text-emerald-600' : 'text-navy-400',
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-4 h-px w-10 sm:w-16',
                  step > n ? 'bg-emerald-400' : 'bg-navy-200',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ================================================================== */
/* Step 2a — Grammar details                                            */
/* ================================================================== */

function GrammarDetails({
  title, setTitle, topic, setTopic,
  cefrLevel, setCefrLevel, topics, setTopics,
  labelCls, selectCls,
}: {
  title: string; setTitle: (v: string) => void
  topic: string; setTopic: (v: string) => void
  cefrLevel: string; setCefrLevel: (v: string) => void
  topics: string; setTopics: (v: string) => void
  labelCls: string; selectCls: string
}) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="text-lg font-bold text-navy-800">Grammar lesson details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Lesson title"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Present Simple — habits and facts"
          />
          <Input
            label="Topic name"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Present Simple"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Level</label>
            <select
              className={selectCls}
              value={cefrLevel}
              onChange={e => setCefrLevel(e.target.value)}
            >
              <option value="">— any level —</option>
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <Input
            label="Tags (comma-separated)"
            value={topics}
            onChange={e => setTopics(e.target.value)}
            placeholder="present simple, habits, routines"
          />
        </div>
      </CardBody>
    </Card>
  )
}

/* ================================================================== */
/* Step 2b — General / IELTS / SAT details                             */
/* ================================================================== */

function GeneralDetails({
  title, setTitle, skill,
  taskType, setTaskType, cefrLevel, setCefrLevel, showCefrLevel,
  durationMin, setDurationMin, topics, setTopics,
  instructions, setInstructions,
  showPassage, passageHtml, setPassageHtml,
  paragraphMode, setParagraphMode, paragraphs, setParagraphs, updateParagraph,
  showAudio, audioUrl, setAudioUrl, transcript, setTranscript,
  showDesmos,
  labelCls, selectCls, textareaCls,
}: {
  title: string; setTitle: (v: string) => void
  skill: string
  taskType: string; setTaskType: (v: string) => void
  cefrLevel: string; setCefrLevel: (v: string) => void
  showCefrLevel: boolean
  durationMin: number; setDurationMin: (v: number) => void
  topics: string; setTopics: (v: string) => void
  instructions: string; setInstructions: (v: string) => void
  showPassage: boolean; passageHtml: string; setPassageHtml: (v: string) => void
  paragraphMode: boolean; setParagraphMode: (v: boolean) => void
  paragraphs: Paragraph[]; setParagraphs: (v: Paragraph[]) => void
  updateParagraph: (pi: number, patch: Partial<Paragraph>) => void
  showAudio: boolean; audioUrl: string; setAudioUrl: (v: string) => void
  transcript: string; setTranscript: (v: string) => void
  showDesmos: boolean
  labelCls: string; selectCls: string; textareaCls: string
}) {
  const TASK_TYPES_LOCAL = ['PRACTICE', 'MOCK', 'FULL', 'PLACEMENT'] as const

  function nextLabel(): string {
    return String.fromCharCode(65 + paragraphs.length)
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="text-lg font-bold text-navy-800">Test details</h2>

        <Input
          label="Title"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. CDI IELTS Reading — Yawning"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelCls}>Format</label>
            <select
              className={selectCls}
              value={taskType}
              onChange={e => setTaskType(e.target.value)}
            >
              {TASK_TYPES_LOCAL.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {showCefrLevel && (
            <div>
              <label className={labelCls}>Level</label>
              <select
                className={selectCls}
                value={cefrLevel}
                onChange={e => setCefrLevel(e.target.value)}
              >
                <option value="">— any level —</option>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          )}
          <Input
            label="Duration (min)"
            type="number"
            min={1}
            value={durationMin}
            onChange={e => setDurationMin(Number(e.target.value) || 0)}
          />
          <Input
            label="Topics (comma-separated)"
            value={topics}
            onChange={e => setTopics(e.target.value)}
            placeholder="science, environment"
          />
        </div>

        <div>
          <label className={labelCls}>Instructions (optional)</label>
          <textarea
            className={textareaCls}
            rows={2}
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Shown to the student before they start."
          />
        </div>

        {showDesmos && (
          <div className="rounded-xl border border-navy-200 bg-navy-50 p-3">
            <p className="mb-2 text-xs font-semibold text-navy-600">Desmos Graphing Calculator — students see this during the Math test</p>
            <iframe
              src="https://www.desmos.com/calculator"
              className="h-64 w-full rounded-lg border border-navy-200"
              title="Desmos Graphing Calculator"
            />
          </div>
        )}

        {showPassage && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={labelCls}>
                {skill === 'WRITING' ? 'Writing prompt / context' : 'Reading passage'}
              </label>
              {skill === 'READING' && (
                <button
                  type="button"
                  onClick={() => setParagraphMode(!paragraphMode)}
                  className="text-xs font-semibold text-sky-600 underline hover:text-sky-800"
                >
                  {paragraphMode ? 'Plain text mode' : 'Paragraph mode (A, B, C…)'}
                </button>
              )}
            </div>

            {paragraphMode ? (
              <div className="space-y-3">
                {paragraphs.map((p, pi) => (
                  <div key={pi} className="flex gap-2">
                    <input
                      className="w-12 shrink-0 rounded-lg border border-navy-200 px-2 py-2 text-center text-sm font-bold text-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
                      value={p.label}
                      onChange={e => updateParagraph(pi, { label: e.target.value })}
                      maxLength={3}
                    />
                    <textarea
                      className={textareaCls}
                      rows={3}
                      value={p.text}
                      onChange={e => updateParagraph(pi, { text: e.target.value })}
                      placeholder={`Paragraph ${p.label}…`}
                    />
                    {paragraphs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setParagraphs(paragraphs.filter((_, i) => i !== pi))}
                        className="text-navy-300 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setParagraphs([...paragraphs, { label: nextLabel(), text: '' }])}
                  className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800"
                >
                  <Plus className="h-4 w-4" /> Add paragraph
                </button>
              </div>
            ) : (
              <textarea
                className={textareaCls}
                rows={7}
                value={passageHtml}
                onChange={e => setPassageHtml(e.target.value)}
                placeholder="Paste the passage text (HTML allowed)."
              />
            )}
          </div>
        )}

        {showAudio && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Audio URL"
              value={audioUrl}
              onChange={e => setAudioUrl(e.target.value)}
              placeholder="https://… (file upload coming later)"
              hint="Paste a direct link to the listening audio."
            />
            <div>
              <label className={labelCls}>Transcript (optional)</label>
              <textarea
                className={textareaCls}
                rows={2}
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
              />
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/* ================================================================== */
/* Group card (Step 3)                                                  */
/* ================================================================== */

function GroupCard({
  gi, group, isGrammar, allowedTypes, track, skill, totalGroups,
  onUpdateGroup, onChangeType, onDup, onRemove,
  onUpdateQuestion, onAddQuestion, onRemoveQuestion,
  onUpdateOption, onAddOption, onRemoveOption,
  labelCls, selectCls, textareaCls,
}: {
  gi: number
  group: GroupDraft
  isGrammar: boolean
  allowedTypes: BuilderQuestionType[]
  track: string
  skill: string
  totalGroups: number
  onUpdateGroup: (patch: Partial<GroupDraft>) => void
  onChangeType: (type: BuilderQuestionType) => void
  onDup: () => void
  onRemove: () => void
  onUpdateQuestion: (qi: number, patch: Partial<QuestionDraft>) => void
  onAddQuestion: () => void
  onRemoveQuestion: (qi: number) => void
  onUpdateOption: (qi: number, oi: number, patch: Partial<OptionDraft>) => void
  onAddOption: (qi: number) => void
  onRemoveOption: (qi: number, oi: number) => void
  labelCls: string
  selectCls: string
  textareaCls: string
}) {
  return (
    <Card>
      <CardBody className="space-y-4">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-navy-700">
            <GripVertical className="h-5 w-5 text-navy-300" />
            <h3 className="text-base font-bold">
              {isGrammar ? `Exercise ${gi + 1}` : `Group ${gi + 1}`}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onDup}
              title="Duplicate"
              className="inline-flex items-center gap-1 text-sm font-medium text-navy-400 hover:text-navy-700"
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            {totalGroups > 1 && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1 text-sm font-medium text-red-400 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
        </div>

        {/* type + instruction */}
        <div className={cn('grid gap-4', isGrammar ? 'sm:grid-cols-1' : 'sm:grid-cols-2')}>
          <div>
            <label className={labelCls}>Question type</label>
            <select
              className={selectCls}
              value={group.type}
              onChange={e => onChangeType(e.target.value as BuilderQuestionType)}
            >
              {allowedTypes.map(t => (
                <option key={t} value={t}>
                  {track === 'SAT' && skill === 'MATH' && t === 'SHORT_ANSWER'
                    ? 'Grid-in (student types answer)'
                    : BUILDER_TYPE_META[t].label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-navy-400">{BUILDER_TYPE_META[group.type].hint}</p>
          </div>
          {!isGrammar && (
            <Input
              label="Instruction"
              required
              value={group.instruction}
              onChange={e => onUpdateGroup({ instruction: e.target.value })}
              placeholder={
                skill === 'WRITING' ? 'Task 1: Write at least 150 words.' :
                skill === 'SPEAKING' ? 'Part 2: Speak for 1–2 minutes.' :
                'Questions 1–5: Choose the correct letter A, B, C or D.'
              }
            />
          )}
        </div>

        {/* Grammar: explanation */}
        {isGrammar && (
          <div>
            <label className={labelCls}>Grammar explanation (shown to student before questions)</label>
            <textarea
              className={textareaCls}
              rows={5}
              value={group.explanation}
              onChange={e => onUpdateGroup({ explanation: e.target.value })}
              placeholder="Explain the grammar rule. E.g. Present Simple is used for habits and facts. We use DO/DOES in questions: 'Do you work here?'"
            />
          </div>
        )}

        {/* Grammar: examples */}
        {isGrammar && (
          <ExamplesEditor
            examples={group.examples}
            onChange={examples => onUpdateGroup({ examples })}
            labelCls={labelCls}
          />
        )}

        {/* Grammar: common errors */}
        {isGrammar && (
          <ErrorsEditor
            errors={group.errors}
            onChange={errors => onUpdateGroup({ errors })}
            labelCls={labelCls}
          />
        )}

        {/* questions */}
        <div className="space-y-3">
          {group.questions.map((q, qi) => (
            <QuestionCard
              key={q.uid}
              qi={qi}
              q={q}
              group={group}
              totalQuestions={group.questions.length}
              onUpdate={patch => onUpdateQuestion(qi, patch)}
              onRemove={() => onRemoveQuestion(qi)}
              onUpdateOption={(oi, patch) => onUpdateOption(qi, oi, patch)}
              onAddOption={() => onAddOption(qi)}
              onRemoveOption={oi => onRemoveOption(qi, oi)}
              textareaCls={textareaCls}
            />
          ))}
        </div>

        <Button variant="secondary" size="sm" onClick={onAddQuestion}>
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </CardBody>
    </Card>
  )
}

/* ================================================================== */
/* Examples editor — Grammar                                            */
/* ================================================================== */

function ExamplesEditor({
  examples, onChange, labelCls,
}: {
  examples: string[]
  onChange: (v: string[]) => void
  labelCls: string
}) {
  const [ids, setIds] = useState<string[]>(() => examples.map(() => Math.random().toString(36).slice(2)))

  const handleAdd = () => {
    setIds(prev => [...prev, Math.random().toString(36).slice(2)])
    onChange([...examples, ''])
  }

  const handleDelete = (i: number) => {
    setIds(prev => prev.filter((_, j) => j !== i))
    onChange(examples.filter((_, j) => j !== i))
  }

  return (
    <div>
      <label className={labelCls}>Example sentences (optional)</label>
      <div className="space-y-2">
        {examples.map((ex, i) => (
          <div key={ids[i] ?? i} className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-bold text-navy-400">{i + 1}.</span>
            <input
              className={inlineCls}
              value={ex}
              onChange={e => {
                const next = [...examples]
                next[i] = e.target.value
                onChange(next)
              }}
              placeholder="She walks to school every day."
            />
            <button
              type="button"
              aria-label="Remove example"
              onClick={() => handleDelete(i)}
              className="shrink-0 text-navy-300 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1 text-sm font-medium text-navy-500 hover:text-navy-800"
        >
          <Plus className="h-4 w-4" /> Add example
        </button>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Errors editor — Grammar                                              */
/* ================================================================== */

function ErrorsEditor({
  errors, onChange, labelCls,
}: {
  errors: ErrorDraft[]
  onChange: (v: ErrorDraft[]) => void
  labelCls: string
}) {
  const [ids, setIds] = useState<string[]>(() => errors.map(() => Math.random().toString(36).slice(2)))

  const handleAdd = () => {
    setIds(prev => [...prev, Math.random().toString(36).slice(2)])
    onChange([...errors, { wrong: '', correct: '' }])
  }

  const handleDelete = (i: number) => {
    setIds(prev => prev.filter((_, j) => j !== i))
    onChange(errors.filter((_, j) => j !== i))
  }

  return (
    <div>
      <label className={labelCls}>Common errors (optional)</label>
      <div className="space-y-2">
        {errors.map((e, i) => (
          <div key={ids[i] ?? i} className="flex items-center gap-2">
            <input
              className="flex-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 placeholder:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              value={e.wrong}
              onChange={ev => {
                const next = [...errors]
                next[i] = { ...next[i]!, wrong: ev.target.value }
                onChange(next)
              }}
              placeholder="Wrong: She walk to school."
            />
            <span className="shrink-0 text-sm text-navy-400">→</span>
            <input
              className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 placeholder:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              value={e.correct}
              onChange={ev => {
                const next = [...errors]
                next[i] = { ...next[i]!, correct: ev.target.value }
                onChange(next)
              }}
              placeholder="Correct: She walks to school."
            />
            <button
              type="button"
              aria-label="Remove error example"
              onClick={() => handleDelete(i)}
              className="shrink-0 text-navy-300 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1 text-sm font-medium text-navy-500 hover:text-navy-800"
        >
          <Plus className="h-4 w-4" /> Add error example
        </button>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Question card                                                        */
/* ================================================================== */

function QuestionCard({
  qi, q, group, totalQuestions,
  onUpdate, onRemove,
  onUpdateOption, onAddOption, onRemoveOption,
  textareaCls,
}: {
  qi: number
  q: QuestionDraft
  group: GroupDraft
  totalQuestions: number
  onUpdate: (patch: Partial<QuestionDraft>) => void
  onRemove: () => void
  onUpdateOption: (oi: number, patch: Partial<OptionDraft>) => void
  onAddOption: () => void
  onRemoveOption: (oi: number) => void
  textareaCls: string
}) {
  return (
    <div className="rounded-xl border border-navy-100 bg-sky-50/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-navy-400">
          Question {qi + 1}
        </span>
        {totalQuestions > 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="text-navy-300 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <textarea
        className={textareaCls}
        rows={2}
        value={q.prompt}
        onChange={e => onUpdate({ prompt: e.target.value })}
        placeholder="Question text…"
      />

      <ImageField
        value={q.imageUrl}
        onChange={(url) => onUpdate({ imageUrl: url })}
        inputCls={textareaCls}
      />

      <QuestionEditor
        group={group}
        question={q}
        onOption={onUpdateOption}
        onAddOption={onAddOption}
        onRemoveOption={onRemoveOption}
        onAnswerText={v => onUpdate({ answerText: v })}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className={cn(textareaCls, 'text-sm')}
          value={q.explanation}
          onChange={e => onUpdate({ explanation: e.target.value })}
          placeholder="Explanation (optional)"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-navy-500">Points</label>
          <input
            type="number"
            min={1}
            className="w-20 rounded-lg border border-navy-200 px-2 py-1.5 text-navy-800"
            value={q.points}
            onChange={e => onUpdate({ points: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Per-type answer editor                                               */
/* ================================================================== */

function QuestionEditor({
  group, question, onOption, onAddOption, onRemoveOption, onAnswerText,
}: {
  group: GroupDraft
  question: QuestionDraft
  onOption: (oi: number, patch: Partial<OptionDraft>) => void
  onAddOption: () => void
  onRemoveOption: (oi: number) => void
  onAnswerText: (v: string) => void
}) {
  const meta = BUILDER_TYPE_META[group.type]

  if (meta.hasOptions) {
    const single = group.type === 'MULTIPLE_CHOICE'
    return (
      <div className="mt-3 space-y-2">
        {question.options.map((opt, oi) => (
          <div key={opt.uid} className="flex items-center gap-2">
            <input
              type={single ? 'radio' : 'checkbox'}
              checked={opt.correct}
              onChange={e => onOption(oi, { correct: e.target.checked })}
              className="h-4 w-4 shrink-0"
              aria-label="Mark correct"
            />
            <span className="w-5 text-sm font-semibold text-navy-400">
              {String.fromCharCode(65 + oi)}
            </span>
            <input
              className="flex-1 rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-800"
              value={opt.text}
              onChange={e => onOption(oi, { text: e.target.value })}
              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
            />
            {question.options.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveOption(oi)}
                className="text-navy-300 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={onAddOption}
          className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-navy-800"
        >
          <Plus className="h-4 w-4" /> Add option
        </button>
        <p className="text-xs text-navy-400">
          {single ? 'Tick the one correct option.' : 'Tick every correct option.'}
        </p>
      </div>
    )
  }

  if (group.type === 'TRUE_FALSE_NOTGIVEN' || group.type === 'YES_NO_NOTGIVEN') {
    return (
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-semibold text-navy-500">Answer</p>
        <div className="flex gap-2">
          {ternaryValuesFor(group.type).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => onAnswerText(v)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors',
                question.answerText.toUpperCase().replace(/\s+/g, '_') === v
                  ? 'border-navy-700 bg-navy-700 text-white'
                  : 'border-navy-200 bg-white text-navy-600 hover:border-navy-400',
              )}
            >
              {v.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Every remaining objective type without options (short answer + the
  // completion family) is keyed by typing the accepted answer. Driving this off
  // the metadata means a new gap-fill type gets its editor for free instead of
  // silently falling through to "graded manually".
  if (meta.objective && !meta.hasOptions) {
    return (
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-semibold text-navy-500">Accepted answer</p>
        <input
          className="block w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-800 placeholder:text-navy-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
          value={question.answerText}
          onChange={e => onAnswerText(e.target.value)}
          placeholder={meta.hint}
        />
        <p className="mt-1 text-xs text-navy-400">{meta.hint}</p>
      </div>
    )
  }

  return (
    <p className="mt-2 text-xs italic text-navy-400">
      No answer key — this response will be graded manually or by AI.
    </p>
  )
}
