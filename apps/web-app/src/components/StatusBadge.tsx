import { cn } from '@/utils'

type StatusBadgeProps = {
  children: string
  tone?: 'danger' | 'default' | 'primary' | 'success' | 'warning'
}

const toneClass = {
  danger: 'border-destructive/20 bg-destructive/10 text-destructive',
  default: 'border-border bg-muted text-foreground',
  primary: 'border-primary/20 bg-primary/10 text-primary',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
}

export function StatusBadge({ children, tone = 'default' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-md border px-2.5 py-0.5 text-xs font-medium leading-4',
        toneClass[tone],
      )}
    >
      {children}
    </span>
  )
}
