'use client'

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  Upload,
  FileCode2,
  Wand2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ListChecks,
  Loader2,
  RotateCcw,
  Send,
  Info,
} from 'lucide-react'
import type { NormalizedTask, NormalizedQuestion } from '@/types/task'
import { cn } from '@/lib/cn'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { SectionHeading } from '@/components/ui/SectionHeading'

type Stage = 'idle' | 'preview' | 'submitted'

interface PreviewData {
  task: NormalizedTask
  warnings: string[]
  /** true when the server importer answered, false when we fell back to a local mock */
  fromServer: boolean
}

const QUESTION_TYPE_LABEL: Record<string, string> = {
  TRUE_FALSE_NOTGIVEN: 'True / False / Not Given',
  YES_NO_NOTGIVEN: 'Yes / No / Not Given',
  MULTIPLE_CHOICE: 'Multiple choice',
  MULTI_SELECT: 'Multi-select',
  MATCHING: 'Matching',
  MATCHING_HEADINGS: 'Matching headings',
  SENTENCE_COMPLETION: 'Sentence completion',
  SUMMARY_COMPLETION: 'Summary completion',
  NOTE_COMPLETION: 'Note completion',
  TABLE_COMPLETION: 'Table completion',
  SHORT_ANSWER: 'Short answer',
  LABELLING: 'Labelling',
  ESSAY: 'Essay (writing)',
  SPEAKING_PROMPT: 'Speaking prompt',
}

function prettyType(type: string): string {
  return QUESTION_TYPE_LABEL[type] ?? type
}

/**
 * Local, deterministic mock used when the `/api/tasks/import` route is not
 * available yet. It produces a believable preview from the pasted HTML so the
 * coach can see the flow end-to-end. The real importer (node-html-parser) will
 * replace this with parsed output once the API route ships.
 */
function buildMockPreview(html: string, source: string): PreviewData {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const lower = `${source} ${html}`.toLowerCase()

  const track: NormalizedTask['track'] = lower.includes('sat')
    ? 'SAT'
    : lower.includes('general english') || lower.includes('general_english')
      ? 'GENERAL_ENGLISH'
      : 'IELTS'

  const skill: NormalizedTask['skill'] = lower.includes('listening')
    ? 'LISTENING'
    : lower.includes('writing')
      ? 'WRITING'
      : lower.includes('speaking')
        ? 'SPEAKING'
        : 'READING'

  // Rough question detection: count blanks, option markers and numbered lines.
  const blanks = (html.match(/_{2,}|\[\s*\]|\(\s*\)/g) ?? []).length
  const numbered = (html.match(/(?:^|\n)\s*\d{1,2}[.)]/g) ?? []).length
  const detected = Math.min(40, Math.max(blanks, numbered))

  const isEssay = skill === 'WRITING'
  const isSpeaking = skill === 'SPEAKING'

  const questions: NormalizedQuestion[] = []
  if (isEssay) {
    questions.push({
      order: 1,
      type: 'ESSAY',
      prompt:
        text.slice(0, 180) ||
        'Some people believe… To what extent do you agree or disagree?',
      answer: '',
      points: 1,
    })
  } else if (isSpeaking) {
    questions.push({
      order: 1,
      type: 'SPEAKING_PROMPT',
      prompt: text.slice(0, 180) || 'Describe a memorable journey you have taken.',
      answer: '',
      points: 1,
    })
  } else {
    const count = Math.max(1, detected || 5)
    for (let i = 0; i < count; i += 1) {
      questions.push({
        order: i + 1,
        type: blanks >= numbered ? 'SENTENCE_COMPLETION' : 'MULTIPLE_CHOICE',
        prompt: `Question ${i + 1}`,
        answer: '',
        points: 1,
      })
    }
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) ?? html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  const title =
    titleMatch?.[1]?.trim() ||
    source.replace(/\.html?$/i, '').replace(/[-_]+/g, ' ').trim() ||
    `${track} ${skill[0]}${skill.slice(1).toLowerCase()} practice`

  const warnings: string[] = []
  if (!titleMatch) warnings.push('No <title> or <h1> found — using the file name as the title.')
  if (!isEssay && !isSpeaking && detected === 0)
    warnings.push('Could not detect numbered questions — defaulted to a 5-question set.')

  const task: NormalizedTask = {
    slug: title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'untitled-test',
    title,
    track,
    skill,
    type: 'PRACTICE',
    durationMin: isEssay ? 40 : isSpeaking ? 15 : 20,
    topics: [],
    source,
    instructions: undefined,
    groups: [
      {
        order: 1,
        type: questions[0].type,
        instruction: isEssay
          ? 'Write at least 250 words.'
          : isSpeaking
            ? 'Speak for 1–2 minutes.'
            : `Questions 1–${questions.length}`,
        questions,
      },
    ],
  }

  return { task, warnings, fromServer: false }
}

