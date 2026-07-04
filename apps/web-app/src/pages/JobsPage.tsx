import { useEffect, useState } from 'react'
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader, StatusBadge } from '@/components'
import { useAuth } from '@/hooks'
import { jobService } from '@/services/jobs'
import type { Job, JobPriority, JobStatus } from '@/types'

const priorityTone: Record<JobPriority, 'danger' | 'default' | 'warning'> = {
  High: 'danger',
  Low: 'default',
  Medium: 'warning',
  Urgent: 'danger',
}

const statusTone: Record<JobStatus, 'default' | 'primary' | 'success' | 'warning'> = {
  Accepted: 'primary',
  Assigned: 'warning',
  Cancelled: 'default',
  Completed: 'success',
  'In Progress': 'primary',
  Pending: 'default',
}

const filters = [
  { icon: Filter, label: 'Priority' },
  { icon: ClipboardList, label: 'Status' },
  { icon: Calendar, label: 'Date' },
]

export function JobsPage() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadJobs() {
      if (!profile) {
        return
      }

      setIsLoading(true)
      setErrorMessage('')

      try {
        const loadedJobs = await jobService.listJobs(
          profile,
          profile.organizationId,
        )

        if (isMounted) {
          setJobs(loadedJobs)
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load jobs. Please try again.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadJobs()

    return () => {
      isMounted = false
    }
  }, [profile])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <PageHeader
          title="Jobs"
          description="Track today's service jobs and team assignments."
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80 xl:hidden">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Search jobs..."
              type="search"
            />
          </div>
          {filters.map((filter) => (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
              key={filter.label}
              type="button"
            >
              <filter.icon aria-hidden="true" className="size-4" />
              {filter.label}
            </button>
          ))}
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            to="/jobs/create"
          >
            <Plus aria-hidden="true" className="size-4" />
            Create Job
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-background/60">
                {[
                  'Job',
                  'Customer',
                  'Location',
                  'Assigned Worker',
                  'Priority',
                  'Status',
                  'Due Date',
                  'Actions',
                ].map((header) => (
                  <th
                    className="px-6 py-4 text-xs font-medium tracking-[0.08em] text-muted-foreground"
                    key={header}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {isLoading ? (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    Loading jobs...
                  </td>
                </tr>
              ) : null}

              {!isLoading && errorMessage ? (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-destructive"
                    colSpan={8}
                  >
                    {errorMessage}
                  </td>
                </tr>
              ) : null}

              {!isLoading && !errorMessage && jobs.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-10 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    No jobs have been created yet.
                  </td>
                </tr>
              ) : null}

              {!isLoading && !errorMessage
                ? jobs.map((job) => (
                    <tr className="transition hover:bg-background/60" key={job.id}>
                      <td className="px-6 py-5 font-medium text-foreground">
                        {job.title}
                      </td>
                      <td className="px-6 py-5 font-medium text-foreground">
                        {job.customerName}
                      </td>
                      <td className="px-6 py-5 text-muted-foreground">
                        {job.location || job.serviceAddress}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={
                            job.assignedEmployeeIds.length === 0
                              ? 'italic text-muted-foreground'
                              : 'text-foreground'
                          }
                        >
                          {formatAssignedWorkers(job.assignedEmployeeIds)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge tone={priorityTone[job.priority]}>
                          {job.priority}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-1.5">
                          {job.status === 'Completed' ? (
                            <Check
                              aria-hidden="true"
                              className="size-3.5 text-emerald-600"
                            />
                          ) : null}
                          <StatusBadge tone={statusTone[job.status]}>
                            {job.status}
                          </StatusBadge>
                        </span>
                      </td>
                      <td className="px-6 py-5 text-muted-foreground">
                        {formatDueDate(job)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          aria-label={`More actions for ${job.title}`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          type="button"
                        >
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-background/50 px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Showing {jobs.length === 0 ? 0 : 1} to {jobs.length} of {jobs.length}{' '}
            jobs
          </p>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-50"
              disabled
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-50"
              disabled
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function formatAssignedWorkers(assignedEmployeeIds: string[]) {
  if (assignedEmployeeIds.length === 0) {
    return 'Unassigned'
  }

  return `${assignedEmployeeIds.length} assigned`
}

function formatDueDate(job: Job) {
  if (!job.dueDate) {
    return 'No due date'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(job.dueDate.toDate())
}
