import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import type { Availability } from '@/components/AvailabilityBadge'
import { cn } from '@/utils'

export type TeamMember = {
  id?: string
  availability: Availability
  activeJobCount?: number
  completedJobCount?: number
  completedJobs?: string
  currentJobs?: string
  initials: string
  name: string
  role: string
  skills: string[]
  onSchedule?: () => void
}

const dotClass: Record<Availability, string> = {
  Available: 'bg-wf-done',
  Busy: 'bg-wf-ink-3',
  'On Leave': 'bg-wf-warn',
}

export function TeamMemberCard({
  availability,
  activeJobCount,
  completedJobCount,
  completedJobs,
  currentJobs,
  initials,
  name,
  role,
  skills,
  onSchedule,
}: TeamMember) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isOnLeave = availability === 'On Leave'

  useEffect(() => {
    if (!isMenuOpen) return undefined
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isMenuOpen])

  // Derive counts from numeric props or legacy string props
  const activeCount =
    typeof activeJobCount === 'number'
      ? activeJobCount
      : parseInt(currentJobs ?? '0', 10) || 0
  const completedCount =
    typeof completedJobCount === 'number'
      ? completedJobCount
      : parseInt(completedJobs ?? '0', 10) || 0

  return (
    <article className="h-14 min-h-[56px] border-b border-wf-separator px-4 py-2.5 last:border-b-0 hover:bg-wf-surface-sunken transition-colors flex items-center justify-between gap-4">
      {/* Name, 8px dot & Role */}
      <div className="flex min-w-0 items-center gap-3 flex-1">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-control bg-wf-surface-sunken text-xs font-semibold text-wf-ink">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn('size-2 rounded-full shrink-0', dotClass[availability])}
            />
            <h2 className="truncate text-[15px] font-semibold leading-[20px] text-wf-ink">
              {name}
            </h2>
            <span className="text-[13px] font-normal leading-[18px] text-wf-ink-3">
              ({availability === 'On Leave' ? 'On leave' : availability})
            </span>
          </div>
          <p className="truncate text-[12px] font-normal leading-[16px] text-wf-ink-3">
            {role}
          </p>
        </div>
      </div>

      {/* Workload line: 2 active, 1 completed */}
      <div className="hidden sm:block shrink-0 min-w-[160px]">
        <p className="text-[13px] font-normal leading-[18px] text-wf-ink-2 tabular-nums">
          {activeCount} active, {completedCount} completed
        </p>
      </div>

      {/* Skills chips */}
      <div className="hidden lg:flex items-center gap-1.5 shrink-0">
        {skills.slice(0, 2).map((skill) => (
          <span
            className="rounded-control border border-wf-border bg-wf-surface-sunken px-2 py-0.5 text-[12px] font-normal text-wf-ink-2"
            key={skill}
          >
            {skill}
          </span>
        ))}
        {skills.length > 2 && (
          <span className="rounded-control bg-wf-surface-sunken px-1.5 py-0.5 text-[11px] font-normal text-wf-ink-3">
            +{skills.length - 2} more
          </span>
        )}
      </div>

      {/* Actions: Schedule button + Overflow menu */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          className={cn(
            'inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors focus:outline-none focus:ring-2 focus:ring-wf-accent/30',
            isOnLeave
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-wf-surface-sunken hover:text-wf-accent',
          )}
          disabled={isOnLeave}
          onClick={onSchedule}
          type="button"
        >
          Schedule
        </button>

        <div className="relative" ref={menuRef}>
          <button
            aria-label={`More options for ${name}`}
            className="inline-flex size-8 items-center justify-center rounded-control text-wf-ink-3 transition-colors hover:bg-wf-surface-sunken hover:text-wf-ink focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            type="button"
          >
            <MoreVertical aria-hidden="true" className="size-4" />
          </button>

          {isMenuOpen ? (
            <div
              className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-sheet border border-wf-border bg-wf-surface p-1 shadow-card space-y-0.5 text-[13px] font-medium text-wf-ink-2"
              role="menu"
            >
              <button
                className="flex w-full items-center rounded-control px-2.5 py-1.5 text-left hover:bg-wf-surface-sunken hover:text-wf-ink transition-colors"
                onClick={() => {
                  setIsMenuOpen(false)
                  onSchedule?.()
                }}
                role="menuitem"
                type="button"
              >
                Assign job
              </button>
              <button
                className="flex w-full items-center rounded-control px-2.5 py-1.5 text-left hover:bg-wf-surface-sunken hover:text-wf-ink transition-colors"
                onClick={() => {
                  setIsMenuOpen(false)
                  void navigator.clipboard.writeText(`${name} - ${role}`)
                }}
                role="menuitem"
                type="button"
              >
                Copy profile info
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

