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

export function MetricCard({
  icon: Icon,
  label,
  tone = 'default',
  value,
}: MetricCardProps) {
  return (
    <article className="min-h-[132px] rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        <p className="text-xs font-medium uppercase leading-5 tracking-[0.08em]">
          {label}
        </p>
      </div>
      <p className={cn('mt-4 text-2xl font-semibold tracking-tight', valueTone[tone])}>
        {value}
      </p>
    </article>
  )
}
