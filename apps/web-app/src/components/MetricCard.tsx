import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/utils'

type MetricCardProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  tone?: 'default' | 'primary' | 'success' | 'danger'
  value: string
}

const valueTone = {
  danger: 'text-rose-600',
  default: 'text-foreground',
  primary: 'text-blue-600',
  success: 'text-emerald-600',
}

const iconTone = {
  danger: 'text-rose-600 bg-rose-50',
  default: 'text-muted-foreground bg-muted',
  primary: 'text-blue-600 bg-blue-50',
  success: 'text-emerald-600 bg-emerald-50',
}

export function MetricCard({
  icon: Icon,
  label,
  tone = 'default',
  value,
}: MetricCardProps) {
  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-lg', iconTone[tone])}>
          <Icon aria-hidden="true" className="size-3.5" />
        </span>
      </div>
      <p
        className={cn(
          'mt-3 text-2xl font-bold tracking-tight',
          valueTone[tone],
        )}
      >
        {value}
      </p>
    </article>
  )
}
