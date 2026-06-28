import {
  Headphones,
  BookOpen,
  Mic,
  PenLine,
  Clock,
  ListChecks,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

type Skill = 'LISTENING' | 'READING' | 'SPEAKING' | 'WRITING' | 'MATH'
type Track = 'IELTS' | 'SAT' | 'GENERAL_ENGLISH' | 'CEFR' | 'MULTILEVEL'

export interface TaskRowProps {
  /** Task id — the row links to /test/[id]. */
  id: string
  title: string
  track: Track
  skill: Skill
  /** CEFR level or band label, e.g. "B2" or "Band 6–8". Optional. */
  level?: string | null
  durationMin: number
  /** Number of questions in the task, when known. */
  questionCount?: number | null
  className?: string
}

const SKILL_ICON: Record<Skill, LucideIcon> = {
  LISTENING: Headphones,
  READING: BookOpen,
  SPEAKING: Mic,
  WRITING: PenLine,
  MATH: ListChecks,
}

const SKILL_LABEL: Record<Skill, string> = {
  LISTENING: 'Listening',
  READING: 'Reading',
  SPEAKING: 'Speaking',
  WRITING: 'Writing',
  MATH: 'Math',
}

/** A single task as a tappable list row, linking to the test player. */
export function TaskRow({
  id,
  title,
  track,
  skill,
  level,
  durationMin,
  questionCount,
  className,
}: TaskRowProps) {
  const Icon = SKILL_ICON[skill]

  return (
    <Card hover href={`/test/${id}`} className={cn('group', className)}>
      <CardBody className="flex items-center gap-4 p-4 sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-navy-700 transition-colors group-hover:bg-sky-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="navy">{track}</Badge>
            <Badge tone="sky">{SKILL_LABEL[skill]}</Badge>
            {level ? <Badge tone="gray">{level}</Badge> : null}
          </div>
          <p className="truncate font-display text-base font-bold text-navy-800">{title}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-navy-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {durationMin} min
            </span>
            {typeof questionCount === 'number' ? (
              <span className="inline-flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" /> {questionCount} questions
              </span>
            ) : null}
          </div>
        </div>

        <ChevronRight
          className="h-5 w-5 shrink-0 text-navy-300 transition-transform group-hover:translate-x-0.5 group-hover:text-navy-600"
          aria-hidden="true"
        />
      </CardBody>
    </Card>
  )
}

export default TaskRow
