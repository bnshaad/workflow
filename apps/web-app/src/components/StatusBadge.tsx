import { cn } from '@/utils'

type StatusBadgeProps = {
  children: string
  tone?: 'danger' | 'default' | 'primary' | 'success' | 'warning'
}

const toneClass = {
  danger: 'border-rose-500/20 bg-rose-50 text-rose-700',
  default: 'border-border bg-muted/60 text-muted-foreground',
  primary: 'border-blue-500/20 bg-blue-50 text-blue-700',
  success: 'border-emerald-500/20 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-500/25 bg-amber-50 text-amber-800',
}

export function StatusBadge({ children, tone = 'default' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold leading-4 tracking-tight',
        toneClass[tone],
      )}
    >
      {children}
    </span>
  )
}