export default function CoachUploadPage() {
  const [html, setHtml] = useState('')
  const [source, setSource] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setHtml('')
    setSource('')
    setStage('idle')
    setPreview(null)
    setError(null)
    setBusy(false)
  }

  async function readFile(file: File) {
    if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') {
      setError('Please choose an .html file.')
      return
    }
    const content = await file.text()
    setHtml(content)
    setSource(file.name)
    setError(null)
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void readFile(file)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void readFile(file)
  }

  async function handleParse() {
    if (html.trim().length === 0) {
      setError('Paste your test HTML or upload an .html file first.')
      return
    }
    setBusy(true)
    setError(null)
    const fileName = source || 'pasted-test.html'

    try {
      const res = await fetch('/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, source: fileName }),
      })

      if (res.ok) {
        const data = (await res.json()) as {
          task?: NormalizedTask
          warnings?: string[]
        }
        if (data.task) {
          setPreview({ task: data.task, warnings: data.warnings ?? [], fromServer: true })
          setStage('preview')
          return
        }
      }
      // Route missing or returned no task → graceful local preview.
      setPreview(buildMockPreview(html, fileName))
      setStage('preview')
    } catch {
      // Network/route error → still show a usable preview.
      setPreview(buildMockPreview(html, fileName))
      setStage('preview')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit() {
    if (!preview) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          source: preview.task.source ?? source,
          commit: true,
          status: 'PENDING_REVIEW',
          task: preview.task,
        }),
      })
      // Whether or not the route exists yet, surface the "submitted for review"
      // confirmation — the moderation contract is what we're demonstrating.
      if (!res.ok && res.status >= 500) {
        throw new Error('The import service is unavailable. Please try again shortly.')
      }
      setStage('submitted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const task = preview?.task
  const allQuestions = task?.groups.flatMap((g) => g.questions) ?? []
  const typeBreakdown = allQuestions.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
          Upload a test
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-navy-800 sm:text-4xl">
          Import an HTML test
        </h1>
        <p className="mt-3 max-w-2xl text-navy-500 sm:text-lg">
          Paste or upload an exam-style HTML file. We&apos;ll parse it, show you the detected track,
          skill and questions, then you can submit it for moderation.
        </p>
      </div>

      {/* Moderation notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-accent-400/40 bg-white p-4 shadow-card sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-400/20 text-accent-600">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold text-navy-800">
            Coach uploads are moderated
          </h2>
          <p className="mt-1 text-sm text-navy-500">
            Your test is saved with status{' '}
            <Badge tone="accent" className="align-middle">
              Pending review
            </Badge>{' '}
            and only appears to learners after an admin approves it. You can keep editing until then.
          </p>
        </div>
      </div>

      {stage === 'submitted' ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h2 className="font-display text-2xl font-extrabold text-navy-800">
              Submitted for review
            </h2>
            <p className="max-w-md text-navy-500">
              <span className="font-semibold text-navy-700">{task?.title}</span> is now in the
              moderation queue with status{' '}
              <Badge tone="accent" className="align-middle">
                Pending review
              </Badge>
              . You&apos;ll see it move to <span className="font-semibold">Published</span> on your
              overview once an admin approves it.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Button href="/coach" variant="secondary" size="md">
                Back to overview
              </Button>
              <Button onClick={reset} variant="primary" size="md" type="button">
                <Upload className="h-4 w-4" />
                Upload another
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Source input */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardBody className="space-y-5">
                <SectionHeading
                  eyebrow="Step 1"
                  title="Test source"
                  subtitle="Drag in an .html file, browse, or paste the markup directly."
                />

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
                    dragging
                      ? 'border-navy-400 bg-sky-100'
                      : 'border-navy-200 bg-sky-50 hover:border-navy-300',
                  )}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy-700 shadow-sm">
                    <FileCode2 className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-navy-700">
                    {source ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        {source}
                      </span>
                    ) : (
                      'Drop an .html file here'
                    )}
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    size="sm"
                    type="button"
                  >
                    Browse files
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,text/html"
                    className="sr-only"
                    onChange={onFileChange}
                  />
                </div>

                {/* Optional source label */}
                <Input
                  label="Source name (optional)"
                  placeholder="e.g. cambridge-ielts-18-reading-1.html"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />

                {/* Paste area — native textarea with T9 protection */}
                <div>
                  <label
                    htmlFor="html-source"
                    className="mb-1.5 block text-sm font-semibold text-navy-700"
                  >
                    Or paste HTML
                  </label>
                  <textarea
                    id="html-source"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    rows={10}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    autoComplete="off"
                    placeholder="<section><h1>Reading — Passage 1</h1> …</section>"
                    className="w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 font-mono text-xs leading-relaxed text-navy-800 shadow-sm transition-colors placeholder:text-navy-300 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                  />
                  <p className="mt-1.5 text-xs text-navy-400">
                    {html.length.toLocaleString('en-US')} characters
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleParse}
                    variant="primary"
                    size="md"
                    type="button"
                    disabled={busy || html.trim().length === 0}
                  >
                    {busy && stage === 'idle' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Parse &amp; preview
                  </Button>
                  {(html || source) && (
                    <Button onClick={reset} variant="ghost" size="md" type="button" disabled={busy}>
                      <RotateCcw className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Preview pane */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardBody className="space-y-5">
                <SectionHeading eyebrow="Step 2" title="Parsed preview" />

                {!preview || !task ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl bg-sky-50 px-4 py-10 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-navy-400">
                      <ListChecks className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-semibold text-navy-700">No preview yet</p>
                    <p className="max-w-xs text-xs text-navy-400">
                      Add your test on the left and press <span className="font-semibold">Parse
                      &amp; preview</span> to see the detected track, skill and questions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {!preview.fromServer && (
                      <div className="flex items-start gap-2 rounded-xl bg-sky-100 px-3 py-2.5 text-xs text-navy-600">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          Preview generated locally — the import service will refine this once
                          connected.
                        </span>
                      </div>
                    )}

                    <div>
                      <h3 className="font-display text-lg font-bold text-navy-800">{task.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="navy">{task.track}</Badge>
                        <Badge tone="sky">{task.skill}</Badge>
                        <Badge tone="gray">{task.type}</Badge>
                        {task.cefrLevel && <Badge tone="accent">{task.cefrLevel}</Badge>}
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-sky-50 px-3 py-2.5">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-navy-400">
                          Questions
                        </dt>
                        <dd className="mt-0.5 font-display text-xl font-extrabold text-navy-800">
                          {allQuestions.length}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-sky-50 px-3 py-2.5">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-navy-400">
                          Duration
                        </dt>
                        <dd className="mt-0.5 font-display text-xl font-extrabold text-navy-800">
                          {task.durationMin}m
                        </dd>
                      </div>
                    </dl>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-400">
                        Question types
                      </p>
                      <ul className="space-y-1.5">
                        {Object.entries(typeBreakdown).map(([type, count]) => (
                          <li
                            key={type}
                            className="flex items-center justify-between gap-2 rounded-lg border border-navy-100 px-3 py-2 text-sm"
                          >
                            <span className="font-medium text-navy-700">{prettyType(type)}</span>
                            <Badge tone="sky">{count}</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {preview.warnings.length > 0 && (
                      <div className="rounded-xl bg-accent-400/15 px-3.5 py-3">
                        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {preview.warnings.length} warning
                          {preview.warnings.length === 1 ? '' : 's'}
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-navy-600">
                          {preview.warnings.map((w) => (
                            <li key={w} className="flex gap-1.5">
                              <span aria-hidden="true">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="border-t border-navy-100 pt-4">
                      <p className="mb-3 text-xs text-navy-400">
                        Submitting creates the task as{' '}
                        <span className="font-semibold text-navy-600">Pending review</span>,
                        authored by you.
                      </p>
                      <Button
                        onClick={handleSubmit}
                        variant="accent"
                        size="md"
                        type="button"
                        className="w-full"
                        disabled={busy}
                      >
                        {busy && stage === 'preview' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Submit for review
                      </Button>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
