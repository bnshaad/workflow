import { cn } from '@/utils'

type TimelineItem = {
  state: 'done' | 'pending' | 'current'
  time: string
  title: string
}

type TimelineProps = {
  items: TimelineItem[]
}

const dotClass = {
  current: 'bg-primary ring-primary/10',
  done: 'bg-emerald-500 ring-emerald-500/10',
  pending: 'border-2 border-border bg-card ring-card',
}

export function Timeline({ items }: TimelineProps) {
  return (
    <section className="border-t border-border pt-4">
      <h2 className="text-base font-semibold text-foreground">Timeline</h2>
      <div className="relative ml-3 mt-4 space-y-4 border-l-2 border-border">
        {items.map((item) => (
          <div
            className={cn('relative pl-5', item.state === 'pending' && 'opacity-55')}
            key={item.title}
          >
            <span
              className={cn(
                'absolute -left-[9px] top-1 size-4 rounded-full ring-4',
                dotClass[item.state],
              )}
            />
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.time}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
