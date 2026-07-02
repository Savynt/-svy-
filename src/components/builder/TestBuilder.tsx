'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical, CheckCircle2, AlertCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import {
  BUILDER_QUESTION_TYPES,
  BUILDER_TYPE_META,
  TFNG_VALUES,
  TRACK_SKILLS,
  SKILL_ALLOWED_TYPES,
  type BuilderQuestionType,
} from '@/types/builder'

/* ------------------------------------------------------------------ */
/* Local draft state — looser than the wire schema (string number inputs */
/* etc.). Serialised to the BuilderTask payload on submit.               */
/* ------------------------------------------------------------------ */

interface OptionDraft {
  text: string
  correct: boolean
}
interface QuestionDraft {
  prompt: string
  options: OptionDraft[]
  answerText: string
  explanation: string
  imageUrl: string
  points: number
}
interface GroupDraft {
  type: BuilderQuestionType
  instruction: string
  explanation: string
  questions: QuestionDraft[]
}

const TRACKS = ['IELTS', 'SAT', 'GENERAL_ENGLISH'] as const
const TASK_TYPES = ['PRACTICE', 'MOCK', 'FULL', 'PLACEMENT'] as const

function emptyQuestion(type: BuilderQuestionType): QuestionDraft {
  const hasOptions = BUILDER_TYPE_META[type].hasOptions
  return {
    prompt: '',
    options: hasOptions ? [{ text: '', correct: false }, { text: '', correct: false }] : [],
    answerText: '',
    explanation: '',
    imageUrl: '',
    points: type === 'ESSAY' || type === 'SPEAKING_PROMPT' ? 9 : 1,
  }
}

function emptyGroup(skill?: string): GroupDraft {
  const allowed = skill ? SKILL_ALLOWED_TYPES[skill] ?? BUILDER_QUESTION_TYPES : BUILDER_QUESTION_TYPES
  const type: BuilderQuestionType = allowed[0] ?? 'MULTIPLE_CHOICE'
  return { type, instruction: '', explanation: '', questions: [emptyQuestion(type)] }
}

const labelCls = 'mb-1.5 block text-sm font-semibold text-navy-700'
const selectCls =
  'block w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-navy-800 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400'
const textareaCls =
  'block w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-navy-800 placeholder:text-navy-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400'

