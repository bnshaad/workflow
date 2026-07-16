import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/utils'

type RecentActivityItemProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  meta: string
  text: string
  tone?: 'default' | 'primary' | 'success' | 'danger'
}

const iconTone = {
  danger: 'text-destructive',
  default: 'text-muted-foreground',
  primary: 'text-primary',
  success: 'text-emerald-500',
}

export function RecentActivityItem({
  icon: Icon,
  meta,
  text,
  tone = 'default',
}: RecentActivityItemProps) {
  return (
    <div className="relative">
      <span className="absolute -left-[29px] z-10 flex size-6 items-center justify-center rounded-full border border-border bg-card">
        <Icon aria-hidden="true" className={cn('size-3.5', iconTone[tone])} />
      </span>
      <p className="text-sm leading-5 text-foreground">{text}</p>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">{meta}</p>
    </div>
  )
}
