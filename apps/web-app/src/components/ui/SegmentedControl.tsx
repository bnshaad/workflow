import { cn } from '@/utils'

export type SegmentOption<T extends string> = {
  id: T
  label: string
  count?: number
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center rounded-full border border-wf-border bg-wf-surface-raised p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = option.id === value
        return (
          <button
            key={option.id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(option.id)}
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[13px] font-medium leading-[18px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wf-accent',
              isSelected
                ? 'bg-wf-surface text-wf-ink shadow-xs'
                : 'text-wf-ink-2 hover:text-wf-ink',
            )}
          >
            <span>{option.label}</span>
            {typeof option.count === 'number' ? (
              <span
                className={cn(
                  'text-[12px] tabular-nums',
                  isSelected ? 'text-wf-ink' : 'text-wf-ink-3',
                )}
              >
                ({option.count})
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