export function TestBuilder({ canPublish }: { canPublish: boolean }) {
  const router = useRouter()

  // meta
  const [title, setTitle] = useState('')
  const [track, setTrack] = useState<(typeof TRACKS)[number]>('IELTS')
  const [skill, setSkill] = useState<string>('READING')
  const [taskType, setTaskType] = useState<(typeof TASK_TYPES)[number]>('PRACTICE')
  const [cefrLevel, setCefrLevel] = useState<string>('')
  const [durationMin, setDurationMin] = useState(20)
  const [topics, setTopics] = useState('')
  const [instructions, setInstructions] = useState('')
  const [passageHtml, setPassageHtml] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [transcript, setTranscript] = useState('')
  const [publish, setPublish] = useState(false)

  const [groups, setGroups] = useState<GroupDraft[]>([emptyGroup('READING')])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const trackSkills = TRACK_SKILLS[track] ?? TRACK_SKILLS['IELTS']
  const allowedTypes = SKILL_ALLOWED_TYPES[skill] ?? BUILDER_QUESTION_TYPES

  const isGrammar = skill === 'GRAMMAR'
  const showPassage = (skill === 'READING' || skill === 'WRITING') && !isGrammar
  const showAudio = skill === 'LISTENING'
  const showDesmos = track === 'SAT' && skill === 'MATH'
  const showExplanation = track === 'GENERAL_ENGLISH'
  const showCefrLevel = track === 'GENERAL_ENGLISH'

  function handleTrackChange(newTrack: (typeof TRACKS)[number]) {
    const skills = TRACK_SKILLS[newTrack] ?? TRACK_SKILLS['IELTS']
    const newSkill = skills[0]?.value ?? 'READING'
    setTrack(newTrack)
    setSkill(newSkill)
    // reset groups with allowed type for new skill
    setGroups([emptyGroup(newSkill)])
  }

  function handleSkillChange(newSkill: string) {
    setSkill(newSkill)
    // reset all groups' types to first allowed for new skill
    const allowed = SKILL_ALLOWED_TYPES[newSkill] ?? BUILDER_QUESTION_TYPES
    setGroups((gs) => gs.map((g) => {
      const validType = allowed.includes(g.type) ? g.type : allowed[0]!
      return validType !== g.type
        ? { ...g, type: validType, questions: g.questions.map(() => emptyQuestion(validType)) }
        : g
    }))
  }

  /* ---- group/question mutation helpers (immutable) ---- */
  const updateGroup = (gi: number, patch: Partial<GroupDraft>) =>
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, ...patch } : g)))

  const changeGroupType = (gi: number, type: BuilderQuestionType) =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === gi ? { ...g, type, questions: g.questions.map(() => emptyQuestion(type)) } : g,
      ),
    )

  const addGroup = () => setGroups((gs) => [...gs, emptyGroup(skill)])
  const removeGroup = (gi: number) => setGroups((gs) => gs.filter((_, i) => i !== gi))

  const updateQuestion = (gi: number, qi: number, patch: Partial<QuestionDraft>) =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === gi
          ? { ...g, questions: g.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) }
          : g,
      ),
    )

  const addQuestion = (gi: number) =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === gi ? { ...g, questions: [...g.questions, emptyQuestion(g.type)] } : g,
      ),
    )

  const removeQuestion = (gi: number, qi: number) =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === gi ? { ...g, questions: g.questions.filter((_, j) => j !== qi) } : g,
      ),
    )

  /* ---- option helpers ---- */
  const updateOption = (gi: number, qi: number, oi: number, patch: Partial<OptionDraft>) =>
    setGroups((gs) =>
      gs.map((g, i) => {
        if (i !== gi) return g
        return {
          ...g,
          questions: g.questions.map((q, j) => {
            if (j !== qi) return q
            let options = q.options.map((o, k) => (k === oi ? { ...o, ...patch } : o))
            // single-correct: ticking one un-ticks the rest
            if (patch.correct && g.type === 'MULTIPLE_CHOICE') {
              options = options.map((o, k) => ({ ...o, correct: k === oi }))
            }
            return { ...q, options }
          }),
        }
      }),
    )

  const addOption = (gi: number, qi: number) =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === gi
          ? {
              ...g,
              questions: g.questions.map((q, j) =>
                j === qi ? { ...q, options: [...q.options, { text: '', correct: false }] } : q,
              ),
            }
          : g,
      ),
    )

  const removeOption = (gi: number, qi: number, oi: number) =>
    setGroups((gs) =>
      gs.map((g, i) =>
        i === gi
          ? {
              ...g,
              questions: g.questions.map((q, j) =>
                j === qi ? { ...q, options: q.options.filter((_, k) => k !== oi) } : q,
              ),
            }
          : g,
      ),
    )

  /* ---- submit ---- */
  async function handleSubmit() {
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const payload = {
        title,
        track,
        skill,
        type: taskType,

        cefrLevel: cefrLevel || undefined,
        durationMin,
        topics: topics
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        instructions: isGrammar ? undefined : (instructions || undefined),
        passageHtml: showPassage && passageHtml ? passageHtml : undefined,
        audioUrl: showAudio && audioUrl ? audioUrl : undefined,
        transcript: showAudio && transcript ? transcript : undefined,
        publish: canPublish && publish,
        groups: groups.map((g) => ({
          type: g.type,
          instruction: showExplanation ? (g.instruction || 'Answer the questions below.') : g.instruction,
          explanation: g.explanation || undefined,
          questions: g.questions.map((q) => ({
            prompt: q.prompt,
            options: q.options,
            answerText: q.answerText,
            explanation: q.explanation || undefined,
            imageUrl: q.imageUrl || undefined,
            points: q.points,
          })),
        })),
      }

      const res = await fetch('/api/tasks/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
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
      setSuccess(
        `Saved “${saved.slug}” — ${saved.questionCount} questions, status ${saved.status}.`,
      )
      // give the author a beat to read the toast, then go to the queue/list
      setTimeout(() => router.push('/coach/review'), 1400)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalQuestions = groups.reduce((n, g) => n + g.questions.length, 0)

  return (
    <div className="space-y-6">
      {/* ---- meta ---- */}
      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-lg font-bold text-navy-800">
            {isGrammar ? 'Grammar lesson details' : 'Test details'}
          </h2>
          <Input
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isGrammar ? 'e.g. Present Simple — habits and facts' : 'e.g. CDI IELTS Reading — Yawning'}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelCls}>Module</label>
              <select className={selectCls} value={track} onChange={(e) => handleTrackChange(e.target.value as typeof track)}>
                <option value="IELTS">IELTS</option>
                <option value="SAT">SAT</option>
                <option value="GENERAL_ENGLISH">General English</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Skill</label>
              <select className={selectCls} value={skill} onChange={(e) => handleSkillChange(e.target.value)}>
                {trackSkills.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            {!isGrammar && (
              <div>
                <label className={labelCls}>Format</label>
                <select className={selectCls} value={taskType} onChange={(e) => setTaskType(e.target.value as typeof taskType)}>
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
            {showCefrLevel && (
              <div>
                <label className={labelCls}>Level</label>
                <select className={selectCls} value={cefrLevel} onChange={(e) => setCefrLevel(e.target.value)}>
                  <option value="">— any level —</option>
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            )}
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

          <div className="grid gap-4 sm:grid-cols-2">
            {!isGrammar && (
              <Input
                label="Duration (min)"
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value) || 0)}
              />
            )}
            <Input
              label="Topics (comma-separated)"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder={isGrammar ? 'present simple, habits' : 'science, environment'}
            />
          </div>

          {!isGrammar && (
            <div>
              <label className={labelCls}>Instructions (optional)</label>
              <textarea
                className={textareaCls}
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Shown to the student before they start."
              />
            </div>
          )}

          {showPassage && (
            <div>
              <label className={labelCls}>
                {skill === 'WRITING' ? 'Writing prompt / context' : 'Reading passage'}
              </label>
              <textarea
                className={textareaCls}
                rows={6}
                value={passageHtml}
                onChange={(e) => setPassageHtml(e.target.value)}
                placeholder="Paste the passage text (HTML allowed)."
              />
            </div>
          )}

          {showAudio && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Audio URL"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://… (file upload coming later)"
                hint="Paste a direct link to the listening audio."
              />
              <div>
                <label className={labelCls}>Transcript (optional)</label>
                <textarea
                  className={textareaCls}
                  rows={2}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ---- groups ---- */}
      {groups.map((group, gi) => (
        <Card key={gi}>
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-navy-700">
                <GripVertical className="h-5 w-5 text-navy-300" />
                <h3 className="text-base font-bold">
                  {isGrammar ? `Exercise ${gi + 1}` : `Group ${gi + 1}`}
                </h3>
              </div>
              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGroup(gi)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" /> Remove group
                </button>
              )}
            </div>

            <div className={cn('grid gap-4', showExplanation ? 'sm:grid-cols-1' : 'sm:grid-cols-2')}>
              <div>
                <label className={labelCls}>Question type</label>
                <select
                  className={selectCls}
                  value={group.type}
                  onChange={(e) => changeGroupType(gi, e.target.value as BuilderQuestionType)}
                >
                  {allowedTypes.map((t) => (
                    <option key={t} value={t}>
                      {track === 'SAT' && skill === 'MATH' && t === 'SHORT_ANSWER'
                        ? 'Grid-in (student types answer)'
                        : BUILDER_TYPE_META[t].label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-navy-400">{BUILDER_TYPE_META[group.type].hint}</p>
              </div>
              {!showExplanation && (
                <Input
                  label="Instruction"
                  required
                  value={group.instruction}
                  onChange={(e) => updateGroup(gi, { instruction: e.target.value })}
                  placeholder={
                    skill === 'WRITING' ? 'Task 1: Write at least 150 words.' :
                    skill === 'SPEAKING' ? 'Part 2: Speak for 1–2 minutes.' :
                    'Questions 1–5: Choose the correct letter A, B, C or D.'
                  }
                />
              )}
            </div>

            {showExplanation && (
              <div>
                <label className={labelCls}>
                  {isGrammar ? 'Grammar explanation (shown to student before questions)' : 'Theory / Explanation'}
                </label>
                <textarea
                  className={textareaCls}
                  rows={isGrammar ? 5 : 4}
                  value={group.explanation}
                  onChange={(e) => updateGroup(gi, { explanation: e.target.value })}
                  placeholder={isGrammar
                    ? 'Explain the grammar rule. E.g. Present Simple is used for habits and facts. Use DO/DOES in questions: "Do you work here?"'
                    : 'E.g. Present Simple is used for habits, facts and routines...'}
                />
              </div>
            )}

            {/* questions */}
            <div className="space-y-3">
              {group.questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-navy-100 bg-sky-50/50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-navy-400">
                      Question {qi + 1}
                    </span>
                    {group.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(gi, qi)}
                        className="text-navy-300 hover:text-red-600"
                        aria-label="Remove question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <textarea
                    className={textareaCls}
                    rows={2}
                    value={q.prompt}
                    onChange={(e) => updateQuestion(gi, qi, { prompt: e.target.value })}
                    placeholder="Question text…"
                  />

                  <input
                    className={cn(textareaCls, 'mt-2 text-sm')}
                    value={q.imageUrl}
                    onChange={(e) => updateQuestion(gi, qi, { imageUrl: e.target.value })}
                    placeholder="Image URL (optional) — Google Drive / Imgur share link"
                  />
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt="preview"
                      className="mt-2 max-h-48 w-full rounded-lg object-contain border border-navy-100"
                    />
                  )}

                  <QuestionEditor
                    group={group}
                    question={q}
                    onOption={(oi, patch) => updateOption(gi, qi, oi, patch)}
                    onAddOption={() => addOption(gi, qi)}
                    onRemoveOption={(oi) => removeOption(gi, qi, oi)}
                    onAnswerText={(v) => updateQuestion(gi, qi, { answerText: v })}
                  />

                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      className={cn(textareaCls, 'text-sm')}
                      value={q.explanation}
                      onChange={(e) => updateQuestion(gi, qi, { explanation: e.target.value })}
                      placeholder="Explanation (optional)"
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-navy-500">Points</label>
                      <input
                        type="number"
                        min={1}
                        className="w-20 rounded-lg border border-navy-200 px-2 py-1.5 text-navy-800"
                        value={q.points}
                        onChange={(e) =>
                          updateQuestion(gi, qi, { points: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="secondary" size="sm" onClick={() => addQuestion(gi)}>
              <Plus className="h-4 w-4" /> Add question
            </Button>
          </CardBody>
        </Card>
      ))}

      <Button variant="ghost" onClick={addGroup} className="border border-dashed border-navy-200">
        <Plus className="h-4 w-4" /> {isGrammar ? 'Add exercise' : 'Add question group'}
      </Button>

      {/* ---- footer / submit ---- */}
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
          <span className="font-semibold text-navy-800">{groups.length}</span> group(s)
          {!canPublish && (
            <p className="mt-0.5 text-xs text-navy-400">Submitted tests go to admin review before going live.</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {canPublish && (
            <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
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
  )
}

/* ------------------------------------------------------------------ */
/* Per-type answer editor                                              */
/* ------------------------------------------------------------------ */

function QuestionEditor({
  group,
  question,
  onOption,
  onAddOption,
  onRemoveOption,
  onAnswerText,
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
          <div key={oi} className="flex items-center gap-2">
            <input
              type={single ? 'radio' : 'checkbox'}
              checked={opt.correct}
              onChange={(e) => onOption(oi, { correct: e.target.checked })}
              className="h-4 w-4 shrink-0"
              aria-label="Mark correct"
            />
            <span className="w-5 text-sm font-semibold text-navy-400">
              {String.fromCharCode(65 + oi)}
            </span>
            <input
              className="flex-1 rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-800"
              value={opt.text}
              onChange={(e) => onOption(oi, { text: e.target.value })}
              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
            />
            {question.options.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveOption(oi)}
                className="text-navy-300 hover:text-red-600"
                aria-label="Remove option"
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

  if (group.type === 'TRUE_FALSE_NOTGIVEN') {
    return (
      <div className="mt-3">
        <label className={labelCls}>Correct answer</label>
        <select
          className={selectCls}
          value={question.answerText}
          onChange={(e) => onAnswerText(e.target.value)}
        >
          <option value="">— choose —</option>
          {TFNG_VALUES.map((v) => (
            <option key={v} value={v}>{v.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
    )
  }

  if (group.type === 'SHORT_ANSWER') {
    return (
      <div className="mt-3">
        <label className={labelCls}>Accepted answer</label>
        <input
          className="block w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-800"
          value={question.answerText}
          onChange={(e) => onAnswerText(e.target.value)}
          placeholder="answer  (alternates: color/colour)"
        />
      </div>
    )
  }

  // ESSAY / SPEAKING_PROMPT — no answer key
  return (
    <p className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-500">
      Open response — graded by a coach or AI later. No answer key needed.
    </p>
  )
}

export default TestBuilder
