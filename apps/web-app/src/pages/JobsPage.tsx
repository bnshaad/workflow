import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Calendar,
  Check,
  ChevronDown,
  ClipboardList,
  Filter,
  SlidersHorizontal,
  MoreHorizontal,
  Plus,
  Search,
  X,
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
  const [showMoreFilters, setShowMoreFilters] = useState(false)

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
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load jobs list.', error)
        }

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

  const activeFilterCount = [
    searchQuery.trim().length > 0,
    statusFilter !== 'all',
    assignedFilter !== 'all',
    priorityFilter !== 'all',
    createdByFilter !== 'all',
  ].filter(Boolean).length
  const advancedFilterCount = [
    priorityFilter !== 'all',
    createdByFilter !== 'all',
  ].filter(Boolean).length
  const hasActiveFilters = activeFilterCount > 0
  const hasVisibleJobs = !isLoading && !errorMessage && filteredJobs.length > 0

  function clearFilters() {
    setSearchQuery('')
    setStatusFilter('all')
    setAssignedFilter('all')
    setPriorityFilter('all')
    setCreatedByFilter('all')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jobs"
        description="Track service jobs and review job details."
        actions={
          <Link
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-auto"
            to="/jobs/create"
          >
            <Plus aria-hidden="true" className="size-4" />
            Create Job
          </Link>
        }
      />

      <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="relative min-w-0 xl:flex-[1.5]">
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

          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_auto_auto]">
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
              label="Assigned"
              onChange={(value) => setAssignedFilter(value as AssignedFilter)}
              value={assignedFilter}
            >
              <option value="all">All assignment</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </FilterSelect>

            <button
              aria-expanded={showMoreFilters}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 sm:col-span-2 lg:col-span-1"
              onClick={() => setShowMoreFilters((current) => !current)}
              type="button"
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              More filters
              {advancedFilterCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {advancedFilterCount}
                </span>
              ) : null}
              <ChevronDown
                aria-hidden="true"
                className={`size-4 text-muted-foreground transition ${
                  showMoreFilters ? 'rotate-180' : ''
                }`}
              />
            </button>

            {hasActiveFilters ? (
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:col-span-2 lg:col-span-1"
                onClick={clearFilters}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
                Clear filters
                <span className="sr-only">, {activeFilterCount} active</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1">
            {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
          </span>
          <span>
            Showing {filteredJobs.length} of {jobs.length} loaded jobs
          </span>
        </div>

        {showMoreFilters ? (
          <div className="mt-3 grid gap-2 border-t border-border pt-3 md:grid-cols-2">
            <FilterSelect
              icon={<Filter aria-hidden="true" className="size-4" />}
              label="Priority"
              onChange={(value) =>
                setPriorityFilter(value as JobPriority | 'all')
              }
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
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-background/60">
                {[
                  'Job',
                  'Assigned',
                  'Priority',
                  'Status',
                  'Due Date',
                  'Actions',
                ].map((header) => (
                  <th
                    className="px-4 py-3 text-xs font-medium tracking-[0.08em] text-muted-foreground"
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
                <TableMessage
                  action={
                    hasActiveFilters ? (
                      <button
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        onClick={clearFilters}
                        type="button"
                      >
                        Clear filters
                      </button>
                    ) : null
                  }
                >
                  {hasActiveFilters
                    ? 'No jobs match the current filters.'
                    : 'No jobs are available yet.'}
                </TableMessage>
              ) : null}

              {!isLoading && !errorMessage
                ? filteredJobs.map((job) => (
                    <tr className="transition hover:bg-background/60" key={job.id}>
                      <td className="px-4 py-3">
                        <Link
                          className="font-medium text-foreground transition hover:text-primary"
                          to={`/jobs/${job.id}`}
                        >
                          {job.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {job.customerName}
                        </p>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <StatusBadge tone={priorityTone[job.priority]}>
                          {job.priority}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatTimestamp(job.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-right">
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

        <div className="lg:hidden">
          {isLoading ? (
            <ListMessage>Loading jobs...</ListMessage>
          ) : null}

          {!isLoading && errorMessage ? (
            <ListMessage tone="danger">{errorMessage}</ListMessage>
          ) : null}

          {!isLoading && !errorMessage && filteredJobs.length === 0 ? (
            <ListMessage
              action={
                hasActiveFilters ? (
                  <button
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear filters
                  </button>
                ) : null
              }
            >
              {hasActiveFilters
                ? 'No jobs match the current filters.'
                : 'No jobs are available yet.'}
            </ListMessage>
          ) : null}

          {hasVisibleJobs ? (
            <div className="divide-y divide-border">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-background/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredJobs.length} of {jobs.length} loaded jobs
          </p>
          <p className="text-sm text-muted-foreground">Latest 25 jobs loaded</p>
        </div>
      </section>
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
  return (
    <article className="p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            className="font-medium text-foreground transition hover:text-primary"
            to={`/jobs/${job.id}`}
          >
            {job.title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{job.customerName}</p>
        </div>
        <Link
          aria-label={`View details for ${job.title}`}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          to={`/jobs/${job.id}`}
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge tone={priorityTone[job.priority]}>{job.priority}</StatusBadge>
        <StatusBadge tone={statusTone[job.status]}>
          {JOB_STATUS_LABELS[job.status]}
        </StatusBadge>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Assigned
          </dt>
          <dd
            className={
              job.assignedEmployeeIds.length === 0
                ? 'mt-1 italic text-muted-foreground'
                : 'mt-1 text-foreground'
            }
          >
            {formatAssignedEmployees(job.assignedEmployeeIds)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Due Date
          </dt>
          <dd className="mt-1 text-muted-foreground">
            {formatTimestamp(job.dueDate)}
          </dd>
        </div>
      </dl>
    </article>
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
      <span className="pointer-events-none absolute left-3.5 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <select
        className="h-10 w-full appearance-none rounded-lg border border-border bg-background pl-10 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </label>
  )
}

function TableMessage({
  action,
  children,
  tone = 'default',
}: {
  action?: ReactNode
  children: ReactNode
  tone?: 'danger' | 'default'
}) {
  return (
    <tr>
      <td
        className={
          tone === 'danger'
            ? 'px-4 py-6 text-center text-destructive'
            : 'px-4 py-6 text-center text-muted-foreground'
        }
        colSpan={6}
      >
        <div className="flex flex-col items-center gap-3">
          <span>{children}</span>
          {action}
        </div>
      </td>
    </tr>
  )
}

function ListMessage({
  action,
  children,
  tone = 'default',
}: {
  action?: ReactNode
  children: ReactNode
  tone?: 'danger' | 'default'
}) {
  return (
    <div
      className={
        tone === 'danger'
          ? 'px-4 py-6 text-center text-sm text-destructive'
          : 'px-4 py-6 text-center text-sm text-muted-foreground'
      }
    >
      <p>{children}</p>
      {action}
    </div>
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
