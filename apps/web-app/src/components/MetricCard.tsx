import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/utils'

type MetricCardProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  tone?: 'default' | 'primary' | 'success' | 'danger'
  value: string
}

const valueTone = {
  danger: 'text-destructive',
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-500',
}

const iconTone = {
  danger: 'text-destructive',
  default: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-emerald-600',
}

export function MetricCard({
  icon: Icon,
  label,
  tone = 'default',
  value,
}: MetricCardProps) {
  return (
    <article className="min-w-0 bg-card p-3 sm:p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase leading-5 tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <span className={cn('inline-flex shrink-0 items-center', iconTone[tone])}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p
        className={cn(
          'mt-2 text-[1.75rem] font-semibold leading-8 tracking-[-0.03em]',
          valueTone[tone],
        )}
      >
        {value}
      </p>
    </article>
  )
}
