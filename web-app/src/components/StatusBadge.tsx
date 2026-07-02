import { cn } from '@/utils'

type StatusBadgeProps = {
  children: string
  tone?: 'default' | 'primary' | 'success' | 'warning'
}

const toneClass = {
  default: 'border-border bg-muted text-foreground',
  primary: 'border-primary/20 bg-primary/10 text-primary',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
}

export function StatusBadge({ children, tone = 'default' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium',
        toneClass[tone],
      )}
    >
      {children}
    </span>
  )
}
