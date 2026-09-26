import { cn } from '@/utils'
import type { JobPriority } from '@/types'

export interface PriorityBadgeProps {
  priority: JobPriority | string
  className?: string
  showLowMedium?: boolean
  showDot?: boolean
}

export function PriorityBadge({
  priority,
  className,
  showLowMedium = true,
  showDot = true,
}: PriorityBadgeProps) {
  if (priority === 'Urgent') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-[13px] font-medium text-wf-danger',
          className,
        )}
      >
        {showDot ? <span aria-hidden="true" className="size-2 rounded-full bg-wf-danger shrink-0" /> : null}
        <span>Urgent</span>
      </span>
    )
  }

  if (priority === 'High') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-[13px] font-medium text-wf-warn',
          className,
        )}
      >
        {showDot ? <span aria-hidden="true" className="size-2 rounded-full bg-wf-warn shrink-0" /> : null}
        <span>High</span>
      </span>
    )
  }

  if (!showLowMedium) {
    return null
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-normal text-wf-ink-3',
        className,
      )}
    >
      {showDot ? <span aria-hidden="true" className="size-2 rounded-full bg-wf-ink-3 shrink-0" /> : null}
      <span>{priority}</span>
    </span>
  )
}
