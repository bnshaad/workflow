import { cn } from '@/utils'

export type Availability = 'Available' | 'Busy' | 'On Leave'

export interface AvailabilityBadgeProps {
  availability: Availability
  className?: string
}

const dotClass: Record<Availability, string> = {
  Available: 'bg-wf-done',
  Busy: 'bg-wf-ink-3',
  'On Leave': 'bg-wf-warn',
}

const textClass: Record<Availability, string> = {
  Available: 'text-wf-ink-2',
  Busy: 'text-wf-ink-3',
  'On Leave': 'text-wf-warn',
}

export function AvailabilityBadge({ availability, className }: AvailabilityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium leading-[18px]',
        textClass[availability],
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-2 rounded-full shrink-0', dotClass[availability])} />
      <span>{availability}</span>
    </span>
  )
}
