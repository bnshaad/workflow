import { cn } from '@/utils'

export type StatusBadgeTone = 'danger' | 'default' | 'primary' | 'success' | 'warning'

export interface StatusBadgeProps {
  children: string
  tone?: StatusBadgeTone
  className?: string
}

const toneClass: Record<StatusBadgeTone, string> = {
  // Exceptional states take semantic colour
  danger: 'border-wf-danger/20 bg-wf-danger-wash text-wf-danger',
  success: 'border-wf-done/20 bg-wf-surface-sunken text-wf-done',
  // Non-exceptional states are neutral by default per Section 3
  default: 'border-wf-border bg-wf-surface-sunken text-wf-ink-2',
  primary: 'border-wf-border bg-wf-surface-sunken text-wf-ink-2',
  warning: 'border-wf-border bg-wf-surface-sunken text-wf-ink-2',
}

export function StatusBadge({ children, tone = 'default', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-control border px-2.5 py-0.5 text-[12px] font-medium leading-4 tracking-tight',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
