import type { ReactNode } from 'react'
import { cn } from '@/utils'

export type ChipVariant = 'neutral' | 'accent' | 'danger' | 'warn' | 'done'

export interface ChipProps {
  children: ReactNode
  variant?: ChipVariant
  className?: string
}

export function Chip({ children, variant = 'neutral', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-control px-2.5 py-0.5 text-[13px] font-normal leading-[18px]',
        variant === 'neutral' &&
          'border border-wf-border bg-wf-surface-sunken text-wf-ink-2',
        variant === 'accent' &&
          'border border-transparent bg-wf-accent-wash text-wf-accent font-medium',
        variant === 'danger' &&
          'border border-transparent bg-wf-danger-wash text-wf-danger font-medium',
        variant === 'warn' &&
          'border border-transparent bg-amber-50 text-wf-warn font-medium',
        variant === 'done' &&
          'border border-transparent bg-wf-surface-sunken text-wf-done font-medium',
        className,
      )}
    >
      {children}
    </span>
  )
}
