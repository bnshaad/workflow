import { Check, ShieldCheck, Star, UserPlus } from 'lucide-react'
import { filterHumanExplanationReasons } from '@/utils'

type SuggestedWorkerCardProps = {
  matchScore: number
  name: string
  reasons: string[]
  role: string
  confidenceBucket?: 'High' | 'Medium' | 'Low'
  onAccept?: () => void
  onChooseAnother?: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function SuggestedWorkerCard({
  matchScore,
  name,
  reasons,
  role,
  confidenceBucket = 'High',
  onAccept,
  onChooseAnother,
}: SuggestedWorkerCardProps) {
  const cleanReasons = filterHumanExplanationReasons(reasons)
  const displayPct = Math.round(matchScore <= 1 ? matchScore * 100 : matchScore)

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-2xs">
      <div className="h-1 w-full bg-primary" />

      <div className="grid gap-0 md:grid-cols-[1fr_160px]">
        <div className="flex items-center gap-4 p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
            {getInitials(name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                <Star aria-hidden="true" className="size-3" />
                Top Recommendation
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                {confidenceBucket} Confidence
              </span>
            </div>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              {name}
              <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{role}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center border-t border-primary/10 bg-primary/5 p-5 text-center md:border-l md:border-t-0">
          <p className="text-3xl font-extrabold tracking-tight text-primary">
            {displayPct}%
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Match Fit
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-border/80 bg-muted/20 p-4.5 sm:grid-cols-2 lg:grid-cols-3">
        {cleanReasons.map((reason) => (
          <div className="flex items-center gap-2 text-xs font-medium text-foreground" key={reason}>
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Check aria-hidden="true" className="size-3" />
            </span>
            {reason}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-border/80 bg-card p-4 sm:flex-row sm:justify-end">
        <button
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border/80 bg-card px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          onClick={onChooseAnother}
          type="button"
        >
          Choose Another Worker
        </button>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
          onClick={onAccept}
          type="button"
        >
          <UserPlus aria-hidden="true" className="size-4" />
          Assign Worker
        </button>
      </div>
    </section>
  )
}

