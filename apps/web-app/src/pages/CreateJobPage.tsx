import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Paperclip,
  Save,
  Sparkles,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components'
import { DEFAULT_JOB_PRIORITY, JOB_PRIORITY_OPTIONS } from '@/constants/jobConstants'
import { useAuth } from '@/hooks'
import {
  AiJobUnderstandingError,
  jobUnderstandingService,
  type AiJobDraftSuggestion,
  type ModelCoordinatorDiagnostics,
} from '@/services/ai'
import { JobValidationError, jobService } from '@/services/jobs'
import type { CreateJobInput } from '@/types'
import type { JobPriority } from '@/types/jobPriority'

type CreateJobFormState = {
  customerName: string
  customerPhone: string
  description: string
  dueDate: string
  location: string
  priority: JobPriority
  requiredSkillIds: string
  serviceAddress: string
  title: string
}

const initialFormState: CreateJobFormState = {
  customerName: '',
  customerPhone: '',
  description: '',
  dueDate: '',
  location: '',
  priority: DEFAULT_JOB_PRIORITY,
  requiredSkillIds: '',
  serviceAddress: '',
  title: '',
}

export function CreateJobPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [formState, setFormState] = useState(initialFormState)
  const [customerRequest, setCustomerRequest] = useState('')
  const [draftSuggestion, setDraftSuggestion] =
    useState<AiJobDraftSuggestion | null>(null)
  const [aiErrorMessage, setAiErrorMessage] = useState('')
  const [aiDiagnostics, setAiDiagnostics] =
    useState<ModelCoordinatorDiagnostics | null>(null)
  const [hasAppliedDraftSuggestion, setHasAppliedDraftSuggestion] =
    useState(false)
  const [isDraftPreviewExpanded, setIsDraftPreviewExpanded] = useState(false)
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGenerateDraft = async () => {
    setAiErrorMessage('')
    setAiDiagnostics(null)
    setIsGeneratingDraft(true)

    if (!profile) {
      setAiErrorMessage('Your profile is still loading. Please try again.')
      setIsGeneratingDraft(false)
      return
    }

    try {
      const suggestion =
        await jobUnderstandingService.generateJobDraftSuggestion(profile, {
          customerRequest,
        })

      setDraftSuggestion(suggestion)
      setHasAppliedDraftSuggestion(false)
      setIsDraftPreviewExpanded(false)
    } catch (error) {
      if (error instanceof AiJobUnderstandingError) {
        setAiErrorMessage(error.message)
        setAiDiagnostics(error.diagnostics ?? null)
      } else {
        setAiErrorMessage('Unable to generate a job draft. Please try again.')
      }
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  const applyDraftSuggestion = () => {
    if (!draftSuggestion) {
      return
    }

    setFormState((current) => ({
      ...current,
      title: draftSuggestion.title || current.title,
      description: draftSuggestion.description || current.description,
      customerName: draftSuggestion.customerName || current.customerName,
      customerPhone: draftSuggestion.customerPhone || current.customerPhone,
      serviceAddress: draftSuggestion.serviceAddress || current.serviceAddress,
      location: draftSuggestion.location || current.location,
      priority: draftSuggestion.priority || current.priority,
      dueDate: draftSuggestion.dueDate || current.dueDate,
      requiredSkillIds:
        draftSuggestion.requiredSkills.length > 0
          ? draftSuggestion.requiredSkills.join(', ')
          : current.requiredSkillIds,
    }))
    setHasAppliedDraftSuggestion(true)
    setIsDraftPreviewExpanded(false)
  }

  const submitJob = async (status: 'open' | 'draft' = 'open') => {
    setErrorMessage('')
    setIsSubmitting(true)

    if (!profile) {
      setErrorMessage('Your profile is still loading. Please try again.')
      setIsSubmitting(false)
      return
    }

    const input: CreateJobInput = {
      title: formState.title,
      description: formState.description,
      customerName: formState.customerName,
      customerPhone: formState.customerPhone,
      serviceAddress: formState.serviceAddress,
      location: formState.location,
      priority: formState.priority,
      requiredSkills: parseSkillIds(formState.requiredSkillIds),
      dueDate: formState.dueDate ? new Date(formState.dueDate) : null,
      attachments: [],
      status,
    }

    try {
      await jobService.createJob(profile, input)
      navigate('/jobs')
    } catch (error) {
      if (error instanceof JobValidationError) {
        setErrorMessage(error.message)
      } else if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Unable to create the job. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await submitJob('open')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Create Job"
        description="Add a manual job for the current organization."
        actions={
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            to="/jobs"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Jobs
          </Link>
        }
      />

      <section className="rounded-lg border border-border bg-background/40">
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Draft assistant
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Optional: turn a customer request into editable form fields.
              </p>
            </div>
            {draftSuggestion ? (
              <div className="flex flex-wrap items-center gap-2">
                {hasAppliedDraftSuggestion ? (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                    Applied to form
                  </span>
                ) : null}
                <span className="inline-flex w-fit rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
                  Editable draft
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 p-3.5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
          <Field label="Customer request">
            <textarea
              className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setCustomerRequest(event.target.value)}
              placeholder="Example: Customer name is Sarah Jenkins. AC is not cooling at 123 Maple Street and they need service today. Phone is 555-123-4567."
              value={customerRequest}
            />
          </Field>

          <div className="border-t border-border pt-3.5 lg:border-l lg:border-t-0 lg:pl-3.5 lg:pt-0">
            {draftSuggestion ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      Draft suggestion
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Review before using these fields in the form.
                    </p>
                  </div>
                  <button
                    aria-expanded={isDraftPreviewExpanded}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onClick={() =>
                      setIsDraftPreviewExpanded((current) => !current)
                    }
                    type="button"
                  >
                    {isDraftPreviewExpanded ? 'Collapse' : 'Expand'}
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-3.5 text-muted-foreground transition ${
                        isDraftPreviewExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                {!isDraftPreviewExpanded ? (
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <p className="font-medium text-foreground">
                      {draftSuggestion.title || 'Untitled suggested job'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {draftSuggestion.customerName || 'Customer needs review'} ·{' '}
                      {draftSuggestion.priority} priority
                    </p>
                  </div>
                ) : (
                  <>
                    <dl className="grid gap-3 text-sm">
                      <SuggestionRow label="Title" value={draftSuggestion.title} />
                      <SuggestionRow
                        label="Service Type"
                        value={draftSuggestion.serviceType}
                      />
                      <SuggestionRow
                        label="Priority"
                        value={draftSuggestion.priority}
                      />
                      <SuggestionRow
                        label="Skills"
                        value={draftSuggestion.requiredSkills.join(', ')}
                      />
                      <SuggestionRow
                        label="Customer"
                        value={draftSuggestion.customerName}
                      />
                      <SuggestionRow
                        label="Phone"
                        value={draftSuggestion.customerPhone}
                      />
                      <SuggestionRow
                        label="Address"
                        value={draftSuggestion.serviceAddress}
                      />
                      <SuggestionRow
                        label="Location"
                        value={draftSuggestion.location}
                      />
                      <SuggestionRow
                        label="Due date"
                        value={draftSuggestion.dueDate ?? ''}
                      />
                    </dl>
                    {draftSuggestion.needsReview.length > 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        <p className="font-medium">Needs review</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4">
                          {draftSuggestion.needsReview.map((reviewItem) => (
                            <li key={reviewItem}>{reviewItem}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <div className="flex min-h-24 items-center text-sm text-muted-foreground">
                The draft fields will appear here for review.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          {aiErrorMessage ? (
            <div>
              <p className="text-sm font-medium text-destructive">
                {aiErrorMessage}
              </p>
              {import.meta.env.DEV && aiDiagnostics ? (
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">
                    Development diagnostics
                  </summary>
                  <dl className="mt-2 grid gap-1 rounded-md border border-border bg-muted/40 p-2.5 sm:grid-cols-3">
                    <DiagnosticItem
                      label="Error code"
                      value={aiDiagnostics.normalizedErrorCode}
                    />
                    <DiagnosticItem
                      label="Callable status"
                      value={aiDiagnostics.callableStatus}
                    />
                    <DiagnosticItem
                      label="Duration"
                      value={`${aiDiagnostics.durationMs} ms`}
                    />
                  </dl>
                </details>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This does not save a job or assign employees.
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGeneratingDraft || customerRequest.trim().length === 0}
              onClick={handleGenerateDraft}
              type="button"
            >
              <Sparkles aria-hidden="true" className="size-4" />
              {isGeneratingDraft
                ? 'Generating...'
                : draftSuggestion
                  ? 'Retry'
                  : 'Generate Draft'}
            </button>
            {draftSuggestion ? (
              <button
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
                onClick={applyDraftSuggestion}
                type="button"
              >
                Use Suggestion
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <form
        className="rounded-lg border border-border bg-card"
        onSubmit={handleSubmit}
      >
        <div className="space-y-3.5 p-3.5 pb-16">
          <FormSection
            description="Name the job and capture the customer request."
            title="Customer & Job Details"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Field
                error={getFieldError(errorMessage, 'Job title')}
                label="Title"
                required
              >
                <input
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Annual HVAC inspection"
                  value={formState.title}
                />
              </Field>

              <Field
                error={getFieldError(errorMessage, 'Customer name')}
                label="Customer Name"
                required
              >
                <input
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      customerName: event.target.value,
                    }))
                  }
                  placeholder="Sarah Jenkins"
                  value={formState.customerName}
                />
              </Field>

              <Field
                error={getFieldError(errorMessage, 'Customer phone')}
                label="Customer Phone"
                required
              >
                <input
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      customerPhone: event.target.value,
                    }))
                  }
                  placeholder="(555) 123-4567"
                  value={formState.customerPhone}
                />
              </Field>

              <div className="lg:col-span-2">
                <Field
                  error={getFieldError(errorMessage, 'Job description')}
                  label="Description"
                  required
                >
                  <textarea
                    className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Describe the customer request and work required."
                    value={formState.description}
                  />
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection
            description="Set the work type and any skills needed before assignment."
            title="Service Requirements"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Field
                helper="Optional comma-separated skills."
                label="Required Skill IDs"
              >
                <input
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      requiredSkillIds: event.target.value,
                    }))
                  }
                  placeholder="AC Repair, Installation"
                  value={formState.requiredSkillIds}
                />
              </Field>

              <Field label="Attachments">
                <div className="flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 text-sm text-muted-foreground">
                  <Paperclip aria-hidden="true" className="size-4" />
                  Upload will be added in a later phase.
                </div>
              </Field>
            </div>
          </FormSection>

          <FormSection
            description="Choose urgency and the requested service window."
            title="Priority & Schedule"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Priority" required>
                <select
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      priority: event.target.value as JobPriority,
                    }))
                  }
                  value={formState.priority}
                >
                  {JOB_PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Due Date">
                <div className="relative">
                  <Calendar
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                    type="datetime-local"
                    value={formState.dueDate}
                  />
                </div>
              </Field>
            </div>
          </FormSection>

          <FormSection
            description="Capture where the service team should go."
            title="Location"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <Field
                  error={getFieldError(errorMessage, 'Service address')}
                  label="Service Address"
                  required
                >
                  <input
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        serviceAddress: event.target.value,
                      }))
                    }
                    placeholder="123 Maple Street, Springfield"
                    value={formState.serviceAddress}
                  />
                </Field>
              </div>

              <Field label="Location">
                <input
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Facility, unit, or location note"
                  value={formState.location}
                />
              </Field>
            </div>
          </FormSection>
        </div>

        <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          {errorMessage ? (
            <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              New jobs are published as Open and immediately ready for technician assignment.
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => void submitJob('draft')}
              type="button"
            >
              Save as Draft
            </button>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              <Save aria-hidden="true" className="size-4" />
              {isSubmitting ? 'Creating...' : 'Create & Open Job'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function DiagnosticItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="mt-0.5 font-mono text-foreground">{value}</dd>
    </div>
  )
}

function Field({
  children,
  error,
  helper,
  label,
  required = false,
}: {
  children: ReactNode
  error?: string
  helper?: string
  label: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-destructive">
          {error}
        </span>
      ) : helper ? (
        <span className="mt-1 block text-xs text-muted-foreground">
          {helper}
        </span>
      ) : null}
    </label>
  )
}

function FormSection({
  children,
  description,
  title,
}: {
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <section className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function SuggestionRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[96px_minmax(0,1fr)]">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-foreground">
        {value || <span className="text-muted-foreground">Needs review</span>}
      </dd>
    </div>
  )
}

function getFieldError(errorMessage: string, fieldLabel: string) {
  return errorMessage.toLowerCase().includes(fieldLabel.toLowerCase())
    ? errorMessage
    : undefined
}

function parseSkillIds(value: string) {
  return value
    .split(',')
    .map((skillId) => skillId.trim())
    .filter(Boolean)
}
