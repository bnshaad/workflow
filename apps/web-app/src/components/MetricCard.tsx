import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/utils'

export interface MetricCardProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  tone?: 'default' | 'primary' | 'success' | 'danger'
  value: string
  className?: string
}

export function MetricCard({
  icon: Icon,
  label,
  tone = 'default',
  value,
  className,
}: MetricCardProps) {
  // Only Needs Attention with value > 0 renders in danger; otherwise neutral ink per Section 9.3
  const isExceptionalDanger = tone === 'danger' && value !== '0' && value !== ''

  return (
    <article
      className={cn(
        'min-w-0 rounded-card border border-wf-border bg-wf-surface p-4 shadow-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-normal leading-[18px] text-wf-ink-3">
          {label}
        </p>
        {Icon ? (
          <span className="text-wf-ink-3 shrink-0">
            <Icon aria-hidden="true" className="size-4" />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-2 text-[28px] font-semibold leading-[34px] tracking-tight tabular-nums',
          isExceptionalDanger ? 'text-wf-danger' : 'text-wf-ink',
        )}
      >
        {value}
      </p>
    </article>
  )
}
