import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/utils'

export interface EmptyStateProps {
  action?: ReactNode
  className?: string
  description?: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  title: string
}

export function EmptyState({
  action,
  className,
  description,
  icon: Icon = Inbox,
  title,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-wf-border bg-wf-surface px-6 py-10 text-center shadow-card',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-wf-surface-sunken text-wf-ink-3">
        <Icon aria-hidden="true" className="size-6 shrink-0" />
      </div>
      <h3 className="mt-4 text-[17px] font-semibold leading-[24px] text-wf-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[15px] font-normal leading-[20px] text-wf-ink-2">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
