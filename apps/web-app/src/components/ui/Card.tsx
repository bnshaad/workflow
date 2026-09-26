import type { HTMLAttributes } from 'react'
import { cn } from '@/utils'

export type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-wf-border bg-wf-surface p-4 shadow-card',
        className,
      )}
      {...props}
    />
  )
}
