import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Calendar,
  Check,
  ChevronDown,
  ClipboardList,
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { PageHeader, StatusBadge } from '@/components'
import { JOB_PRIORITY_OPTIONS, JOB_STATUS_OPTIONS } from '@/constants/jobConstants'
import { useAuth } from '@/hooks'
import { jobService } from '@/services/jobs'
import {
  JOB_STATUS_LABELS,
  type Job,
  type JobPriority,
  type JobStatus,
  type UserProfile,
} from '@/types'
import {
  getJobPrimaryAction,
  isJobOverdue,
  matchesJobQuickFilter,
  parseJobQuickFilter,
  type JobQuickFilter,
} from '@/utils'

type AssignedFilter = 'all' | 'assigned' | 'unassigned'

const quickFilters: Array<{ label: string; value: JobQuickFilter }> = [
  { label: 'All jobs', value: 'all' },
  { label: 'Needs Assignment', value: 'needs-assignment' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Progress', value: 'in-progress' },
]

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
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAssignmentsView = location.pathname === '/assignments'
  const requestedQuickFilter = parseJobQuickFilter(searchParams.get('view'))
  const quickFilter =
    isAssignmentsView && !searchParams.has('view')
      ? 'needs-assignment'
      : requestedQuickFilter
  const [jobs, setJobs] = useState<Job[]>([])
  const [employees, setEmployees] = useState<UserProfile[]>([])
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
      if (!profile) return

      setIsLoading(true)
      setErrorMessage('')

      try {
        const [loadedJobs, loadedEmployees] = await Promise.all([
          jobService.listJobs(profile, profile.organizationId),
          jobService
            .listAssignableEmployees(profile, profile.organizationId)
            .catch((error: unknown) => {
              if (import.meta.env.DEV) {
                console.error('Failed to load employee display names.', error)
              }
              return []
            }),
        ])

        if (isMounted) {
          setJobs(loadedJobs)
          setEmployees(loadedEmployees)
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load jobs list.', error)
        }

        if (isMounted) {
          setErrorMessage('Unable to load jobs. Please try again.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadJobs()
    return () => {
      isMounted = false
    }
  }, [profile])

  const employeeNamesById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.displayName])),
    [employees],
  )
  const createdByOptions = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.createdBy))).sort(),
    [jobs],
  )
  const filteredJobs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return jobs.filter((job) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        job.title.toLowerCase().includes(normalizedSearch) ||
        job.customerName.toLowerCase().includes(normalizedSearch)
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter
      const matchesPriority =
        priorityFilter === 'all' || job.priority === priorityFilter
      const matchesCreatedBy =
        createdByFilter === 'all' || job.createdBy === createdByFilter
      const matchesAssigned =
        assignedFilter === 'all' ||
        (assignedFilter === 'assigned' && job.assignedEmployeeIds.length > 0) ||
        (assignedFilter === 'unassigned' && job.assignedEmployeeIds.length === 0)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesCreatedBy &&
        matchesAssigned &&
        matchesJobQuickFilter(job, quickFilter)
      )
    })
  }, [
    assignedFilter,
    createdByFilter,
    jobs,
    priorityFilter,
    quickFilter,
    searchQuery,
    statusFilter,
  ])

  const activeFilterCount = [
    quickFilter !== 'all',
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

  function selectQuickFilter(filter: JobQuickFilter) {
    const nextParams = new URLSearchParams(searchParams)
    if (filter === 'all' && !isAssignmentsView) nextParams.delete('view')
    else nextParams.set('view', filter)
    setSearchParams(nextParams, { replace: true })
  }

  function clearFilters() {
    setSearchQuery('')
    setStatusFilter('all')
    setAssignedFilter('all')
    setPriorityFilter('all')
    setCreatedByFilter('all')
    selectQuickFilter(isAssignmentsView ? 'needs-assignment' : 'all')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={isAssignmentsView ? 'Assignments' : 'Jobs'}
        description={
          isAssignmentsView
            ? 'Review unassigned work and confirm the right employee.'
            : 'Search, assign, and track service work.'
        }
      />

      <section aria-label="Quick job filters" className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1" role="group">
          {quickFilters.map((filter) => (
            <button
              aria-pressed={quickFilter === filter.value}
              className={`inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                quickFilter === filter.value
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              key={filter.value}
              onClick={() => selectQuickFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Job filters" className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="relative min-w-0 xl:flex-[1.5]">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Search jobs"
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title or customer..."
              type="search"
              value={searchQuery}
            />
          </div>

          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto_auto]">
            <FilterSelect
              icon={<ClipboardList aria-hidden="true" className="size-4" />}
              label="Status"
              onChange={(value) => setStatusFilter(value as JobStatus | 'all')}
              value={statusFilter}
            >
              <option value="all">All statuses</option>
              {JOB_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{JOB_STATUS_LABELS[status]}</option>
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 sm:col-span-2 lg:col-span-1"
              onClick={() => setShowMoreFilters((current) => !current)}
              type="button"
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              More filters
              {advancedFilterCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">{advancedFilterCount}</span>
              ) : null}
              <ChevronDown aria-hidden="true" className={`size-4 text-muted-foreground transition ${showMoreFilters ? 'rotate-180' : ''}`} />
            </button>

            {hasActiveFilters ? (
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:col-span-2 lg:col-span-1"
                onClick={clearFilters}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
                Clear
                <span className="sr-only">{activeFilterCount} active filters</span>
              </button>
            ) : null}
          </div>
        </div>

        {showMoreFilters ? (
          <div className="mt-2.5 grid gap-2 border-t border-border pt-2.5 md:grid-cols-2">
            <FilterSelect
              icon={<Filter aria-hidden="true" className="size-4" />}
              label="Priority"
              onChange={(value) => setPriorityFilter(value as JobPriority | 'all')}
              value={priorityFilter}
            >
              <option value="all">All priorities</option>
              {JOB_PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
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
                <option key={createdBy} value={createdBy}>{createdBy}</option>
              ))}
            </FilterSelect>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="jobs-list-heading" className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground" id="jobs-list-heading">
            {isAssignmentsView ? 'Assignment queue' : 'Job list'}
          </h2>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {filteredJobs.length} result{filteredJobs.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-background/60">
                {['Job / Customer', 'Priority', 'Status', 'Due', 'Assigned employee', 'Main action'].map((header) => (
                  <th className="px-4 py-2.5 text-xs font-medium tracking-[0.06em] text-muted-foreground" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {isLoading ? <TableMessage>Loading jobs...</TableMessage> : null}
              {!isLoading && errorMessage ? <TableMessage tone="danger">{errorMessage}</TableMessage> : null}
              {!isLoading && !errorMessage && filteredJobs.length === 0 ? (
                <TableMessage action={hasActiveFilters ? <ClearFiltersButton onClick={clearFilters} /> : null}>
                  {hasActiveFilters ? 'No jobs match these filters.' : 'No jobs are available yet.'}
                </TableMessage>
              ) : null}
              {!isLoading && !errorMessage ? filteredJobs.map((job) => (
                <JobTableRow employeeNamesById={employeeNamesById} job={job} key={job.id} />
              )) : null}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border xl:hidden">
          {isLoading ? <ListMessage>Loading jobs...</ListMessage> : null}
          {!isLoading && errorMessage ? <ListMessage tone="danger">{errorMessage}</ListMessage> : null}
          {!isLoading && !errorMessage && filteredJobs.length === 0 ? (
            <ListMessage action={hasActiveFilters ? <ClearFiltersButton onClick={clearFilters} /> : null}>
              {hasActiveFilters ? 'No jobs match these filters.' : 'No jobs are available yet.'}
            </ListMessage>
          ) : null}
          {!isLoading && !errorMessage ? filteredJobs.map((job) => (
            <JobCard employeeNamesById={employeeNamesById} job={job} key={job.id} />
          )) : null}
        </div>

        <div className="border-t border-border bg-background/60 px-4 py-2.5 text-sm text-muted-foreground">
          Showing {filteredJobs.length} of {jobs.length} loaded jobs
        </div>
      </section>
    </div>
  )
}

function JobTableRow({ employeeNamesById, job }: { employeeNamesById: Map<string, string>; job: Job }) {
  const primaryAction = getJobPrimaryAction(job)
  const overdue = isJobOverdue(job)
  return (
    <tr className="group transition-colors hover:bg-background">
      <td className="px-4 py-2.5">
        <Link className="font-medium text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" to={`/jobs/${job.id}`}>{job.title}</Link>
        <p className="text-sm text-muted-foreground">{job.customerName}</p>
      </td>
      <td className="px-4 py-2.5"><StatusBadge tone={priorityTone[job.priority]}>{job.priority}</StatusBadge></td>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5">
          {job.status === 'completed' ? <Check aria-hidden="true" className="size-3.5 text-emerald-600" /> : null}
          <StatusBadge tone={statusTone[job.status]}>{JOB_STATUS_LABELS[job.status]}</StatusBadge>
        </span>
      </td>
      <td className={overdue ? 'px-4 py-2.5 font-medium text-destructive' : 'px-4 py-2.5 text-muted-foreground'}>
        {overdue ? 'Overdue · ' : ''}{formatTimestamp(job.dueDate)}
      </td>
      <td className="px-4 py-2.5">
        <span className={job.assignedEmployeeIds.length === 0 ? 'font-medium text-amber-700' : 'text-foreground'}>
          {formatAssignedEmployees(job.assignedEmployeeIds, employeeNamesById)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link className="font-medium text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/30" to={primaryAction.href}>{primaryAction.label}</Link>
          {job.status === 'open' && job.assignedEmployeeIds.length === 0 ? (
            <Link className="text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" to={`/jobs/${job.id}#assignment-controls`}>Review AI recommendation</Link>
          ) : null}
          {job.status === 'assigned' ? (
            <Link className="text-xs font-medium text-destructive hover:text-destructive/80 focus:outline-none focus:ring-2 focus:ring-primary/30" to={`/jobs/${job.id}#assignment-controls`}>Unassign</Link>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

function JobCard({ employeeNamesById, job }: { employeeNamesById: Map<string, string>; job: Job }) {
  const primaryAction = getJobPrimaryAction(job)
  const overdue = isJobOverdue(job)
  return (
    <article className="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link className="font-medium text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" to={`/jobs/${job.id}`}>{job.title}</Link>
          <p className="mt-0.5 text-sm text-muted-foreground">{job.customerName}</p>
        </div>
        <Link className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" to={primaryAction.href}>{primaryAction.label}</Link>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge tone={priorityTone[job.priority]}>{job.priority}</StatusBadge>
        <StatusBadge tone={statusTone[job.status]}>{JOB_STATUS_LABELS[job.status]}</StatusBadge>
        <span className={overdue ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>{overdue ? 'Overdue · ' : ''}{formatTimestamp(job.dueDate)}</span>
      </div>
      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={job.assignedEmployeeIds.length === 0 ? 'text-sm font-medium text-amber-700' : 'text-sm text-foreground'}>{formatAssignedEmployees(job.assignedEmployeeIds, employeeNamesById)}</p>
        <div className="flex flex-wrap gap-3">
          {job.status === 'open' && job.assignedEmployeeIds.length === 0 ? <Link className="text-sm font-medium text-muted-foreground hover:text-foreground" to={`/jobs/${job.id}#assignment-controls`}>Review AI recommendation</Link> : null}
          {job.status === 'assigned' ? <Link className="text-sm font-medium text-destructive" to={`/jobs/${job.id}#assignment-controls`}>Unassign</Link> : null}
        </div>
      </div>
    </article>
  )
}

function FilterSelect({ children, icon, label, onChange, value }: { children: ReactNode; icon: ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-3.5 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-muted-foreground">{icon}</span>
      <select className="h-10 w-full appearance-none rounded-lg border border-border bg-background pl-10 pr-10 text-sm text-foreground outline-none transition hover:border-muted-foreground/40 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20" onChange={(event) => onChange(event.target.value)} value={value}>{children}</select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </label>
  )
}

function TableMessage({ action, children, tone = 'default' }: { action?: ReactNode; children: ReactNode; tone?: 'danger' | 'default' }) {
  return <tr><td className={tone === 'danger' ? 'px-4 py-8 text-center text-destructive' : 'px-4 py-8 text-center text-muted-foreground'} colSpan={6}><div className="flex flex-col items-center gap-3"><span>{children}</span>{action}</div></td></tr>
}

function ListMessage({ action, children, tone = 'default' }: { action?: ReactNode; children: ReactNode; tone?: 'danger' | 'default' }) {
  return <div className={tone === 'danger' ? 'px-4 py-8 text-center text-sm text-destructive' : 'px-4 py-8 text-center text-sm text-muted-foreground'}><p>{children}</p>{action ? <div className="mt-3">{action}</div> : null}</div>
}

function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return <button className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30" onClick={onClick} type="button">Clear filters</button>
}

function formatAssignedEmployees(assignedEmployeeIds: string[], employeeNamesById: Map<string, string>) {
  if (assignedEmployeeIds.length === 0) return 'Needs assignment'
  return assignedEmployeeIds.map((employeeId) => employeeNamesById.get(employeeId) ?? 'Assigned employee').join(', ')
}

function formatTimestamp(timestamp: Job['dueDate']) {
  if (!timestamp) return 'No due date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp.toDate())
}
