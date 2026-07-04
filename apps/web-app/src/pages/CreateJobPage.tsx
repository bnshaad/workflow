import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Calendar, Paperclip, Save } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components'
import { DEFAULT_JOB_PRIORITY, JOB_PRIORITY_OPTIONS } from '@/constants/jobConstants'
import { useAuth } from '@/hooks'
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
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    <div className="space-y-8">
      <PageHeader
        title="Create Job"
        description="Add a manual job for the current organization."
        actions={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
            to="/jobs"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Jobs
          </Link>
        }
      />

      <form
        className="rounded-xl border border-border bg-card shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-6 border-b border-border p-6 lg:grid-cols-2">
          <Field label="Title">
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

          <Field label="Priority">
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

          <div className="lg:col-span-2">
            <Field label="Description">
              <textarea
                className="min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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

          <Field label="Customer Name">
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

          <Field label="Customer Phone">
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
            <Field label="Service Address">
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

          <Field label="Required Skill IDs">
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

        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          {errorMessage ? (
            <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Jobs are created as drafts until status management moves them forward.
            </p>
          )}
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

function parseSkillIds(value: string) {
  return value
    .split(',')
    .map((skillId) => skillId.trim())
    .filter(Boolean)
}
