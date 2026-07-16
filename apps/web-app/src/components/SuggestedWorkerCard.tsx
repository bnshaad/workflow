import { Check, ShieldCheck, Star, UserPlus } from 'lucide-react'

type SuggestedWorkerCardProps = {
  matchScore: number
  name: string
  reasons: string[]
  role: string
}

export function SuggestedWorkerCard({
  matchScore,
  name,
  reasons,
  role,
}: SuggestedWorkerCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-border border-l-2 border-l-primary bg-card">
      <div className="grid gap-0 md:grid-cols-[1fr_160px]">
        <div className="flex items-center gap-4 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold text-foreground">
            AR
          </div>
          <div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <Star aria-hidden="true" className="size-3.5" />
              Suggested Worker
            </span>
            <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
              {name}
              <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{role}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center border-t border-border bg-background p-4 text-center md:border-l md:border-t-0">
          <p className="text-3xl font-semibold tracking-tight text-emerald-500">
            {matchScore}%
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Best Match
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-border bg-background/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {reasons.map((reason) => (
          <div className="flex items-center gap-2 text-sm text-foreground" key={reason}>
            <Check aria-hidden="true" className="size-4 text-emerald-500" />
            {reason}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-border bg-card p-4 sm:flex-row sm:justify-end">
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          type="button"
        >
          Choose Another Worker
        </button>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          type="button"
        >
          <UserPlus aria-hidden="true" className="size-4" />
          Assign Worker
        </button>
      </div>
    </section>
  )
}
