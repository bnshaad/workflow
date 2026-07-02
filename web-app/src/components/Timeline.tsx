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
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Timeline</h2>
      <div className="relative ml-3 mt-7 space-y-7 border-l-2 border-border">
        {items.map((item) => (
          <div
            className={cn('relative pl-7', item.state === 'pending' && 'opacity-55')}
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
