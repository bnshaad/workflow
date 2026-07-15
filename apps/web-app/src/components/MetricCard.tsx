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
  danger: 'bg-destructive/10 text-destructive',
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600',
}

export function MetricCard({
  icon: Icon,
  label,
  tone = 'default',
  value,
}: MetricCardProps) {
  return (
    <article className="group rounded-xl border border-border bg-card p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase leading-5 tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
            iconTone[tone],
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p
        className={cn(
          'mt-3 text-3xl font-semibold leading-9 tracking-[-0.03em]',
          valueTone[tone],
        )}
      >
        {value}
      </p>
    </article>
  )
}
