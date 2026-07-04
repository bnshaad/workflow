import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  ClipboardList,
  MapPin,
  Paperclip,
  Phone,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '@/components'
import { useAuth } from '@/hooks'
import { canAssignWorker, canEditJob } from '@/permissions'
import {
  AssignmentRecommendationError,
  assignmentRecommendationService,
} from '@/services/recommendations'
import { jobService } from '@/services/jobs'
import {
  type AssignmentRecommendation,
  type AssignmentRecommendationCandidate,
  type AssignmentScoreBreakdown,
  getAllowedJobStatusTransitions,
  JOB_STATUS_LABELS,
  JobStatuses,
  type Job,
  type JobActivity,
  type JobPriority,
  type JobStatus,
  type UserProfile,
} from '@/types'

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

export function JobDetailsPage() {
  const { jobId } = useParams()
  const { profile } = useAuth()
  const [activities, setActivities] = useState<JobActivity[]>([])
  const [assignableEmployees, setAssignableEmployees] = useState<UserProfile[]>([])
  const [assignmentErrorMessage, setAssignmentErrorMessage] = useState('')
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [assignmentSuccessMessage, setAssignmentSuccessMessage] = useState('')
  const [job, setJob] = useState<Job | null>(null)
  const [managedEmployeeIds, setManagedEmployeeIds] = useState<string[]>([])
  const [manageAssignmentErrorMessage, setManageAssignmentErrorMessage] =
    useState('')
  const [manageAssignmentSearch, setManageAssignmentSearch] = useState('')
  const [manageAssignmentSuccessMessage, setManageAssignmentSuccessMessage] =
    useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [recommendation, setRecommendation] =
    useState<AssignmentRecommendation | null>(null)
  const [recommendationErrorMessage, setRecommendationErrorMessage] =
    useState('')
  const [statusErrorMessage, setStatusErrorMessage] = useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | ''>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] =
    useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isManagingAssignment, setIsManagingAssignment] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadJob() {
      if (!profile || !jobId) {
        return
      }

      setIsLoading(true)
      setErrorMessage('')
      setAssignmentErrorMessage('')
      setAssignmentSuccessMessage('')
      setManageAssignmentErrorMessage('')
      setManageAssignmentSuccessMessage('')
      setRecommendation(null)
      setRecommendationErrorMessage('')
      setStatusErrorMessage('')

      try {
        const [loadedJob, loadedActivities, loadedEmployees] = await Promise.all([
          jobService.getJob(profile, jobId, profile.organizationId),
          jobService.getJobActivities(profile, jobId, profile.organizationId),
          jobService.listAssignableEmployees(profile, profile.organizationId),
        ])

        if (!isMounted) {
          return
        }

        if (!loadedJob) {
          setErrorMessage('Job not found.')
          setJob(null)
          setActivities([])
          return
        }

        setJob(loadedJob)
        setManagedEmployeeIds(loadedJob.assignedEmployeeIds)
        setActivities(loadedActivities)
        setAssignableEmployees(loadedEmployees)
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load job details. Please try again.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadJob()

    return () => {
      isMounted = false
    }
  }, [jobId, profile])

  const allowedStatuses = useMemo(() => {
    if (!job) {
      return []
    }

    return getAllowedJobStatusTransitions(job.status)
      .filter((status) => status !== JobStatuses.Assigned)
  }, [job])
  const canUpdateStatus = profile ? canEditJob(profile) : false
  const filteredAssignableEmployees = useMemo(() => {
    const normalizedSearch = assignmentSearch.trim().toLowerCase()

    if (normalizedSearch.length === 0) {
      return assignableEmployees
    }

    return assignableEmployees.filter((employee) => {
      return (
        employee.displayName.toLowerCase().includes(normalizedSearch) ||
        employee.email.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [assignableEmployees, assignmentSearch])
  const filteredManageableEmployees = useMemo(() => {
    const normalizedSearch = manageAssignmentSearch.trim().toLowerCase()

    if (normalizedSearch.length === 0) {
      return assignableEmployees
    }

    return assignableEmployees.filter((employee) => {
      return (
        employee.displayName.toLowerCase().includes(normalizedSearch) ||
        employee.email.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [assignableEmployees, manageAssignmentSearch])
  const assignedEmployeeNames = useMemo(() => {
    return getAssignedEmployeeNames(job?.assignedEmployeeIds ?? [], assignableEmployees)
  }, [assignableEmployees, job?.assignedEmployeeIds])
  const canAssignEmployees =
    Boolean(profile && canAssignWorker(profile)) && job?.status === JobStatuses.Open
  const canGenerateRecommendations = canAssignEmployees
  const canManageAssignment =
    Boolean(profile && canAssignWorker(profile)) &&
    job?.status === JobStatuses.Assigned

  async function handleGenerateRecommendations() {
    if (!profile || !job) {
      return
    }

    setIsGeneratingRecommendation(true)
    setRecommendationErrorMessage('')

    try {
      const result =
        await assignmentRecommendationService.generateAssignmentRecommendations(
          profile,
          job.organizationId,
          job.id,
        )

      setRecommendation(result.recommendation)
    } catch (error) {
      if (error instanceof AssignmentRecommendationError) {
        setRecommendationErrorMessage(error.message)
      } else {
        setRecommendationErrorMessage(
          'Unable to generate recommendations. Please try again.',
        )
      }
    } finally {
      setIsGeneratingRecommendation(false)
    }
  }

  async function handleStatusUpdate() {
    if (!profile || !job || !selectedStatus) {
      return
    }

    setIsUpdatingStatus(true)
    setStatusErrorMessage('')

    try {
      const result = await jobService.updateJobStatus(
        profile,
        job.id,
        job.organizationId,
        selectedStatus,
      )

      setJob(result.job)
      setActivities((currentActivities) => [
        result.activity,
        ...currentActivities,
      ])
      setSelectedStatus('')
    } catch {
      setStatusErrorMessage('Unable to update status. Please try again.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  async function handleAssignEmployees() {
    if (!profile || !job) {
      return
    }

    setIsAssigning(true)
    setAssignmentErrorMessage('')
    setAssignmentSuccessMessage('')

    try {
      const result = await jobService.assignEmployeesToJob(
        profile,
        job.id,
        job.organizationId,
        selectedEmployeeIds,
      )

      setJob(result.job)
      setActivities((currentActivities) => [
        result.activity,
        ...currentActivities,
      ])
      setSelectedEmployeeIds([])
      setAssignmentSearch('')
      setAssignmentSuccessMessage(
        `${result.assignedEmployees.length} employee${
          result.assignedEmployees.length === 1 ? '' : 's'
        } assigned.`,
      )
      setManagedEmployeeIds(result.job.assignedEmployeeIds)
    } catch {
      setAssignmentErrorMessage('Unable to assign employees. Please try again.')
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleUpdateAssignedEmployees() {
    if (!profile || !job) {
      return
    }

    setIsManagingAssignment(true)
    setManageAssignmentErrorMessage('')
    setManageAssignmentSuccessMessage('')

    try {
      const result = await jobService.updateAssignedEmployees(
        profile,
        job.id,
        job.organizationId,
        managedEmployeeIds,
      )

      setJob(result.job)
      setActivities((currentActivities) => [
        result.activity,
        ...currentActivities,
      ])
      setManagedEmployeeIds(result.job.assignedEmployeeIds)
      setManageAssignmentSearch('')
      setManageAssignmentSuccessMessage('Assignment updated.')
    } catch {
      setManageAssignmentErrorMessage(
        'Unable to update assignment. Please try again.',
      )
    } finally {
      setIsManagingAssignment(false)
    }
  }

  async function handleUnassignAllEmployees() {
    if (!profile || !job) {
      return
    }

    const confirmed = window.confirm(
      'Remove all assigned employees from this job?',
    )

    if (!confirmed) {
      return
    }

    setIsManagingAssignment(true)
    setManageAssignmentErrorMessage('')
    setManageAssignmentSuccessMessage('')

    try {
      const result = await jobService.unassignEmployeesFromJob(
        profile,
        job.id,
        job.organizationId,
      )

      setJob(result.job)
      setActivities((currentActivities) => [
        result.activity,
        ...currentActivities,
      ])
      setManagedEmployeeIds([])
      setManageAssignmentSearch('')
      setManageAssignmentSuccessMessage('All employees removed.')
    } catch {
      setManageAssignmentErrorMessage(
        'Unable to unassign employees. Please try again.',
      )
    } finally {
      setIsManagingAssignment(false)
    }
  }

  function toggleEmployeeSelection(employeeId: string) {
    setSelectedEmployeeIds((currentIds) => {
      if (currentIds.includes(employeeId)) {
        return currentIds.filter((currentId) => currentId !== employeeId)
      }

      return [...currentIds, employeeId]
    })
  }

  function toggleManagedEmployeeSelection(employeeId: string) {
    setManagedEmployeeIds((currentIds) => {
      if (currentIds.includes(employeeId)) {
        return currentIds.filter((currentId) => currentId !== employeeId)
      }

      return [...currentIds, employeeId]
    })
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
        Loading job details...
      </div>
    )
  }

  if (errorMessage || !job) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
          {errorMessage || 'Job not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link className="transition hover:text-foreground" to="/jobs">
          Jobs
        </Link>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span className="font-medium text-foreground">{job.title}</span>
      </nav>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {job.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge tone={statusTone[job.status]}>
              {JOB_STATUS_LABELS[job.status]}
            </StatusBadge>
            <StatusBadge tone={priorityTone[job.priority]}>
              {job.priority}
            </StatusBadge>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar aria-hidden="true" className="size-4" />
              Created {formatTimestamp(job.createdAt)}
            </span>
          </div>
        </div>
        <BackLink />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <InfoCard title="Job Information">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <DetailItem label="Description">{job.description}</DetailItem>
              </div>
              <DetailItem label="Priority">
                <StatusBadge tone={priorityTone[job.priority]}>
                  {job.priority}
                </StatusBadge>
              </DetailItem>
              <DetailItem label="Status">
                <StatusBadge tone={statusTone[job.status]}>
                  {JOB_STATUS_LABELS[job.status]}
                </StatusBadge>
              </DetailItem>
              <DetailItem label="Required Skills">
                <SkillList skills={job.requiredSkills} />
              </DetailItem>
              <DetailItem label="Location">
                {job.location || 'No location note'}
              </DetailItem>
            </div>
          </InfoCard>

          <InfoCard title="Customer Information">
            <div className="grid gap-6 md:grid-cols-3">
              <DetailItem label="Customer Name">{job.customerName}</DetailItem>
              <DetailItem label="Phone">
                <span className="inline-flex items-center gap-2">
                  <Phone aria-hidden="true" className="size-4 text-muted-foreground" />
                  {job.customerPhone}
                </span>
              </DetailItem>
              <DetailItem label="Service Address">
                <span className="inline-flex items-start gap-2">
                  <MapPin
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-muted-foreground"
                  />
                  {job.serviceAddress}
                </span>
              </DetailItem>
            </div>
          </InfoCard>

          <InfoCard title="Assigned Employees">
            <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              {assignedEmployeeNames.length === 0
                ? 'Unassigned'
                : assignedEmployeeNames.join(', ')}
            </div>
          </InfoCard>

          <InfoCard title="Attachments">
            <div className="flex min-h-20 items-center gap-3 rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              <Paperclip aria-hidden="true" className="size-4" />
              {job.attachments.length === 0
                ? 'No attachments uploaded yet.'
                : `${job.attachments.length} attachment metadata records`}
            </div>
          </InfoCard>
        </div>

        <aside className="space-y-6">
          {job.status === JobStatuses.Open ? (
            <InfoCard title="AI Assignment Recommendations">
              <div className="space-y-5">
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
                  <span className="font-medium">
                    AI-assisted recommendation — manager approval required.
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    Recommendations are advisory and do not assign employees.
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    Location contributes 0/10 until employee service-area data exists.
                  </span>
                </div>

                {canGenerateRecommendations ? (
                  <button
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isGeneratingRecommendation}
                    onClick={handleGenerateRecommendations}
                    type="button"
                  >
                    <Sparkles aria-hidden="true" className="size-4" />
                    {isGeneratingRecommendation
                      ? 'Generating...'
                      : recommendation
                        ? 'Retry Recommendations'
                        : 'Generate Recommendations'}
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Recommendations are available to Admin and Manager users.
                  </p>
                )}

                {recommendationErrorMessage ? (
                  <p className="text-sm font-medium text-destructive">
                    {recommendationErrorMessage}
                  </p>
                ) : null}

                {recommendation ? (
                  recommendation.candidates.length > 0 ? (
                    <div className="space-y-3">
                      {recommendation.candidates.map((candidate) => (
                        <RecommendationCandidateCard
                          candidate={candidate}
                          key={candidate.employeeId}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                      No eligible employees were found for this recommendation.
                    </p>
                  )
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    Generate recommendations to see ranked employees, score
                    breakdowns, and explanation reasons.
                  </p>
                )}
              </div>
            </InfoCard>
          ) : null}

          <InfoCard title="Manual Assignment">
            <div className="space-y-4">
              {job.status === JobStatuses.Assigned ? (
                <p className="text-sm text-muted-foreground">
                  Use Manage Assignment to update assigned employees.
                </p>
              ) : job.status !== JobStatuses.Open ? (
                <p className="text-sm text-muted-foreground">
                  Assignment is available only while the job is open.
                </p>
              ) : canAssignEmployees ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Select active employees from this organization.
                  </p>

                  <div className="relative">
                    <Search
                      aria-hidden="true"
                      className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isAssigning}
                      onChange={(event) => setAssignmentSearch(event.target.value)}
                      placeholder="Search employees..."
                      type="search"
                      value={assignmentSearch}
                    />
                  </div>

                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-2">
                    {filteredAssignableEmployees.length === 0 ? (
                      <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No eligible employees found.
                      </p>
                    ) : (
                      filteredAssignableEmployees.map((employee) => (
                        <label
                          className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm transition hover:bg-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                          key={employee.id}
                        >
                          <input
                            checked={selectedEmployeeIds.includes(employee.id)}
                            className="mt-1 size-4"
                            disabled={isAssigning}
                            onChange={() => toggleEmployeeSelection(employee.id)}
                            type="checkbox"
                          />
                          <span>
                            <span className="block font-medium text-foreground">
                              {employee.displayName}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {employee.email}
                            </span>
                            {employee.skills.length > 0 ? (
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {employee.skills.join(', ')}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  <button
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={selectedEmployeeIds.length === 0 || isAssigning}
                    onClick={handleAssignEmployees}
                    type="button"
                  >
                    {isAssigning ? 'Assigning...' : 'Assign Employees'}
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Assignment is available to Admin and Manager users.
                </p>
              )}

              {assignmentErrorMessage ? (
                <p className="text-sm font-medium text-destructive">
                  {assignmentErrorMessage}
                </p>
              ) : null}
              {assignmentSuccessMessage ? (
                <p className="text-sm font-medium text-emerald-600">
                  {assignmentSuccessMessage}
                </p>
              ) : null}
            </div>
          </InfoCard>

          {job.status === JobStatuses.Assigned ? (
            <InfoCard title="Manage Assignment">
              <div className="space-y-4">
                {canManageAssignment ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Add or remove active employees assigned to this job.
                    </p>
                    <div className="relative">
                      <Search
                        aria-hidden="true"
                        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isManagingAssignment}
                        onChange={(event) =>
                          setManageAssignmentSearch(event.target.value)
                        }
                        placeholder="Search employees..."
                        type="search"
                        value={manageAssignmentSearch}
                      />
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-background p-2">
                      {filteredManageableEmployees.length === 0 ? (
                        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No eligible employees found.
                        </p>
                      ) : (
                        filteredManageableEmployees.map((employee) => (
                          <label
                            className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm transition hover:bg-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                            key={employee.id}
                          >
                            <input
                              checked={managedEmployeeIds.includes(employee.id)}
                              className="mt-1 size-4"
                              disabled={isManagingAssignment}
                              onChange={() =>
                                toggleManagedEmployeeSelection(employee.id)
                              }
                              type="checkbox"
                            />
                            <span>
                              <span className="block font-medium text-foreground">
                                {employee.displayName}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {employee.email}
                              </span>
                              {employee.skills.length > 0 ? (
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  {employee.skills.join(', ')}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                          managedEmployeeIds.length === 0 ||
                          isManagingAssignment
                        }
                        onClick={handleUpdateAssignedEmployees}
                        type="button"
                      >
                        {isManagingAssignment ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-destructive/30 bg-card px-4 text-sm font-medium text-destructive shadow-sm transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isManagingAssignment}
                        onClick={handleUnassignAllEmployees}
                        type="button"
                      >
                        Unassign All
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Assignment changes are available to Admin and Manager users.
                  </p>
                )}
                {manageAssignmentErrorMessage ? (
                  <p className="text-sm font-medium text-destructive">
                    {manageAssignmentErrorMessage}
                  </p>
                ) : null}
                {manageAssignmentSuccessMessage ? (
                  <p className="text-sm font-medium text-emerald-600">
                    {manageAssignmentSuccessMessage}
                  </p>
                ) : null}
              </div>
            </InfoCard>
          ) : null}

          <InfoCard title="Status Management">
            <div className="space-y-4">
              <DetailItem label="Current Status">
                <StatusBadge tone={statusTone[job.status]}>
                  {JOB_STATUS_LABELS[job.status]}
                </StatusBadge>
              </DetailItem>
              {canUpdateStatus ? (
                <div className="space-y-3">
                  <select
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    disabled={allowedStatuses.length === 0 || isUpdatingStatus}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value as JobStatus | '')
                    }
                    value={selectedStatus}
                  >
                    <option value="">
                      {allowedStatuses.length === 0
                        ? 'No transitions available'
                        : 'Select next status'}
                    </option>
                    {allowedStatuses.map((status) => (
                      <option key={status} value={status}>
                        {JOB_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <button
                    className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!selectedStatus || isUpdatingStatus}
                    onClick={handleStatusUpdate}
                    type="button"
                  >
                    {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                  </button>
                  {statusErrorMessage ? (
                    <p className="text-sm font-medium text-destructive">
                      {statusErrorMessage}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Status updates are available to Admin and Manager users.
                </p>
              )}
            </div>
          </InfoCard>

          <InfoCard title="Job Metadata">
            <div className="space-y-5">
              <DetailItem label="Created By">
                <span className="inline-flex items-center gap-2">
                  <UserRound
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                  {job.createdBy}
                </span>
              </DetailItem>
              <DetailItem label="Created Date">
                {formatTimestamp(job.createdAt)}
              </DetailItem>
              <DetailItem label="Due Date">
                {formatNullableTimestamp(job.dueDate)}
              </DetailItem>
              <DetailItem label="Status Updated">
                {formatNullableTimestamp(job.statusUpdatedAt)}
              </DetailItem>
              <DetailItem label="Status Updated By">
                {job.statusUpdatedBy || 'No status update yet'}
              </DetailItem>
            </div>
          </InfoCard>

          <InfoCard title="Status Activity">
            <div className="space-y-4">
              {activities.length === 0 ? (
                <TimelinePlaceholder
                  description="No status changes have been recorded yet."
                  title="No activity"
                />
              ) : (
                activities.map((activity) => (
                  <TimelinePlaceholder
                    description={`${activity.description} ${formatTimestamp(activity.createdAt)}`}
                    key={activity.id}
                    title={getActivityTitle(activity)}
                  />
                ))
              )}
            </div>
          </InfoCard>
        </aside>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
      to="/jobs"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to Jobs
    </Link>
  )
}

function InfoCard({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="border-b border-border pb-4 text-lg font-semibold text-foreground">
        {title}
      </h2>
      <div className="pt-6">{children}</div>
    </section>
  )
}

function DetailItem({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="text-sm leading-6 text-foreground">{children}</div>
    </div>
  )
}

function SkillList({ skills }: { skills: string[] }) {
  if (skills.length === 0) {
    return <span className="text-muted-foreground">No required skills</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
          key={skill}
        >
          {skill}
        </span>
      ))}
    </div>
  )
}

const scoreBreakdownLabels: Record<keyof AssignmentScoreBreakdown, string> = {
  availability: 'Availability',
  locationRelevance: 'Location',
  performance: 'Performance',
  skillMatch: 'Skills',
  workload: 'Workload',
}

function RecommendationCandidateCard({
  candidate,
}: {
  candidate: AssignmentRecommendationCandidate
}) {
  const breakdownEntries = Object.entries(candidate.scoreBreakdown) as Array<
    [keyof AssignmentScoreBreakdown, number]
  >

  return (
    <article className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            #{candidate.rank} {candidate.employeeName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Model score: {candidate.totalScore} points
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {candidate.totalScore} pts
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {breakdownEntries.map(([scoreKey, scoreValue]) => (
          <div
            className="grid grid-cols-[minmax(80px,1fr)_48px] gap-3 text-xs"
            key={scoreKey}
          >
            <span className="text-muted-foreground">
              {scoreBreakdownLabels[scoreKey]}
            </span>
            <span className="text-right font-medium text-foreground">
              {scoreValue}
            </span>
          </div>
        ))}
      </div>

      <ul className="mt-4 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
        {candidate.explanationReasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </article>
  )
}

function TimelinePlaceholder({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-background">
        <ClipboardList aria-hidden="true" className="size-3.5 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function formatNullableTimestamp(timestamp: Job['dueDate']) {
  if (!timestamp) {
    return 'No due date'
  }

  return formatTimestamp(timestamp)
}

function getActivityTitle(activity: JobActivity) {
  if (activity.type === 'employees_assigned') {
    return 'Employees assigned'
  }

  if (activity.type === 'employees_reassigned') {
    return 'Employees reassigned'
  }

  if (activity.type === 'employees_unassigned') {
    return 'Employees unassigned'
  }

  return activity.toStatus
    ? JOB_STATUS_LABELS[activity.toStatus]
    : 'Status updated'
}

function getAssignedEmployeeNames(
  assignedEmployeeIds: string[],
  employees: UserProfile[],
) {
  const employeeNameMap = new Map(
    employees.map((employee) => [employee.id, employee.displayName]),
  )

  return assignedEmployeeIds.map((employeeId) => {
    return employeeNameMap.get(employeeId) ?? employeeId
  })
}

function formatTimestamp(timestamp: Job['createdAt']) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp.toDate())
}
