import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  UserCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { JOB_PRIORITY_OPTIONS } from '@/constants/jobConstants'
import { useAuth } from '@/hooks'
import { jobService } from '@/services/jobs'
import { whatsappDemoService } from '@/services/whatsapp/whatsappDemoService'
import type {
  JobPriority,
  ProposedAction,
  ProposedCreateJobPayload,
} from '@/types'
import {
  rankAssignmentCandidates,
  type RankedAssignmentCandidate,
  type RecommendationEmployee,
} from '../../../../../shared/assignmentRecommendation.ts'
import { cn } from '@/utils'

type WhatsAppReviewDrawerProps = {
  isOpen: boolean
  onClose: () => void
  onConfirmed?: (jobId: string) => void
  proposal: ProposedAction<ProposedCreateJobPayload> | null
}

export function WhatsAppReviewDrawer({
  isOpen,
  onClose,
  onConfirmed,
  proposal,
}: WhatsAppReviewDrawerProps) {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'review' | 'chat'>('review')

  // Editable Form State
  const [title, setTitle] = useState(proposal?.payload.title || '')
  const [customerName, setCustomerName] = useState(proposal?.payload.customerName || '')
  const [customerPhone, setCustomerPhone] = useState(proposal?.payload.customerPhone || '')
  const [serviceAddress, setServiceAddress] = useState(proposal?.payload.serviceAddress || '')
  const [location, setLocation] = useState(proposal?.payload.location || 'Kochi')
  const [priority, setPriority] = useState<JobPriority>((proposal?.payload.priority as JobPriority) || 'Medium')
  const [requiredSkills] = useState<string[]>(proposal?.payload.requiredSkills || [])
  const [description, setDescription] = useState(proposal?.payload.description || '')

  // Technician Candidates & Smart Match State
  const [rankedCandidates, setRankedCandidates] = useState<RankedAssignmentCandidate[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('')
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)

  // Clarification Mode
  const [clarificationText, setClarificationText] = useState('')
  const [isSendingClarification, setIsSendingClarification] = useState(false)
  const [clarificationSuccess, setClarificationSuccess] = useState(false)

  // Execution State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<{ jobId: string } | null>(null)

  // Load Technicians & Evaluate Smart Match Preview
  useEffect(() => {
    if (!isOpen || !profile || !proposal) return

    let isMounted = true
    async function loadCandidates() {
      setIsLoadingEmployees(true)
      try {
        const assignable = await jobService.listAssignableEmployees(
          profile!,
          profile!.organizationId,
        )

        if (!isMounted) return

        // Map assignable employees to recommendation format
        const recEmployees: RecommendationEmployee[] = assignable.map((emp) => {
          const availStr = (emp.availability || '').toLowerCase()
          return {
            id: emp.id,
            displayName: emp.displayName,
            role: emp.role,
            skills: emp.skills || [],
            availability: emp.availability || 'Available',
            availabilityKnown: true,
            isUnavailable: availStr === 'busy' || availStr === 'leave',
            serviceZone: 'Kochi',
            location: 'Kochi',
          }
        })

        const draftJob = {
          location: proposal!.payload.location || 'Kochi',
          serviceZone: proposal!.payload.location || 'Kochi',
          requiredSkills: proposal!.payload.requiredSkills || [],
          serviceAddress: proposal!.payload.serviceAddress || '',
        }

        const ranking = rankAssignmentCandidates(
          draftJob,
          recEmployees,
          [],
          { strategy: 'rule-based-v1' },
        )

        if (!isMounted) return
        setRankedCandidates(ranking)
        if (ranking.length > 0) {
          setSelectedCandidateId(ranking[0].employeeId)
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to rank candidates for draft', err)
      } finally {
        if (isMounted) setIsLoadingEmployees(false)
      }
    }

    void loadCandidates()

    return () => {
      isMounted = false
    }
  }, [isOpen, profile, proposal])

  if (!isOpen || !proposal) return null

  const isDrafting = proposal.whatsappMetadata?.threadState === 'drafting'
  const isAlreadyConfirmed = proposal.status === 'completed'
  const isCancelled = proposal.status === 'cancelled'

  const selectedCandidate = rankedCandidates.find(
    (c) => c.employeeId === selectedCandidateId,
  )

  const handleConfirmAndAssign = async () => {
    if (!profile) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await whatsappDemoService.confirmAndAssign(
        profile,
        proposal.proposalId,
        selectedCandidateId || undefined,
      )
      setSuccessResult({ jobId: result.jobId })
      if (onConfirmed) {
        onConfirmed(result.jobId)
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Confirmation and assignment failed.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmJobOnly = async () => {
    if (!profile) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await whatsappDemoService.confirmAndAssign(
        profile,
        proposal.proposalId,
        undefined,
      )
      setSuccessResult({ jobId: result.jobId })
      if (onConfirmed) {
        onConfirmed(result.jobId)
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Job creation failed.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async (action: 'reject' | 'spam') => {
    if (!profile) return
    const confirmed = window.confirm(
      action === 'spam'
        ? 'Are you sure you want to mark this request as spam?'
        : 'Decline this customer service request?',
    )
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      await whatsappDemoService.rejectProposal(profile, proposal.proposalId, action)
      onClose()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendClarification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !clarificationText.trim()) return

    setIsSendingClarification(true)
    try {
      await whatsappDemoService.sendClarification(
        profile,
        proposal.proposalId,
        clarificationText.trim(),
      )
      setClarificationSuccess(true)
      setClarificationText('')
      setTimeout(() => setClarificationSuccess(false), 3000)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not send clarification.',
      )
    } finally {
      setIsSendingClarification(false)
    }
  }

  const meta = proposal.whatsappMetadata
  const messages = meta?.originalMessages || []
  const notifications = meta?.simulatedNotifications || []

  return (
    <div
      aria-labelledby="review-drawer-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-wf-scrim/50 backdrop-blur-[2px] transition-opacity"
      role="dialog"
    >
      <div className="relative flex h-full w-full max-w-4xl flex-col bg-wf-surface shadow-2xl animate-in slide-in-from-right duration-200 border-l border-wf-border">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-wf-separator px-6 py-4 bg-wf-surface-raised">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-wf-ink" id="review-drawer-title">
                  Review WhatsApp Request
                </h2>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Ref #{proposal.proposalId.slice(-6).toUpperCase()}
                </span>
                {meta?.threadState ? (
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-[11px] font-medium capitalize',
                      meta.threadState === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : meta.threadState === 'rejected' || meta.threadState === 'spam'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800',
                    )}
                  >
                    {meta.threadState.replace('_', ' ')}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-wf-ink-3">
                Received from {customerName || 'Customer'} ({customerPhone})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Close drawer"
              className="rounded-lg p-2 text-wf-ink-3 transition-colors hover:bg-wf-surface-sunken hover:text-wf-ink"
              onClick={onClose}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation for Compact Screens */}
        <div className="flex border-b border-wf-separator px-6 bg-wf-surface">
          <button
            className={cn(
              'border-b-2 py-3 px-4 text-xs font-semibold transition-colors',
              activeTab === 'review'
                ? 'border-wf-ink text-wf-ink'
                : 'border-transparent text-wf-ink-3 hover:text-wf-ink',
            )}
            onClick={() => setActiveTab('review')}
            type="button"
          >
            Review & Assign
          </button>
          <button
            className={cn(
              'border-b-2 py-3 px-4 text-xs font-semibold transition-colors flex items-center gap-1.5',
              activeTab === 'chat'
                ? 'border-wf-ink text-wf-ink'
                : 'border-transparent text-wf-ink-3 hover:text-wf-ink',
            )}
            onClick={() => setActiveTab('chat')}
            type="button"
          >
            <MessageSquare className="size-3.5" />
            <span>Customer Thread ({messages.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isDrafting ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="size-8 animate-spin text-emerald-600" />
              <p className="text-sm font-semibold text-wf-ink">Gemini AI is drafting this request...</p>
              <p className="text-xs text-wf-ink-3">Extracting skills, customer address, and priority.</p>
            </div>
          ) : activeTab === 'chat' ? (
            /* Tab: Customer WhatsApp Chat Thread */
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="rounded-xl border border-wf-border bg-wf-surface-raised p-3 text-xs text-wf-ink-3 flex items-center gap-2">
                <Info className="size-4 shrink-0 text-emerald-600" />
                <span>
                  Incoming messages from WhatsApp customer. The manager can trigger manual clarifications.
                </span>
              </div>

              {/* Chat timeline */}
              <div className="space-y-3 rounded-2xl border border-wf-border bg-emerald-50/20 p-4 min-h-[300px]">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-wf-ink-3 py-8">No messages recorded.</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col',
                        msg.direction === 'inbound' ? 'items-start' : 'items-end',
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl p-3 text-xs shadow-sm leading-relaxed',
                          msg.direction === 'inbound'
                            ? 'rounded-tl-none bg-white border border-wf-border text-wf-ink'
                            : 'rounded-tr-none bg-emerald-600 text-white',
                        )}
                      >
                        <div className="mb-1 text-[10px] font-semibold opacity-70">
                          {msg.direction === 'inbound' ? msg.senderName || 'Customer' : 'Service Team'}
                        </div>
                        <p>{msg.text}</p>
                        <span className="mt-1 block text-right text-[10px] opacity-60">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Manager Clarification Input */}
              <form
                className="rounded-xl border border-wf-border bg-wf-surface p-3 space-y-2 shadow-sm"
                onSubmit={handleSendClarification}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-wf-ink">
                  <span>Send WhatsApp Clarification</span>
                  <span className="text-[10px] text-emerald-600 font-medium">Manager Triggered</span>
                </div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-wf-border bg-background px-3 py-2 text-xs text-wf-ink outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    onChange={(e) => setClarificationText(e.target.value)}
                    placeholder="Ask customer: e.g. What is your apartment flat number?"
                    type="text"
                    value={clarificationText}
                  />
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    disabled={isSendingClarification || !clarificationText.trim()}
                    type="submit"
                  >
                    {isSendingClarification ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    <span>Send</span>
                  </button>
                </div>
                {clarificationSuccess ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                    <Check className="size-3 text-emerald-600" />
                    <span>Clarification sent to customer on WhatsApp</span>
                  </p>
                ) : null}
              </form>

              {notifications.length > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-800">
                    Simulated Customer Notifications ({notifications.length})
                  </span>
                  <div className="space-y-1.5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-lg border border-emerald-100 bg-white p-2.5 text-xs text-wf-ink"
                      >
                        <div className="flex items-center justify-between text-[10px] font-medium text-emerald-700">
                          <span className="font-semibold uppercase">Template: {n.templateName}</span>
                          <span>{new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="mt-1 text-emerald-950 font-mono text-[11px]">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* Tab: Review & Smart Match Assign */
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column (Job Specification - 7 Cols) */}
              <div className="space-y-4 lg:col-span-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-wf-ink">AI-Extracted Job Specification</h3>
                  </div>
                  <span className="text-[11px] text-wf-ink-3">
                    Model: <strong className="text-wf-ink">{meta?.aiModelUsed || 'Gemini 3.1 Flash Lite'}</strong>
                  </span>
                </div>

                <div className="space-y-3 rounded-xl border border-wf-border bg-wf-surface p-4 shadow-sm">
                  {/* Job Title */}
                  <div>
                    <label className="mb-1 flex items-center justify-between text-xs font-medium text-wf-ink-2">
                      <span>Job Title</span>
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Confidence: High
                      </span>
                    </label>
                    <input
                      className="w-full rounded-lg border border-wf-border bg-background px-3 py-2 text-xs font-medium text-wf-ink outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) => setTitle(e.target.value)}
                      type="text"
                      value={title}
                    />
                  </div>

                  {/* Customer info */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-wf-ink-2">
                        Customer Name
                      </label>
                      <input
                        className="w-full rounded-lg border border-wf-border bg-background px-3 py-2 text-xs text-wf-ink outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        onChange={(e) => setCustomerName(e.target.value)}
                        type="text"
                        value={customerName}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-wf-ink-2">
                        Customer Phone
                      </label>
                      <input
                        className="w-full rounded-lg border border-wf-border bg-background px-3 py-2 text-xs text-wf-ink outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        type="text"
                        value={customerPhone}
                      />
                    </div>
                  </div>

                  {/* Service Address & Location */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-wf-ink-2">
                        Service Address
                      </label>
                      <input
                        className="w-full rounded-lg border border-wf-border bg-background px-3 py-2 text-xs text-wf-ink outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        onChange={(e) => setServiceAddress(e.target.value)}
                        type="text"
                        value={serviceAddress}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-wf-ink-2">
                        Service Zone / Location
                      </label>
                      <input
                        className="w-full rounded-lg border border-wf-border bg-background px-3 py-2 text-xs text-wf-ink outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        onChange={(e) => setLocation(e.target.value)}
                        type="text"
                        value={location}
                      />
                    </div>
                  </div>

                  {/* Priority & Required Skills */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-wf-ink-2">Priority</label>
                      <select
                        className="w-full rounded-lg border border-wf-border bg-background px-3 py-2 text-xs text-wf-ink outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        onChange={(e) => setPriority(e.target.value as JobPriority)}
                        value={priority}
                      >
                        {JOB_PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-wf-ink-2">
                        Required Skills (Org Verified)
                      </label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {requiredSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                          >
                            <Wrench className="size-3 text-emerald-600" />
                            <span>{skill}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-wf-ink-2">
                      Description & Work Scope
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-wf-border bg-background p-2.5 text-xs text-wf-ink outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      value={description}
                    />
                  </div>
                </div>

                {/* Simulated Outbound Customer Notification Preview */}
                <div className="rounded-xl border border-wf-border bg-wf-surface-raised p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-wf-ink">
                    <Phone className="size-3.5 text-emerald-600" />
                    <span>Customer WhatsApp Dispatch Notification (Preview)</span>
                  </div>
                  <p className="rounded-lg border border-emerald-100 bg-white p-3 text-xs leading-relaxed text-emerald-950 font-mono">
                    {selectedCandidate
                      ? `Hi ${customerName || 'Customer'}, your service request for "${title}" has been confirmed! Technician ${selectedCandidate.employeeName} is scheduled to assist you.`
                      : `Hi ${customerName || 'Customer'}, your service request for "${title}" has been confirmed and registered.`}
                  </p>
                </div>
              </div>

              {/* Right Column (Smart Match Preview - 5 Cols) */}
              <div className="space-y-4 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-wf-ink">Smart Match Technicians</h3>
                  </div>
                  <span className="text-[11px] text-wf-ink-3">AHP Ranking</span>
                </div>

                {isLoadingEmployees ? (
                  <div className="flex h-40 items-center justify-center rounded-xl border border-wf-border bg-wf-surface">
                    <Loader2 className="size-5 animate-spin text-emerald-600" />
                  </div>
                ) : rankedCandidates.length === 0 ? (
                  <div className="rounded-xl border border-wf-border bg-wf-surface p-6 text-center text-xs text-wf-ink-3">
                    <Users className="mx-auto size-8 text-wf-ink-4 mb-2" />
                    <span>No technicians currently available for this trade.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {rankedCandidates.slice(0, 4).map((cand) => {
                      const isSelected = selectedCandidateId === cand.employeeId
                      return (
                        <div
                          key={cand.employeeId}
                          className={cn(
                            'cursor-pointer rounded-xl border p-3.5 transition-all text-xs',
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                              : 'border-wf-border bg-wf-surface hover:border-wf-ink-4 hover:bg-wf-surface-raised',
                          )}
                          onClick={() => setSelectedCandidateId(cand.employeeId)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                                  cand.rank === 1
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-wf-surface-raised text-wf-ink-3',
                                )}
                              >
                                #{cand.rank}
                              </div>
                              <span className="font-semibold text-wf-ink">{cand.employeeName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-emerald-700">
                                {Math.round(cand.totalScore)}% Match
                              </span>
                              <span
                                className={cn(
                                  'rounded px-1.5 py-0.2 text-[10px] font-bold',
                                  cand.confidenceBucket === 'High'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800',
                                )}
                              >
                                {cand.confidenceBucket || 'High'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] text-wf-ink-3 border-t border-wf-separator/50 pt-2">
                            <div>
                              Skills: <strong className="text-wf-ink">{cand.scoreBreakdown?.skillMatch ?? 90}%</strong>
                            </div>
                            <div>
                              Distance: <strong className="text-wf-ink">{cand.scoreBreakdown?.locationRelevance ?? 80}%</strong>
                            </div>
                            <div>
                              Avail: <strong className="text-wf-ink">{cand.scoreBreakdown?.availability ?? 85}%</strong>
                            </div>
                          </div>

                          {cand.explanationReasons && cand.explanationReasons.length > 0 ? (
                            <p className="mt-2 text-[11px] text-emerald-800 italic">
                              "{cand.explanationReasons[0]}"
                            </p>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMessage ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {successResult ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>Job created and assigned successfully! (Job #{successResult.jobId.slice(-6)})</span>
            </div>
          ) : null}
        </div>

        {/* Drawer Footer Actions */}
        <div className="border-t border-wf-separator bg-wf-surface-raised px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isAlreadyConfirmed && !isCancelled ? (
              <>
                <button
                  className="rounded-lg border border-wf-border bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => handleReject('reject')}
                  type="button"
                >
                  Decline
                </button>
                <button
                  className="rounded-lg border border-wf-border bg-white px-3 py-2 text-xs font-semibold text-wf-ink-3 hover:bg-wf-surface-sunken disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={() => handleReject('spam')}
                  type="button"
                >
                  Mark as Spam
                </button>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              className="rounded-lg border border-wf-border bg-white px-4 py-2 text-xs font-semibold text-wf-ink hover:bg-wf-surface-sunken"
              onClick={onClose}
              type="button"
            >
              Close
            </button>

            {!isAlreadyConfirmed && !isCancelled ? (
              <>
                <button
                  className="rounded-lg border border-wf-border bg-white px-3.5 py-2 text-xs font-semibold text-wf-ink hover:bg-wf-surface-sunken disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={handleConfirmJobOnly}
                  type="button"
                >
                  Create Job Only
                </button>

                <button
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  disabled={isSubmitting || !selectedCandidate}
                  onClick={handleConfirmAndAssign}
                  type="button"
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  <span>
                    {selectedCandidate
                      ? `Create Job & Assign ${selectedCandidate.employeeName}`
                      : 'Select Technician'}
                  </span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
