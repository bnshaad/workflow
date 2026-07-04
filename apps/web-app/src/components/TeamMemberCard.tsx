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
    <article className="flex min-h-[320px] flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="relative">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-secondary text-base font-semibold text-secondary-foreground">
            {initials}
          </div>
          <span
            className={cn(
              'absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-card',
              statusDotClass[availability],
            )}
          />
        </div>
        <AvailabilityBadge availability={availability} />
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{role}</p>
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Current Jobs</dt>
          <dd className={cn('font-medium', availability === 'Busy' ? 'text-primary' : 'text-foreground')}>
            {currentJobs}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Completed Jobs</dt>
          <dd className="font-medium text-foreground">{completedJobs}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            className="rounded-md border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            key={skill}
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-5">
        <button
          className={cn(
            'text-sm font-medium',
            isOnLeave ? 'text-muted-foreground' : 'text-primary transition hover:text-primary/80',
          )}
          disabled={isOnLeave}
          type="button"
        >
          {isOnLeave ? 'On Leave' : 'View Schedule'}
        </button>
        <button
          aria-label={`More actions for ${name}`}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          type="button"
        >
          <MoreVertical aria-hidden="true" className="size-4" />
        </button>
      </div>
    </article>
  )
}
