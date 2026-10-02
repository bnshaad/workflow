import { useEffect, useState } from 'react'
import {
  Clock,
  Loader2,
  MapPin,
  Phone,
  Smartphone,
  User,
} from 'lucide-react'
import { PriorityBadge } from '@/components'
import { useAuth } from '@/hooks'
import { whatsappDemoService } from '@/services/whatsapp/whatsappDemoService'
import type { ProposedAction, ProposedCreateJobPayload } from '@/types'
import { cn } from '@/utils'

type RequestsTabProps = {
  onOpenSimulator: () => void
  onSelectProposal: (proposal: ProposedAction<ProposedCreateJobPayload>) => void
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'rejected'

export function RequestsTab({ onOpenSimulator, onSelectProposal }: RequestsTabProps) {
  const { profile } = useAuth()
  const [proposals, setProposals] = useState<ProposedAction<ProposedCreateJobPayload>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    let isMounted = true
    async function load() {
      if (!profile) return
      setIsLoading(true)
      try {
        const list = await whatsappDemoService.listWhatsAppProposals(profile)
        if (isMounted) setProposals(list)
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Failed to load WhatsApp requests.',
          )
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void load()

    const unsubscribe = profile
      ? whatsappDemoService.subscribeProposals(profile.organizationId, () => {
          void load()
        })
      : () => {}

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [profile])

  const filtered = proposals.filter((p) => {
    const threadState = p.whatsappMetadata?.threadState || 'pending_review'
    if (statusFilter === 'pending') {
      return threadState === 'pending_review' || threadState === 'collecting' || threadState === 'drafting'
    }
    if (statusFilter === 'confirmed') {
      return threadState === 'confirmed' || p.status === 'completed'
    }
    if (statusFilter === 'rejected') {
      return threadState === 'rejected' || threadState === 'spam' || p.status === 'cancelled'
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Subheader & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-wf-separator pb-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-wf-border bg-wf-surface p-1">
            <button
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                statusFilter === 'all'
                  ? 'bg-wf-ink text-white shadow-sm'
                  : 'text-wf-ink-3 hover:text-wf-ink',
              )}
              onClick={() => setStatusFilter('all')}
              type="button"
            >
              All Requests ({proposals.length})
            </button>
            <button
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                statusFilter === 'pending'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-wf-ink-3 hover:text-wf-ink',
              )}
              onClick={() => setStatusFilter('pending')}
              type="button"
            >
              Pending Review (
              {
                proposals.filter(
                  (p) =>
                    p.whatsappMetadata?.threadState === 'pending_review' ||
                    p.whatsappMetadata?.threadState === 'drafting',
                ).length
              }
              )
            </button>
            <button
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                statusFilter === 'confirmed'
                  ? 'bg-wf-ink text-white shadow-sm'
                  : 'text-wf-ink-3 hover:text-wf-ink',
              )}
              onClick={() => setStatusFilter('confirmed')}
              type="button"
            >
              Confirmed
            </button>
            <button
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                statusFilter === 'rejected'
                  ? 'bg-wf-ink text-white shadow-sm'
                  : 'text-wf-ink-3 hover:text-wf-ink',
              )}
              onClick={() => setStatusFilter('rejected')}
              type="button"
            >
              Declined
            </button>
          </div>
        </div>

        {proposals.length > 0 ? (
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-wf-border bg-wf-surface px-3 text-xs font-medium text-wf-ink shadow-card transition-colors hover:bg-wf-surface-sunken"
              onClick={onOpenSimulator}
              type="button"
            >
              <Smartphone className="size-3.5 text-emerald-700" />
              <span>Launch WhatsApp Simulator</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-wf-border bg-wf-surface">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-emerald-600" />
            <span className="text-xs text-wf-ink-3">Loading WhatsApp requests...</span>
          </div>
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {errorMessage}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-wf-border bg-wf-surface p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mb-3">
            <Smartphone className="size-6" />
          </div>
          <h3 className="text-sm font-semibold text-wf-ink">No WhatsApp requests found</h3>
          <p className="mt-1 text-xs text-wf-ink-3 max-w-sm">
            Launch the phone simulator to send a realistic WhatsApp message and see Gemini AI extract fields and prepare Smart Match recommendations.
          </p>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-control bg-wf-ink px-4 py-2 text-xs font-semibold text-white shadow-card transition-colors hover:bg-wf-ink/90"
            onClick={onOpenSimulator}
            type="button"
          >
            <Smartphone className="size-3.5" />
            <span>Launch WhatsApp Simulator</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => {
            const meta = item.whatsappMetadata
            const threadState = meta?.threadState || 'pending_review'
            const refCode = item.proposalId.slice(-6).toUpperCase()

            return (
              <div
                key={item.proposalId}
                className="group relative flex flex-col justify-between gap-4 rounded-xl border border-wf-border bg-wf-surface p-4 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      #W-{refCode}
                    </span>
                    <h4 className="text-sm font-semibold text-wf-ink group-hover:text-emerald-950">
                      {item.payload.title}
                    </h4>
                    <PriorityBadge priority={item.payload.priority} />
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[10px] font-bold capitalize',
                        threadState === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : threadState === 'rejected' || threadState === 'spam'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800',
                      )}
                    >
                      {threadState.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-wf-ink-3 line-clamp-1">
                    "{item.payload.description}"
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-wf-ink-3 flex-wrap pt-0.5">
                    <span className="flex items-center gap-1 font-medium text-wf-ink">
                      <User className="size-3 text-wf-ink-4" />
                      <span>{item.payload.customerName}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="size-3 text-wf-ink-4" />
                      <span>{item.payload.customerPhone}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-wf-ink-4" />
                      <span>{item.payload.location}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-wf-ink-4" />
                      <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    {item.payload.requiredSkills.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-wf-surface-raised border border-wf-separator px-1.5 py-0.5 text-[10px] font-medium text-wf-ink-2"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-wf-surface-raised border border-wf-border px-3.5 py-2 text-xs font-semibold text-wf-ink shadow-sm transition-colors hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                    onClick={() => onSelectProposal(item)}
                    type="button"
                  >
                    <span>Review Request</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
