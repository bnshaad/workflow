import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, Sparkles, X } from 'lucide-react'
import { DEFAULT_JOB_PRIORITY, JOB_PRIORITY_OPTIONS } from '@/constants/jobConstants'
import { useAuth } from '@/hooks'
import {
  AiJobUnderstandingError,
  jobUnderstandingService,
  type AiJobDraftSuggestion,
} from '@/services/ai'
import { JobValidationError, jobService } from '@/services/jobs'
import type { CreateJobInput, Job } from '@/types'
import type { JobPriority } from '@/types/jobPriority'

type CreateJobDrawerProps = {
  isOpen: boolean
  onClose: () => void
  onJobCreated?: (newJob: Job) => void
}

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

export function CreateJobDrawer({
  isOpen,
  onClose,
  onJobCreated,
}: CreateJobDrawerProps) {
  const { profile } = useAuth()
  const [formState, setFormState] = useState<CreateJobFormState>(initialFormState)
  const [customerRequest, setCustomerRequest] = useState('')
  const [draftSuggestion, setDraftSuggestion] = useState<AiJobDraftSuggestion | null>(null)
  const [aiErrorMessage, setAiErrorMessage] = useState('')
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = useCallback(() => {
    setFormState(initialFormState)
    setCustomerRequest('')
    setDraftSuggestion(null)
    setAiErrorMessage('')
    setErrorMessage('')
    onClose()
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])


  const handleGenerateDraft = async () => {
    setAiErrorMessage('')
    setIsGeneratingDraft(true)

    if (!profile) {
      setAiErrorMessage('Your profile is loading. Please try again.')
      setIsGeneratingDraft(false)
      return
    }

    try {
      const suggestion = await jobUnderstandingService.generateJobDraftSuggestion(profile, {
        customerRequest,
      })

      setDraftSuggestion(suggestion)
      // Auto-apply suggestion
      setFormState((prev) => ({
        ...prev,
        customerName: suggestion.customerName || prev.customerName,
        customerPhone: suggestion.customerPhone || prev.customerPhone,
        description: suggestion.description || prev.description,
        dueDate: suggestion.dueDate || prev.dueDate,
        location: suggestion.location || prev.location,
        priority: suggestion.priority || prev.priority,
        requiredSkillIds: suggestion.requiredSkills
          ? suggestion.requiredSkills.join(', ')
          : prev.requiredSkillIds,
        serviceAddress: suggestion.serviceAddress || prev.serviceAddress,
        title: suggestion.title || prev.title,
      }))
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

  const handleChange = (field: keyof CreateJobFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const submitJob = async (status: 'open' | 'draft' = 'open') => {
    setErrorMessage('')

    if (!profile) {
      setErrorMessage('Profile not loaded.')
      return
    }

    setIsSubmitting(true)

    try {
      const requiredSkills = formState.requiredSkillIds
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      const input: CreateJobInput = {
        attachments: [],
        customerName: formState.customerName.trim(),
        customerPhone: formState.customerPhone.trim(),
        description: formState.description.trim(),
        dueDate: formState.dueDate ? new Date(formState.dueDate) : null,
        location: (formState.location || formState.serviceAddress).trim(),
        priority: formState.priority,
        requiredSkills,
        serviceAddress: formState.serviceAddress.trim(),
        status,
        title: formState.title.trim(),
      }

      const createdJob = await jobService.createJob(
        profile,
        input,
      )

      if (onJobCreated) onJobCreated(createdJob)
      handleClose()
    } catch (err) {
      if (err instanceof JobValidationError) {
        setErrorMessage(err.message)
      } else if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to create job. Please check all fields.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await submitJob('open')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="fixed inset-0" onClick={handleClose} />
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-foreground">Create New Job</h2>
          <button
            className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={handleClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form className="flex-1 overflow-y-auto p-5 space-y-5" onSubmit={handleSubmit}>
          {/* AI Customer Message Importer */}
          <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                Paste Customer Message
              </h3>
            </div>
            <textarea
              className="min-h-20 w-full rounded-lg border border-border bg-background p-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(e) => setCustomerRequest(e.target.value)}
              placeholder="Paste WhatsApp message or email (e.g., 'Need AC repair at Kakkanad for Rahul, phone 9876543210')"
              value={customerRequest}
            />
            <button
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={!customerRequest.trim() || isGeneratingDraft}
              onClick={() => void handleGenerateDraft()}
              type="button"
            >
              {isGeneratingDraft ? 'Drafting...' : 'Auto-Fill Form with AI'}
            </button>
            {aiErrorMessage && (
              <p className="text-xs font-medium text-destructive">{aiErrorMessage}</p>
            )}
            {draftSuggestion && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="size-3.5" />
                Form fields auto-populated from customer request!
              </div>
            )}
          </section>

          {errorMessage && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">
                Job Title <span className="text-destructive">*</span>
              </label>
              <input
                className="h-9 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g. Split AC Maintenance & Repair"
                required
                type="text"
                value={formState.title}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Customer Name <span className="text-destructive">*</span>
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => handleChange('customerName', e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  type="text"
                  value={formState.customerName}
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Customer Phone <span className="text-destructive">*</span>
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => handleChange('customerPhone', e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  required
                  type="tel"
                  value={formState.customerPhone}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                Service Address <span className="text-destructive">*</span>
              </label>
              <input
                className="h-9 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(e) => handleChange('serviceAddress', e.target.value)}
                placeholder="e.g. Flat 4B, Infopark Road, Kakkanad"
                required
                type="text"
                value={formState.serviceAddress}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-foreground mb-1">Priority</label>
                <select
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => handleChange('priority', e.target.value as JobPriority)}
                  value={formState.priority}
                >
                  {JOB_PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">Due Date</label>
                <input
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  type="date"
                  value={formState.dueDate}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">Required Skills (Comma separated)</label>
              <input
                className="h-9 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(e) => handleChange('requiredSkillIds', e.target.value)}
                placeholder="e.g. AC Repair, Electrical"
                type="text"
                value={formState.requiredSkillIds}
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                Job Description <span className="text-destructive">*</span>
              </label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-border bg-background p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Provide task instructions for the field worker..."
                required
                value={formState.description}
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              className="flex-1 inline-flex h-9 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Creating...' : 'Create & Open Job'}
            </button>
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              disabled={isSubmitting}
              onClick={() => void submitJob('draft')}
              type="button"
            >
              Save as Draft
            </button>
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
              onClick={handleClose}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
