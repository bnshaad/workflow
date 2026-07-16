import { MoreVertical } from 'lucide-react'
import {
  AvailabilityBadge,
  type Availability,
} from '@/components/AvailabilityBadge'
import { cn } from '@/utils'

export type TeamMember = {
  availability: Availability
  completedJobs: string
  currentJobs: string
  initials: string
  name: string
  role: string
  skills: string[]
}

const statusDotClass = {
  Available: 'bg-emerald-500',
  Busy: 'bg-primary',
  'On Leave': 'bg-amber-500',
}

export function TeamMemberCard({
  availability,
  completedJobs,
  currentJobs,
  initials,
  name,
  role,
  skills,
}: TeamMember) {
  const isOnLeave = availability === 'On Leave'

  return (
    <article className="border-b border-border bg-card px-3 py-3 last:border-b-0 hover:bg-background/70">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold text-foreground">
              {initials}
            </div>
            <span
              className={cn(
                'absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-card',
                statusDotClass[availability],
              )}
            />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
              {name}
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {role}
            </p>
          </div>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-[140px_140px]">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
              Current
            </p>
            <p className={cn('font-medium', availability === 'Busy' ? 'text-primary' : 'text-foreground')}>
              {currentJobs}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
              Completed
            </p>
            <p className="font-medium text-foreground">{completedJobs}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="hidden flex-wrap gap-1.5 xl:flex">
            {skills.map((skill) => (
              <span
                className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                key={skill}
              >
                {skill}
              </span>
            ))}
          </div>
          <AvailabilityBadge availability={availability} />
          <button
            className={cn(
              'text-sm font-medium',
              isOnLeave ? 'text-muted-foreground' : 'text-primary transition hover:text-primary/80',
            )}
            disabled={isOnLeave}
            type="button"
          >
            {isOnLeave ? 'On Leave' : 'Schedule'}
          </button>
          <button
            aria-label={`More actions for ${name}`}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            type="button"
          >
            <MoreVertical aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </article>
  )
}
