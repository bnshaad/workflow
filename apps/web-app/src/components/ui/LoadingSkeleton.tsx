import { cn } from '@/utils'

export type LoadingSkeletonProps = {
  className?: string
  variant?: 'card' | 'circle' | 'line' | 'table-row'
  count?: number
}

export function LoadingSkeleton({
  className,
  variant = 'line',
  count = 1,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count })

  return (
    <>
      {items.map((_, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse rounded-lg bg-muted/60',
            variant === 'line' && 'h-4 w-full',
            variant === 'circle' && 'size-10 rounded-full',
            variant === 'card' && 'h-24 w-full rounded-xl border border-border/60 p-4',
            variant === 'table-row' && 'h-12 w-full border-b border-border/40',
            className,
          )}
          aria-hidden="true"
        />
      ))}
    </>
  )
}
