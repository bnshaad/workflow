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
  const [hasAppliedDraftSuggestion, setHasAppliedDraftSuggestion] =
    useState(false)
  const [isDraftPreviewExpanded, setIsDraftPreviewExpanded] = useState(true)
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGenerateDraft = async () => {
    setAiErrorMessage('')
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
      setIsDraftPreviewExpanded(true)
    } catch (error) {
      if (error instanceof AiJobUnderstandingError) {
        setAiErrorMessage(error.message)
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
    }

    try {
      await jobService.createJob(profile, input)
      navigate('/jobs')
    } catch (error) {
      if (error instanceof JobValidationError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Unable to create the job. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Create Job"
        description="Add a manual job for the current organization."
        actions={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            to="/jobs"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Jobs
          </Link>
        }
      />

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Sparkles aria-hidden="true" className="size-4 text-primary" />
                Generate Job Draft
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                AI-generated suggestions must be reviewed and edited before creating a job.
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
                <span className="inline-flex w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  AI-generated editable suggestion
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <Field label="Natural-language customer request">
            <textarea
              className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setCustomerRequest(event.target.value)}
              placeholder="Example: Customer name is Sarah Jenkins. AC is not cooling at 123 Maple Street and they need service today. Phone is 555-123-4567."
              value={customerRequest}
            />
          </Field>

          <div className="rounded-lg border border-border bg-background p-4">
            {draftSuggestion ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      Draft suggestion
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {draftSuggestion.source === 'gemini'
                        ? 'Gemini-assisted output. Apply it only as editable form text.'
                        : 'Development stub output. Apply it only as editable form text.'}
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
                Generated fields will appear here before you apply them to the editable job form.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          {aiErrorMessage ? (
            <p className="text-sm font-medium text-destructive">
              {aiErrorMessage}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              This does not save a job or assign employees.
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
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
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!draftSuggestion}
              onClick={applyDraftSuggestion}
              type="button"
            >
              Use Suggestion
            </button>
          </div>
        </div>
      </section>

      <form
        className="rounded-xl border border-border bg-card shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="space-y-4 p-4 pb-20">
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

        <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-card/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-4">
          {errorMessage ? (
            <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Jobs are created as drafts until status management moves them forward.
            </p>
          )}
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            <Save aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </form>
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
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="mb-4">
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
