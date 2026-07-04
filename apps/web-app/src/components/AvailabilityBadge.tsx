import { cn } from '@/utils'

export type Availability = 'Available' | 'Busy' | 'On Leave'

type AvailabilityBadgeProps = {
  availability: Availability
}

const availabilityClass = {
  Available: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
  Busy: 'border-primary/20 bg-primary/10 text-primary',
  'On Leave': 'border-amber-500/20 bg-amber-500/10 text-amber-700',
}

const dotClass = {
  Available: 'bg-emerald-500',
  Busy: 'bg-primary',
  'On Leave': 'bg-amber-500',
}

export function AvailabilityBadge({ availability }: AvailabilityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]',
        availabilityClass[availability],
      )}
    >
      <span className={cn('size-2 rounded-full', dotClass[availability])} />
      {availability}
    </span>
  )
}
