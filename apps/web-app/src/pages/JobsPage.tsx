import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MessageSquare,
  MoreVertical,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'

import {
  CreateJobDrawer,
  JobDetailsDrawer,
  PageHeader,
  PriorityBadge,
  QuickAssignModal,
  RequestsTab,
  StatusBadge,
  WhatsAppPhoneSimulator,
  WhatsAppReviewDrawer,
} from '@/components'

import { JOB_PRIORITY_OPTIONS } from '@/constants/jobConstants'
import { useAuth } from '@/hooks'
import { toJsDate } from '@/services/common'
import { jobService } from '@/services/jobs'
import { whatsappDemoService } from '@/services/whatsapp/whatsappDemoService'
import {
  JOB_STATUS_LABELS,
  type Job,
  type JobPriority,
  type JobStatus,
  type ProposedAction,
  type ProposedCreateJobPayload,
  type UserProfile,
} from '@/types'
import {
  isJobOverdue,
  matchesJobQuickFilter,
  parseJobQuickFilter,
  type JobQuickFilter,
} from '@/utils'
import { cn } from '@/utils'

type AssignedFilter = 'all' | 'assigned' | 'unassigned'

const quickFilters: Array<{ label: string; value: JobQuickFilter }> = [
  { label: 'All jobs', value: 'all' },
  { label: 'Needs assignment', value: 'needs-assignment' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In progress', value: 'in-progress' },
]

const PAGE_SIZE = 10

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
  const [quickAssignJob, setQuickAssignJob] = useState<Job | null>(null)
  const [selectedDrawerJobId, setSelectedDrawerJobId] = useState<string | null>(null)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const isRequestsTabFromUrl =
    searchParams.get('tab') === 'whatsapp' ||
    searchParams.get('view') === 'whatsapp-requests'
  const [activeMainTabState, setActiveMainTabState] = useState<'jobs' | 'requests' | null>(null)
  const activeMainTab = activeMainTabState ?? (isRequestsTabFromUrl ? 'requests' : 'jobs')

  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<ProposedAction<ProposedCreateJobPayload> | null>(null)


  const handleJobQuickAssigned = (updatedJob: Job) => {
    setJobs((prevJobs) =>
      prevJobs.map((j) => (j.id === updatedJob.id ? updatedJob : j))
    )
  }

  const handleJobCreated = (newJob: Job) => {
    setJobs((prevJobs) => [newJob, ...prevJobs])
    setSelectedDrawerJobId(newJob.id)
  }

  const [isRefreshing, setIsRefreshing] = useState(false)
  const isFetchingRef = useRef(false)

  const handleRefresh = useCallback(
    async (bypassCache = true, silent = false) => {
      if (!profile || isFetchingRef.current) return
      isFetchingRef.current = true
      if (!silent) setIsRefreshing(true)
      try {
        const [loadedJobs, loadedEmployees] = await Promise.all([
          jobService.listJobs(profile, profile.organizationId, { bypassCache }),
          jobService
            .listAssignableEmployees(profile, profile.organizationId)
            .catch(() => []),
        ])
        setJobs(loadedJobs)
        setEmployees(loadedEmployees)
      } catch {
        // ignore
      } finally {
        isFetchingRef.current = false
        if (!silent) setIsRefreshing(false)
      }
    },
    [profile],
  )

  useEffect(() => {
    if (!profile) return
    let isMounted = true

    jobService
      .listAssignableEmployees(profile, profile.organizationId)
      .then((loadedEmployees) => {
        if (isMounted) setEmployees(loadedEmployees)
      })
      .catch((error: unknown) => {
        if (import.meta.env.DEV) {
          console.error('Failed to load employee display names.', error)
        }
      })

    const unsubscribe = jobService.subscribeToJobs(
      profile,
      profile.organizationId,
      (loadedJobs) => {
        if (isMounted) {
          setJobs(loadedJobs)
          setIsLoading(false)
        }
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.error('Failed to subscribe to jobs list.', error)
        }
        if (isMounted) {
          setErrorMessage('Unable to load jobs. Please try again.')
          setIsLoading(false)
        }
      },
    )

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [profile])

  // Silent sync on tab visibility or focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && profile) {
        void handleRefresh(true, true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [profile, handleRefresh])

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

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE))
  const paginatedJobs = useMemo(
    () => filteredJobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredJobs, currentPage],
  )

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
    setCurrentPage(1)
  }

  function clearFilters() {
    setSearchQuery('')
    setStatusFilter('all')
    setAssignedFilter('all')
    setPriorityFilter('all')
    setCreatedByFilter('all')
    selectQuickFilter(isAssignmentsView ? 'needs-assignment' : 'all')
    setCurrentPage(1)
  }

  return (
    <div className="space-y-3">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            <button
              aria-label="Refresh jobs list"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
              disabled={isRefreshing}
              onClick={() => void handleRefresh(true)}
              type="button"
            >
              <RefreshCcw aria-hidden="true" className={cn('size-3.5', isRefreshing && 'animate-spin')} />
              <span>Refresh</span>
            </button>
          </div>
        }
        title={isAssignmentsView ? 'Assignments' : 'Jobs'}
      />

      <div className="flex border-b border-wf-border gap-6">
        <button
          className={cn(
            'pb-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px flex items-center gap-2',
            activeMainTab === 'jobs'
              ? 'border-wf-ink text-wf-ink font-semibold'
              : 'border-transparent text-wf-ink-3 hover:text-wf-ink hover:border-wf-border',
          )}
          onClick={() => {
            setActiveMainTabState('jobs')
            const nextParams = new URLSearchParams(searchParams)
            nextParams.delete('tab')
            if (nextParams.get('view') === 'whatsapp-requests') nextParams.delete('view')
            setSearchParams(nextParams, { replace: true })
          }}
          type="button"
        >
          <span>Jobs Directory</span>
        </button>

        <button
          className={cn(
            'pb-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px flex items-center gap-2',
            activeMainTab === 'requests'
              ? 'border-wf-ink text-wf-ink font-semibold'
              : 'border-transparent text-wf-ink-3 hover:text-wf-ink hover:border-wf-border',
          )}
          onClick={() => {
            setActiveMainTabState('requests')
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('tab', 'whatsapp')
            setSearchParams(nextParams, { replace: true })
          }}
          type="button"
        >
          <MessageSquare className="size-3.5 text-wf-ink-3" />
          <span>Incoming Requests</span>
          <span className="rounded-full bg-wf-surface-sunken border border-wf-border px-1.5 py-0.5 text-[10px] font-medium text-wf-ink-2">
            WhatsApp
          </span>
        </button>
      </div>

      {activeMainTab === 'requests' ? (
        <RequestsTab
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          onSelectProposal={(p) => setSelectedProposal(p)}
        />
      ) : (
        <>
          <section aria-label="Job filters" className="rounded-card border border-wf-border bg-wf-surface p-3 shadow-card space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-wf-ink-3" />
            <input
              aria-label="Search jobs"
              className="h-9 w-full rounded-control border border-wf-border bg-wf-surface pl-9 pr-4 text-[13px] text-wf-ink outline-none transition placeholder:text-wf-ink-3 focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search title, customer name, or address..."
              type="search"
              value={searchQuery}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 overflow-x-auto rounded-control border border-wf-border bg-wf-surface-raised p-1" role="group" aria-label="Quick filters">
              {quickFilters.map((filter) => {
                const isActive = quickFilter === filter.value
                return (
                  <button
                    aria-pressed={isActive}
                    className={cn(
                      'inline-flex h-7 shrink-0 items-center rounded-control px-2.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-wf-accent/30',
                      isActive
                        ? 'bg-wf-accent text-white font-semibold'
                        : 'text-wf-ink-2 hover:bg-wf-surface hover:text-wf-ink',
                    )}
                    key={filter.value}
                    onClick={() => selectQuickFilter(filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>

            <button
              aria-expanded={showMoreFilters}
              className={cn(
                'inline-flex h-9 items-center justify-center gap-2 rounded-control border px-3 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-wf-accent/30',
                showMoreFilters || advancedFilterCount > 0
                  ? 'border-wf-accent/40 bg-wf-accent-wash text-wf-accent'
                  : 'border-wf-border bg-wf-surface text-wf-ink-2 hover:bg-wf-surface-sunken hover:text-wf-ink',
              )}
              onClick={() => setShowMoreFilters((current) => !current)}
              type="button"
            >
              <SlidersHorizontal aria-hidden="true" className="size-3.5" />
              <span>Filters</span>
              {advancedFilterCount > 0 ? (
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-wf-accent text-[10px] font-semibold text-white">
                  {advancedFilterCount}
                </span>
              ) : null}
              <ChevronDown aria-hidden="true" className={cn('size-3.5 text-wf-ink-3 transition', showMoreFilters && 'rotate-180')} />
            </button>

            {hasActiveFilters ? (
              <button
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-3 transition-colors hover:bg-wf-surface-sunken hover:text-wf-ink focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
                onClick={clearFilters}
                type="button"
              >
                <X aria-hidden="true" className="size-3.5" />
                <span>Clear</span>
              </button>
            ) : null}
          </div>
        </div>

        {showMoreFilters ? (
          <div className="mt-2.5 grid gap-2 border-t border-wf-separator pt-2.5 md:grid-cols-2">
            <FilterSelect
              icon={<Filter aria-hidden="true" className="size-4" />}
              label="Priority"
              onChange={(value) => {
                setPriorityFilter(value as JobPriority | 'all')
                setCurrentPage(1)
              }}
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
              onChange={(value) => {
                setCreatedByFilter(value)
                setCurrentPage(1)
              }}
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

      <section aria-labelledby="jobs-list-heading" className="overflow-hidden rounded-card border border-wf-border bg-wf-surface shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-wf-separator px-4 py-3">
          <h2 className="text-[17px] font-semibold leading-[24px] text-wf-ink" id="jobs-list-heading">
            {isAssignmentsView ? 'Assignment queue' : 'Job list'}
          </h2>
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-wf-ink-3">
            {filteredJobs.length} result{filteredJobs.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-wf-separator bg-wf-surface-raised">
                {['Job / customer', 'Priority', 'Status', 'Due', 'Assigned employee', 'Actions'].map((header) => (
                  <th className="px-4 py-3 text-[13px] font-medium leading-[18px] text-wf-ink-3" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-wf-separator text-[15px] leading-[22px]">
              {isLoading ? <TableMessage>Loading jobs...</TableMessage> : null}
              {!isLoading && errorMessage ? <TableMessage tone="danger">{errorMessage}</TableMessage> : null}
              {!isLoading && !errorMessage && filteredJobs.length === 0 ? (
                <TableMessage action={hasActiveFilters ? <ClearFiltersButton onClick={clearFilters} /> : null}>
                  {hasActiveFilters ? 'No jobs match these filters.' : 'No jobs are available yet.'}
                </TableMessage>
              ) : null}
              {!isLoading && !errorMessage ? paginatedJobs.map((job) => (
                <JobTableRow
                  employeeNamesById={employeeNamesById}
                  job={job}
                  key={job.id}
                  onQuickAssign={(targetJob) => setQuickAssignJob(targetJob)}
                  onSelectJob={(targetJobId) => setSelectedDrawerJobId(targetJobId)}
                />
              )) : null}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-wf-separator xl:hidden">
          {isLoading ? <ListMessage>Loading jobs...</ListMessage> : null}
          {!isLoading && errorMessage ? <ListMessage tone="danger">{errorMessage}</ListMessage> : null}
          {!isLoading && !errorMessage && filteredJobs.length === 0 ? (
            <ListMessage action={hasActiveFilters ? <ClearFiltersButton onClick={clearFilters} /> : null}>
              {hasActiveFilters ? 'No jobs match these filters.' : 'No jobs are available yet.'}
            </ListMessage>
          ) : null}
          {!isLoading && !errorMessage ? paginatedJobs.map((job) => (
            <JobCard
              employeeNamesById={employeeNamesById}
              job={job}
              key={job.id}
              onQuickAssign={(targetJob) => setQuickAssignJob(targetJob)}
              onSelectJob={(targetJobId) => setSelectedDrawerJobId(targetJobId)}
            />
          )) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-wf-separator bg-wf-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-[13px] text-wf-ink-3">
          <span className="tabular-nums">
            Showing {filteredJobs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredJobs.length)} of {filteredJobs.length} jobs
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-wf-ink tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                aria-label="Previous page"
                className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-2.5 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Previous</span>
              </button>
              <button
                aria-label="Next page"
                className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-2.5 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                type="button"
              >
                <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
        </>
      )}

      <QuickAssignModal
        isOpen={Boolean(quickAssignJob)}
        job={quickAssignJob}
        onAssigned={handleJobQuickAssigned}
        onClose={() => setQuickAssignJob(null)}
      />

      <JobDetailsDrawer
        isOpen={Boolean(selectedDrawerJobId)}
        jobId={selectedDrawerJobId}
        onClose={() => setSelectedDrawerJobId(null)}
        onJobUpdated={handleJobQuickAssigned}
      />

      <CreateJobDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onJobCreated={handleJobCreated}
      />

      <WhatsAppPhoneSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onProposalCreated={async (newProposalId) => {
          setIsSimulatorOpen(false)
          setActiveMainTabState('requests')
          const nextParams = new URLSearchParams(searchParams)
          nextParams.set('tab', 'whatsapp')
          setSearchParams(nextParams, { replace: true })
          if (newProposalId && profile) {
            const list = await whatsappDemoService.listWhatsAppProposals(profile)
            const created = list.find((p) => p.proposalId === newProposalId)
            if (created) {
              setSelectedProposal(created)
            }
          }
        }}
      />

      <WhatsAppReviewDrawer
        key={selectedProposal?.proposalId || 'none'}
        isOpen={Boolean(selectedProposal)}
        onClose={() => setSelectedProposal(null)}
        onConfirmed={async (jobId) => {
          setSelectedProposal(null)
          setActiveMainTabState('jobs')
          await handleRefresh(true)
          setSelectedDrawerJobId(jobId)
        }}
        proposal={selectedProposal}
      />
    </div>
  )
}

function JobTableRow({
  employeeNamesById,
  job,
  onQuickAssign,
  onSelectJob,
}: {
  employeeNamesById: Map<string, string>
  job: Job
  onQuickAssign: (job: Job) => void
  onSelectJob: (jobId: string) => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const overdue = isJobOverdue(job) && job.status !== 'completed'
  const isUnassigned = job.status === 'open' && job.assignedEmployeeIds.length === 0
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMenuOpen) return undefined
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isMenuOpen])

  return (
    <tr
      className="h-14 cursor-pointer transition-colors hover:bg-wf-surface-sunken"
      onClick={() => onSelectJob(job.id)}
    >
      <td className="px-4 py-2.5">
        <button
          className="text-left text-[15px] font-medium leading-[20px] text-wf-ink hover:text-wf-accent focus:outline-none"
          onClick={(e) => {
            e.stopPropagation()
            onSelectJob(job.id)
          }}
          type="button"
        >
          {job.title}
        </button>
        <p className="mt-0.5 text-[13px] font-normal leading-[18px] text-wf-ink-3">
          {job.customerName}
        </p>
      </td>
      <td className="px-4 py-2.5">
        <PriorityBadge priority={job.priority} />
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge tone={overdue ? 'danger' : job.status === 'completed' ? 'success' : 'default'}>
          {JOB_STATUS_LABELS[job.status]}
        </StatusBadge>
      </td>
      <td className="px-4 py-2.5">
        <span
          className={cn(
            'text-[13px] tabular-nums',
            overdue ? 'font-medium text-wf-danger' : 'font-normal text-wf-ink-3',
          )}
        >
          {overdue ? `${formatDueSeverity(job.dueDate)}, ` : ''}
          {formatTimestamp(job.dueDate)}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span
          className={cn(
            'text-[13px] font-normal leading-[18px]',
            job.assignedEmployeeIds.length === 0 ? 'font-medium text-wf-warn' : 'text-wf-ink-2',
          )}
        >
          {formatAssignedEmployees(job.assignedEmployeeIds, employeeNamesById)}
        </span>
      </td>
      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5" ref={menuRef}>
          {isUnassigned ? (
            <button
              className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken hover:text-wf-accent focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
              onClick={() => onQuickAssign(job)}
              type="button"
            >
              Assign
            </button>
          ) : (
            <button
              className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card transition-colors hover:bg-wf-surface-sunken hover:text-wf-accent focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
              onClick={() => onSelectJob(job.id)}
              type="button"
            >
              Open
            </button>
          )}

          <div className="relative">
            <button
              aria-label={`More options for ${job.title}`}
              className="inline-flex size-8 items-center justify-center rounded-control text-wf-ink-3 transition-colors hover:bg-wf-surface-sunken hover:text-wf-ink focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              type="button"
            >
              <MoreVertical aria-hidden="true" className="size-4" />
            </button>

            {isMenuOpen ? (
              <div
                className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-sheet border border-wf-border bg-wf-surface p-1 shadow-card space-y-0.5 text-[13px] font-medium text-wf-ink-2"
                role="menu"
              >
                <button
                  className="flex w-full items-center rounded-control px-2.5 py-1.5 text-left hover:bg-wf-surface-sunken hover:text-wf-ink transition-colors"
                  onClick={() => {
                    setIsMenuOpen(false)
                    onSelectJob(job.id)
                  }}
                  role="menuitem"
                  type="button"
                >
                  Open job details
                </button>
                <button
                  className="flex w-full items-center rounded-control px-2.5 py-1.5 text-left hover:bg-wf-surface-sunken hover:text-wf-ink transition-colors"
                  onClick={() => {
                    setIsMenuOpen(false)
                    onQuickAssign(job)
                  }}
                  role="menuitem"
                  type="button"
                >
                  {job.assignedEmployeeIds.length > 0 ? 'Reassign worker' : 'Quick assign'}
                </button>
                {job.status === 'assigned' ? (
                  <button
                    className="flex w-full items-center rounded-control px-2.5 py-1.5 text-left text-wf-danger hover:bg-wf-danger-wash transition-colors"
                    onClick={() => {
                      setIsMenuOpen(false)
                      onSelectJob(job.id)
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Unassign
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  )
}

function JobCard({
  employeeNamesById,
  job,
  onQuickAssign,
  onSelectJob,
}: {
  employeeNamesById: Map<string, string>
  job: Job
  onQuickAssign: (job: Job) => void
  onSelectJob: (jobId: string) => void
}) {
  const overdue = isJobOverdue(job) && job.status !== 'completed'
  const isUnassigned = job.status === 'open' && job.assignedEmployeeIds.length === 0

  return (
    <article
      className="cursor-pointer p-3.5 transition-colors hover:bg-wf-surface-sunken"
      onClick={() => onSelectJob(job.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            className="text-left text-[15px] font-medium leading-[20px] text-wf-ink hover:text-wf-accent focus:outline-none"
            onClick={(e) => {
              e.stopPropagation()
              onSelectJob(job.id)
            }}
            type="button"
          >
            {job.title}
          </button>
          <p className="mt-0.5 text-[13px] font-normal text-wf-ink-3">{job.customerName}</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          {isUnassigned ? (
            <button
              className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card hover:bg-wf-surface-sunken hover:text-wf-accent focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
              onClick={() => onQuickAssign(job)}
              type="button"
            >
              Assign
            </button>
          ) : (
            <button
              className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card hover:bg-wf-surface-sunken hover:text-wf-accent focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
              onClick={() => onSelectJob(job.id)}
              type="button"
            >
              Open
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={job.priority} />
        <StatusBadge tone={overdue ? 'danger' : job.status === 'completed' ? 'success' : 'default'}>
          {JOB_STATUS_LABELS[job.status]}
        </StatusBadge>
        <span
          className={cn(
            'text-[13px] tabular-nums',
            overdue ? 'font-medium text-wf-danger' : 'text-wf-ink-3',
          )}
        >
          {overdue ? `${formatDueSeverity(job.dueDate)}, ` : ''}
          {formatTimestamp(job.dueDate)}
        </span>
      </div>

      <div className="mt-2.5 flex flex-col gap-2 border-t border-wf-separator pt-2.5 sm:flex-row sm:items-center sm:justify-between text-[13px]">
        <p className={job.assignedEmployeeIds.length === 0 ? 'font-medium text-wf-warn' : 'text-wf-ink-2'}>
          {formatAssignedEmployees(job.assignedEmployeeIds, employeeNamesById)}
        </p>
      </div>
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
      <span className="pointer-events-none absolute left-3.5 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-wf-ink-3">
        {icon}
      </span>
      <select
        className="h-9 w-full appearance-none rounded-control border border-wf-border bg-wf-surface pl-10 pr-10 text-[13px] text-wf-ink outline-none transition hover:border-wf-ink-3 focus:border-wf-accent focus:ring-2 focus:ring-wf-accent/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-wf-ink-3" />
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
        className={cn(
          'px-4 py-8 text-center text-[13px]',
          tone === 'danger' ? 'text-wf-danger font-medium' : 'text-wf-ink-3',
        )}
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
      className={cn(
        'px-4 py-8 text-center text-[13px]',
        tone === 'danger' ? 'text-wf-danger font-medium' : 'text-wf-ink-3',
      )}
    >
      <p>{children}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex h-8 items-center justify-center rounded-control border border-wf-border bg-wf-surface px-3 text-[13px] font-medium text-wf-ink-2 shadow-card hover:bg-wf-surface-sunken focus:outline-none focus:ring-2 focus:ring-wf-accent/30"
      onClick={onClick}
      type="button"
    >
      Clear filters
    </button>
  )
}

function formatAssignedEmployees(assignedEmployeeIds: string[], employeeNamesById: Map<string, string>) {
  if (assignedEmployeeIds.length === 0) return 'Needs assignment'
  return assignedEmployeeIds
    .map((employeeId) => employeeNamesById.get(employeeId) ?? 'Assigned employee')
    .join(', ')
}

function formatDueSeverity(dueDate: Job['dueDate']): string {
  const date = toJsDate(dueDate)
  if (!date) return 'Overdue'
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} overdue`
  }
  return 'Overdue'
}

function formatTimestamp(timestamp: Job['dueDate']) {
  const date = toJsDate(timestamp)
  if (!date) return 'No due date'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}
