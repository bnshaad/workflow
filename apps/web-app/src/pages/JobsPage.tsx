import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Calendar,
  Check,
  ClipboardList,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader, StatusBadge } from '@/components'
import { JOB_PRIORITY_OPTIONS, JOB_STATUS_OPTIONS } from '@/constants/jobConstants'
import { useAuth } from '@/hooks'
import { jobService } from '@/services/jobs'
import {
  JOB_STATUS_LABELS,
  type Job,
  type JobPriority,
  type JobStatus,
} from '@/types'

type AssignedFilter = 'all' | 'assigned' | 'unassigned'

const priorityTone: Record<JobPriority, 'danger' | 'default' | 'warning'> = {
  High: 'danger',
  Low: 'default',
  Medium: 'warning',
  Urgent: 'danger',
}

const statusTone: Record<JobStatus, 'default' | 'primary' | 'success' | 'warning'> = {
  assigned: 'warning',
  cancelled: 'default',
  completed: 'success',
  draft: 'default',
  in_progress: 'primary',
  open: 'primary',
}

export function JobsPage() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<JobPriority | 'all'>('all')
  const [createdByFilter, setCreatedByFilter] = useState('all')
  const [assignedFilter, setAssignedFilter] = useState<AssignedFilter>('all')

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

  const createdByOptions = useMemo(() => {
    return Array.from(new Set(jobs.map((job) => job.createdBy))).sort()
  }, [jobs])

  const filteredJobs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return jobs.filter((job) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        job.title.toLowerCase().includes(normalizedSearch) ||
        job.customerName.toLowerCase().includes(normalizedSearch)
      const matchesStatus =
        statusFilter === 'all' || job.status === statusFilter
      const matchesPriority =
        priorityFilter === 'all' || job.priority === priorityFilter
      const matchesCreatedBy =
        createdByFilter === 'all' || job.createdBy === createdByFilter
      const matchesAssigned =
        assignedFilter === 'all' ||
        (assignedFilter === 'assigned' &&
          job.assignedEmployeeIds.length > 0) ||
        (assignedFilter === 'unassigned' &&
          job.assignedEmployeeIds.length === 0)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesCreatedBy &&
        matchesAssigned
      )
    })
  }, [
    assignedFilter,
    createdByFilter,
    jobs,
    priorityFilter,
    searchQuery,
    statusFilter,
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Jobs"
        description="Track service jobs and review job details."
        actions={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            to="/jobs/create"
          >
            <Plus aria-hidden="true" className="size-4" />
            Create Job
          </Link>
        }
      />

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.5fr)_repeat(4,minmax(150px,1fr))]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title or customer..."
              type="search"
              value={searchQuery}
            />
          </div>

          <FilterSelect
            icon={<ClipboardList aria-hidden="true" className="size-4" />}
            label="Status"
            onChange={(value) => setStatusFilter(value as JobStatus | 'all')}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            {JOB_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {JOB_STATUS_LABELS[status]}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            icon={<Filter aria-hidden="true" className="size-4" />}
            label="Priority"
            onChange={(value) => setPriorityFilter(value as JobPriority | 'all')}
            value={priorityFilter}
          >
            <option value="all">All priorities</option>
            {JOB_PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            icon={<Calendar aria-hidden="true" className="size-4" />}
            label="Created By"
            onChange={setCreatedByFilter}
            value={createdByFilter}
          >
            <option value="all">All creators</option>
            {createdByOptions.map((createdBy) => (
              <option key={createdBy} value={createdBy}>
                {createdBy}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            icon={<Filter aria-hidden="true" className="size-4" />}
            label="Assigned"
            onChange={(value) => setAssignedFilter(value as AssignedFilter)}
            value={assignedFilter}
          >
            <option value="all">All assignment</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </FilterSelect>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-background/60">
                {[
                  'Job',
                  'Customer',
                  'Location',
                  'Assigned',
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
                <TableMessage>Loading jobs...</TableMessage>
              ) : null}

              {!isLoading && errorMessage ? (
                <TableMessage tone="danger">{errorMessage}</TableMessage>
              ) : null}

              {!isLoading && !errorMessage && filteredJobs.length === 0 ? (
                <TableMessage>No jobs match the current view.</TableMessage>
              ) : null}

              {!isLoading && !errorMessage
                ? filteredJobs.map((job) => (
                    <tr className="transition hover:bg-background/60" key={job.id}>
                      <td className="px-6 py-5">
                        <Link
                          className="font-medium text-foreground transition hover:text-primary"
                          to={`/jobs/${job.id}`}
                        >
                          {job.title}
                        </Link>
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
                          {formatAssignedEmployees(job.assignedEmployeeIds)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge tone={priorityTone[job.priority]}>
                          {job.priority}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-1.5">
                          {job.status === 'completed' ? (
                            <Check
                              aria-hidden="true"
                              className="size-3.5 text-emerald-600"
                            />
                          ) : null}
                          <StatusBadge tone={statusTone[job.status]}>
                            {JOB_STATUS_LABELS[job.status]}
                          </StatusBadge>
                        </span>
                      </td>
                      <td className="px-6 py-5 text-muted-foreground">
                        {formatTimestamp(job.dueDate)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          aria-label={`View details for ${job.title}`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          to={`/jobs/${job.id}`}
                        >
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-background/50 px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredJobs.length} of {jobs.length} loaded jobs
          </p>
          <p className="text-sm text-muted-foreground">Latest 25 jobs loaded</p>
        </div>
      </section>
    </div>
  )
}

function FilterSelect({
  children,
  icon,
  label,
  onChange,
  value,
}: {
  children: ReactNode
  icon: ReactNode
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <select
        className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  )
}

function TableMessage({
  children,
  tone = 'default',
}: {
  children: string
  tone?: 'danger' | 'default'
}) {
  return (
    <tr>
      <td
        className={
          tone === 'danger'
            ? 'px-6 py-10 text-center text-destructive'
            : 'px-6 py-10 text-center text-muted-foreground'
        }
        colSpan={8}
      >
        {children}
      </td>
    </tr>
  )
}

function formatAssignedEmployees(assignedEmployeeIds: string[]) {
  if (assignedEmployeeIds.length === 0) {
    return 'Unassigned'
  }

  return `${assignedEmployeeIds.length} assigned`
}

function formatTimestamp(timestamp: Job['dueDate']) {
  if (!timestamp) {
    return 'No due date'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp.toDate())
}
