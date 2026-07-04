import { AlertTriangle } from 'lucide-react'
import { cn } from '@/utils'

type IssueCardProps = {
  description: string
  tone?: 'primary' | 'warning'
  title: string
}

const issueTone = {
  primary: 'border-primary/20 bg-primary/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
}

export function IssueCard({ description, tone = 'warning', title }: IssueCardProps) {
  return (
    <article className={cn('rounded-lg border p-4', issueTone[tone])}>
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className={cn(
            'mt-0.5 size-4 shrink-0',
            tone === 'warning' ? 'text-amber-500' : 'text-primary',
          )}
        />
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
    </article>
  )
}
