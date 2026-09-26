import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '@/components'
import { useAuth } from '@/hooks'
import { cn, summarizeCandidateExplanation } from '@/utils'
import { canAssignWorker, canEditJob } from '@/permissions'
import { toJsDate } from '@/services/common'
import {
  AssignmentRecommendationError,
  ASSIGNMENT_OVERRIDE_REASONS,
  assignmentRecommendationService,
} from '@/services/recommendations'
import { jobService } from '@/services/jobs'
import {
  type AssignmentRecommendation,
  type AssignmentRecommendationCandidate,
  type AssignmentOverrideReason,
  getAllowedJobStatusTransitions,
  JOB_PRIORITY_VALUES,
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
  const [
    recommendationDecisionErrorMessage,
    setRecommendationDecisionErrorMessage,
  ] = useState('')
  const [
    recommendationDecisionSuccessMessage,
    setRecommendationDecisionSuccessMessage,
  ] = useState('')
  const [recommendationDecisionMode, setRecommendationDecisionMode] =
    useState<'override' | null>(null)
  const [overrideNote, setOverrideNote] = useState('')
  const [overrideReason, setOverrideReason] = useState<
    AssignmentOverrideReason | ''
  >('')
  const [selectedRecommendationEmployeeId, setSelectedRecommendationEmployeeId] =
    useState('')
  const [statusErrorMessage, setStatusErrorMessage] = useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | ''>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] =
    useState(false)
  const [isDecidingRecommendation, setIsDecidingRecommendation] =
    useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isManagingAssignment, setIsManagingAssignment] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const [activeJobTab, setActiveJobTab] = useState<'details' | 'assignment' | 'activity'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#assignment-controls') {
      return 'assignment'
    }
    return 'details'
  })

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<{
    title: string
    description: string
    priority: JobPriority
    customerName: string
    customerPhone: string
    serviceAddress: string
    location: string
    requiredSkills: string
  }>({
    title: '',
    description: '',
    priority: 'Medium',
    customerName: '',
    customerPhone: '',
    serviceAddress: '',
    location: '',
    requiredSkills: '',
  })
  const [isUpdatingJobDetails, setIsUpdatingJobDetails] = useState(false)
  const [editErrorMessage, setEditErrorMessage] = useState('')
  const [editSuccessMessage, setEditSuccessMessage] = useState('')

  const handleOpenEditModal = () => {
    if (!job) return
    setEditForm({
      title: job.title,
      description: job.description,
      priority: job.priority,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      serviceAddress: job.serviceAddress,
      location: job.location || '',
      requiredSkills: job.requiredSkills ? job.requiredSkills.join(', ') : '',
    })
    setEditErrorMessage('')
    setEditSuccessMessage('')
    setIsEditModalOpen(true)
  }

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveEditJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !job) return

    if (!editForm.title.trim()) {
      setEditErrorMessage('Job title is required.')
      return
    }
    if (!editForm.customerName.trim()) {
      setEditErrorMessage('Customer name is required.')
      return
    }

    setIsUpdatingJobDetails(true)
    setEditErrorMessage('')
    setEditSuccessMessage('')

    try {
      const skillsArray = editForm.requiredSkills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      const updatedJob = await jobService.updateJob(
        profile,
        job.id,
        profile.organizationId,
        {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          priority: editForm.priority,
          customerName: editForm.customerName.trim(),
          customerPhone: editForm.customerPhone.trim(),
          serviceAddress: editForm.serviceAddress.trim(),
          location: editForm.location.trim(),
          requiredSkills: skillsArray,
        }
      )

      setJob(updatedJob)
      setEditSuccessMessage('Job details updated successfully.')
      setIsEditModalOpen(false)

      const updatedActivities = await jobService.getJobActivities(
        profile,
        job.id,
        profile.organizationId
      )
      setActivities(updatedActivities)
    } catch (err) {
      setEditErrorMessage(err instanceof Error ? err.message : 'Failed to update job details.')
    } finally {
      setIsUpdatingJobDetails(false)
    }
  }

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
      setRecommendationDecisionErrorMessage('')
      setRecommendationDecisionSuccessMessage('')
      setRecommendationDecisionMode(null)
      setRecommendationErrorMessage('')
      setOverrideNote('')
      setOverrideReason('')
      setSelectedRecommendationEmployeeId('')
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

  const [isRefreshing, setIsRefreshing] = useState(false)
  const isFetchingRef = useRef(false)

  const handleRefresh = useCallback(
    async (bypassCache = true, silent = false) => {
      if (!jobId || !profile || isFetchingRef.current) return
      isFetchingRef.current = true
      if (!silent) setIsRefreshing(true)
      try {
        const [loadedJob, loadedActivities, loadedEmployees] = await Promise.all([
          jobService.getJob(profile, jobId, profile.organizationId, { bypassCache }),
          jobService.getJobActivities(profile, jobId, profile.organizationId),
          jobService.listAssignableEmployees(profile, profile.organizationId).catch(() => []),
        ])

        if (loadedJob) {
          setJob(loadedJob)
          setManagedEmployeeIds(loadedJob.assignedEmployeeIds)
          setActivities(loadedActivities)
          setAssignableEmployees(loadedEmployees)
        }
      } catch {
        // silent revalidation failure
      } finally {
        isFetchingRef.current = false
        if (!silent) setIsRefreshing(false)
      }
    },
    [jobId, profile],
  )

  // Real-time synchronization: Auto-refresh when tab gains focus
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
  }, [handleRefresh, profile])

  useEffect(() => {
    if (!job || window.location.hash !== '#assignment-controls') return

    const frameId = window.requestAnimationFrame(() => {
      const assignmentControls = document.getElementById('assignment-controls')
      assignmentControls?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      assignmentControls?.focus({ preventScroll: true })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [job])

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
      setRecommendationDecisionErrorMessage('')
      setRecommendationDecisionSuccessMessage('')
      setRecommendationDecisionMode(null)
      setOverrideNote('')
      setOverrideReason('')
      setSelectedRecommendationEmployeeId('')
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

  async function handleAcceptRecommendation(
    candidate: AssignmentRecommendationCandidate,
  ) {
    if (!profile || !job || !recommendation) {
      return
    }

    const confirmed = window.confirm(
      `Assign ${candidate.employeeName} to this job from the recommendation?`,
    )

    if (!confirmed) {
      return
    }

    await submitRecommendationDecision({
      decision: 'accepted',
      selectedEmployeeId: candidate.employeeId,
    })
  }

  function handleChooseAnotherEmployee(
    candidate: AssignmentRecommendationCandidate,
  ) {
    setRecommendationDecisionMode('override')
    setRecommendationDecisionErrorMessage('')
    setRecommendationDecisionSuccessMessage('')
    setOverrideNote('')
    setOverrideReason('')
    setSelectedRecommendationEmployeeId('')
    setAssignmentSearch('')

    const firstAlternativeEmployee = assignableEmployees.find(
      (employee) => employee.id !== candidate.employeeId,
    )

    if (firstAlternativeEmployee) {
      setSelectedRecommendationEmployeeId(firstAlternativeEmployee.id)
    }
  }

  function toggleRecommendationEmployeeSelection(employeeId: string) {
    setSelectedRecommendationEmployeeId((currentEmployeeId) =>
      currentEmployeeId === employeeId ? '' : employeeId,
    )
  }

  async function handleConfirmRecommendationOverride() {
    if (!profile || !job || !recommendation) {
      return
    }

    if (!overrideReason) {
      setRecommendationDecisionErrorMessage(
        'Select an override reason before confirming the assignment.',
      )
      return
    }

    const selectedEmployee = assignableEmployees.find(
      (employee) => employee.id === selectedRecommendationEmployeeId,
    )
    const selectedEmployeeName =
      selectedEmployee?.displayName ?? 'the selected employee'
    const confirmed = window.confirm(
      `Override the recommendation and assign ${selectedEmployeeName}?`,
    )

    if (!confirmed) {
      return
    }

    await submitRecommendationDecision({
      decision: 'overridden',
      overrideNote,
      overrideReason,
      selectedEmployeeId: selectedRecommendationEmployeeId,
    })
  }

  async function submitRecommendationDecision(
    input:
      | { decision: 'accepted'; selectedEmployeeId: string }
      | {
          decision: 'overridden'
          overrideNote: string
          overrideReason: AssignmentOverrideReason
          selectedEmployeeId: string
        },
  ) {
    if (!profile || !job || !recommendation) {
      return
    }

    setIsDecidingRecommendation(true)
    setRecommendationDecisionErrorMessage('')
    setRecommendationDecisionSuccessMessage('')

    try {
      const result =
        await assignmentRecommendationService.decideAssignmentRecommendation(
          profile,
          job.organizationId,
          {
            recommendationId: recommendation.id,
            ...input,
          },
        )

      setJob(result.job)
      setActivities((currentActivities) => [
        result.activity,
        ...currentActivities,
      ])
      setRecommendation(result.recommendation)
      setRecommendationDecisionMode(null)
      setSelectedRecommendationEmployeeId('')
      setOverrideReason('')
      setOverrideNote('')
      setAssignmentSearch('')
      setManagedEmployeeIds(result.job.assignedEmployeeIds)
      setRecommendationDecisionSuccessMessage(
        input.decision === 'accepted'
          ? 'Recommendation accepted and assignment recorded.'
          : 'Override recorded and assignment confirmed.',
      )
    } catch (error) {
      if (error instanceof AssignmentRecommendationError) {
        setRecommendationDecisionErrorMessage(error.message)
      } else {
        setRecommendationDecisionErrorMessage(
          'Unable to record the recommendation decision. Please try again.',
        )
      }
    } finally {
      setIsDecidingRecommendation(false)
    }
  }

  async function handleStatusUpdate(nextStatus?: JobStatus) {
    const statusToApply = nextStatus ?? selectedStatus
    if (!profile || !job || !statusToApply) {
      return
    }

    setIsUpdatingStatus(true)
    setStatusErrorMessage('')

    try {
      const result = await jobService.updateJobStatus(
        profile,
        job.id,
        job.organizationId,
        statusToApply,
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
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Loading job details...
      </div>
    )
  }

  if (errorMessage || !job) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {errorMessage || 'Job not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          className="rounded-sm transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          to="/jobs"
        >
          Jobs
        </Link>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span className="font-medium text-foreground">{job.title}</span>
      </nav>

      <JobSummary
        assignedEmployeeNames={assignedEmployeeNames}
        job={job}
        onRefresh={() => void handleRefresh(true)}
        isRefreshing={isRefreshing}
      />

      {/* 3-Tab Organization Header */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {[
          { id: 'details', label: 'Details', icon: ClipboardList },
          { id: 'assignment', label: 'Assign Worker', icon: Sparkles },
          { id: 'activity', label: 'History', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeJobTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveJobTab(tab.id as 'details' | 'assignment' | 'activity')}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              type="button"
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {editSuccessMessage ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
          {editSuccessMessage}
        </div>
      ) : null}

      {/* Tab 1: Details & Customer Info */}
      {activeJobTab === 'details' ? (
        <div className="space-y-4">
          <InfoCard
            title="Job Information"
            action={
              profile && canEditJob(profile) ? (
                <button
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onClick={handleOpenEditModal}
                  type="button"
                >
                  <Pencil aria-hidden="true" className="size-3.5" />
                  Edit Job Details
                </button>
              ) : null
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
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
            <div className="grid gap-4 md:grid-cols-3">
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

          <InfoCard title="Job Metadata">
            <div className="grid gap-4 md:grid-cols-2">
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
        </div>
      ) : null}

      {/* Tab 2: AI Recommendations & Assignment Controls */}
      {activeJobTab === 'assignment' ? (
        <div className="max-w-4xl space-y-4">
          <div
            className="scroll-mt-4 space-y-3"
            id="assignment-controls"
            tabIndex={-1}
          >
            <AssignmentDecisionPanel
              allowedStatuses={allowedStatuses}
              assignedEmployeeNames={assignedEmployeeNames}
              assignmentErrorMessage={assignmentErrorMessage}
              assignmentSearch={assignmentSearch}
              assignmentSuccessMessage={assignmentSuccessMessage}
              canAssignEmployees={canAssignEmployees}
              canGenerateRecommendations={canGenerateRecommendations}
              canManageAssignment={canManageAssignment}
              canUpdateStatus={canUpdateStatus}
              filteredAssignableEmployees={filteredAssignableEmployees}
              filteredManageableEmployees={filteredManageableEmployees}
              handleAssignEmployees={handleAssignEmployees}
              handleAcceptRecommendation={handleAcceptRecommendation}
              handleChooseAnotherEmployee={handleChooseAnotherEmployee}
              handleConfirmRecommendationOverride={
                handleConfirmRecommendationOverride
              }
              handleGenerateRecommendations={handleGenerateRecommendations}
              handleStatusUpdate={handleStatusUpdate}
              handleUnassignAllEmployees={handleUnassignAllEmployees}
              handleUpdateAssignedEmployees={handleUpdateAssignedEmployees}
              isAssigning={isAssigning}
              isDecidingRecommendation={isDecidingRecommendation}
              isGeneratingRecommendation={isGeneratingRecommendation}
              isManagingAssignment={isManagingAssignment}
              isUpdatingStatus={isUpdatingStatus}
              job={job}
              manageAssignmentErrorMessage={manageAssignmentErrorMessage}
              manageAssignmentSearch={manageAssignmentSearch}
              manageAssignmentSuccessMessage={manageAssignmentSuccessMessage}
              managedEmployeeIds={managedEmployeeIds}
              recommendation={recommendation}
              recommendationDecisionErrorMessage={
                recommendationDecisionErrorMessage
              }
              recommendationDecisionMode={recommendationDecisionMode}
              recommendationDecisionSuccessMessage={
                recommendationDecisionSuccessMessage
              }
              recommendationErrorMessage={recommendationErrorMessage}
              selectedEmployeeIds={selectedEmployeeIds}
              selectedRecommendationEmployeeId={
                selectedRecommendationEmployeeId
              }
              selectedStatus={selectedStatus}
              overrideNote={overrideNote}
              overrideReason={overrideReason}
              setAssignmentSearch={setAssignmentSearch}
              setManageAssignmentSearch={setManageAssignmentSearch}
              setOverrideNote={setOverrideNote}
              setOverrideReason={setOverrideReason}
              setSelectedStatus={setSelectedStatus}
              statusErrorMessage={statusErrorMessage}
              toggleEmployeeSelection={toggleEmployeeSelection}
              toggleManagedEmployeeSelection={toggleManagedEmployeeSelection}
              toggleRecommendationEmployeeSelection={
                toggleRecommendationEmployeeSelection
              }
            />
          </div>
        </div>
      ) : null}

      {/* Tab 3: Status Activity & Attachments */}
      {activeJobTab === 'activity' ? (
        <div className="space-y-4">
          <InfoCard title="Attachments">
            <div className="flex min-h-12 items-center gap-3 rounded-lg border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
              <Paperclip aria-hidden="true" className="size-4" />
              {job.attachments.length === 0
                ? 'No attachments uploaded yet.'
                : `${job.attachments.length} attachment metadata records`}
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
        </div>
      ) : null}

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Edit Job Details</h2>
                <p className="text-xs text-muted-foreground">
                  Update title, customer info, location, priority, or required skills.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                type="button"
              >
                ✕
              </button>
            </div>

            {editErrorMessage ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                {editErrorMessage}
              </div>
            ) : null}

            <form onSubmit={handleSaveEditJob} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => handleEditFormChange('title', e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Priority *
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => handleEditFormChange('priority', e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {JOB_PRIORITY_VALUES.map((p) => (
                      <option key={p} value={p}>
                        {p} Priority
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.customerName}
                    onChange={(e) => handleEditFormChange('customerName', e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Customer Phone
                  </label>
                  <input
                    type="text"
                    value={editForm.customerPhone}
                    onChange={(e) => handleEditFormChange('customerPhone', e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Location Note / Tag
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => handleEditFormChange('location', e.target.value)}
                    placeholder="e.g. Building A, Floor 3"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Service Address
                  </label>
                  <input
                    type="text"
                    value={editForm.serviceAddress}
                    onChange={(e) => handleEditFormChange('serviceAddress', e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Required Skills (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.requiredSkills}
                    onChange={(e) => handleEditFormChange('requiredSkills', e.target.value)}
                    placeholder="e.g. HVAC, Electrical, Plumbing"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => handleEditFormChange('description', e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingJobDetails}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isUpdatingJobDetails ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function JobSummary({
  assignedEmployeeNames,
  job,
  onRefresh,
  isRefreshing,
}: {
  assignedEmployeeNames: string[]
  job: Job
  onRefresh?: () => void
  isRefreshing?: boolean
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusTone[job.status]}>
              {JOB_STATUS_LABELS[job.status]}
            </StatusBadge>
            <StatusBadge tone={priorityTone[job.priority]}>
              {job.priority}
            </StatusBadge>
            <span className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              {getDecisionSummary(job)}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            {job.title}
          </h1>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <SummaryItem label="Customer">{job.customerName}</SummaryItem>
            <SummaryItem label="Location">
              {job.location || job.serviceAddress || 'No location note'}
            </SummaryItem>
            <SummaryItem label="Due Date">
              {formatNullableTimestamp(job.dueDate)}
            </SummaryItem>
            <SummaryItem label="Assigned">
              {assignedEmployeeNames.length === 0
                ? 'Unassigned'
                : assignedEmployeeNames.join(', ')}
            </SummaryItem>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              title="Refresh job details"
            >
              <RefreshCw aria-hidden="true" className={cn('size-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          ) : null}
          <BackLink />
        </div>
      </div>
    </section>
  )
}

function SummaryItem({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 truncate text-sm text-foreground">{children}</div>
    </div>
  )
}

function AssignmentDecisionPanel({
  allowedStatuses,
  assignedEmployeeNames,
  assignmentErrorMessage,
  assignmentSearch,
  assignmentSuccessMessage,
  canAssignEmployees,
  canGenerateRecommendations,
  canManageAssignment,
  canUpdateStatus,
  filteredAssignableEmployees,
  filteredManageableEmployees,
  handleAssignEmployees,
  handleAcceptRecommendation,
  handleChooseAnotherEmployee,
  handleConfirmRecommendationOverride,
  handleGenerateRecommendations,
  handleStatusUpdate,
  handleUnassignAllEmployees,
  handleUpdateAssignedEmployees,
  isAssigning,
  isDecidingRecommendation,
  isGeneratingRecommendation,
  isManagingAssignment,
  isUpdatingStatus,
  job,
  manageAssignmentErrorMessage,
  manageAssignmentSearch,
  manageAssignmentSuccessMessage,
  managedEmployeeIds,
  recommendation,
  recommendationDecisionErrorMessage,
  recommendationDecisionMode,
  recommendationDecisionSuccessMessage,
  recommendationErrorMessage,
  selectedEmployeeIds,
  selectedRecommendationEmployeeId,
  selectedStatus,
  overrideNote,
  overrideReason,
  setAssignmentSearch,
  setManageAssignmentSearch,
  setOverrideNote,
  setOverrideReason,
  setSelectedStatus,
  statusErrorMessage,
  toggleEmployeeSelection,
  toggleManagedEmployeeSelection,
  toggleRecommendationEmployeeSelection,
}: {
  allowedStatuses: JobStatus[]
  assignedEmployeeNames: string[]
  assignmentErrorMessage: string
  assignmentSearch: string
  assignmentSuccessMessage: string
  canAssignEmployees: boolean
  canGenerateRecommendations: boolean
  canManageAssignment: boolean
  canUpdateStatus: boolean
  filteredAssignableEmployees: UserProfile[]
  filteredManageableEmployees: UserProfile[]
  handleAssignEmployees: () => Promise<void>
  handleAcceptRecommendation: (
    candidate: AssignmentRecommendationCandidate,
  ) => Promise<void>
  handleChooseAnotherEmployee: (
    candidate: AssignmentRecommendationCandidate,
  ) => void
  handleConfirmRecommendationOverride: () => Promise<void>
  handleGenerateRecommendations: () => Promise<void>
  handleStatusUpdate: (nextStatus?: JobStatus) => Promise<void>
  handleUnassignAllEmployees: () => Promise<void>
  handleUpdateAssignedEmployees: () => Promise<void>
  isAssigning: boolean
  isDecidingRecommendation: boolean
  isGeneratingRecommendation: boolean
  isManagingAssignment: boolean
  isUpdatingStatus: boolean
  job: Job
  manageAssignmentErrorMessage: string
  manageAssignmentSearch: string
  manageAssignmentSuccessMessage: string
  managedEmployeeIds: string[]
  recommendation: AssignmentRecommendation | null
  recommendationDecisionErrorMessage: string
  recommendationDecisionMode: 'override' | null
  recommendationDecisionSuccessMessage: string
  recommendationErrorMessage: string
  selectedEmployeeIds: string[]
  selectedRecommendationEmployeeId: string
  selectedStatus: JobStatus | ''
  overrideNote: string
  overrideReason: AssignmentOverrideReason | ''
  setAssignmentSearch: (value: string) => void
  setManageAssignmentSearch: (value: string) => void
  setOverrideNote: (value: string) => void
  setOverrideReason: (value: AssignmentOverrideReason | '') => void
  setSelectedStatus: (value: JobStatus | '') => void
  statusErrorMessage: string
  toggleEmployeeSelection: (employeeId: string) => void
  toggleManagedEmployeeSelection: (employeeId: string) => void
  toggleRecommendationEmployeeSelection: (employeeId: string) => void
}) {
  const isOpen = job.status === JobStatuses.Open
  const isAssigned = job.status === JobStatuses.Assigned

  return (
    <InfoCard contained title="Assignment & Status">
      <div className="space-y-4">
        <div className="border-b border-border pb-3">
          <DetailItem label="Current Assignment">
            {assignedEmployeeNames.length === 0 ? (
              <span className="text-muted-foreground">Unassigned</span>
            ) : (
              assignedEmployeeNames.join(', ')
            )}
          </DetailItem>
        </div>

        {isOpen ? (
          <OpenAssignmentControls
            assignmentErrorMessage={assignmentErrorMessage}
            assignmentSearch={assignmentSearch}
            assignmentSuccessMessage={assignmentSuccessMessage}
            canAssignEmployees={canAssignEmployees}
            canGenerateRecommendations={canGenerateRecommendations}
            filteredAssignableEmployees={filteredAssignableEmployees}
            handleAcceptRecommendation={handleAcceptRecommendation}
            handleChooseAnotherEmployee={handleChooseAnotherEmployee}
            handleConfirmRecommendationOverride={
              handleConfirmRecommendationOverride
            }
            handleAssignEmployees={handleAssignEmployees}
            handleGenerateRecommendations={handleGenerateRecommendations}
            isAssigning={isAssigning}
            isDecidingRecommendation={isDecidingRecommendation}
            isGeneratingRecommendation={isGeneratingRecommendation}
            overrideNote={overrideNote}
            overrideReason={overrideReason}
            recommendation={recommendation}
            recommendationDecisionErrorMessage={
              recommendationDecisionErrorMessage
            }
            recommendationDecisionMode={recommendationDecisionMode}
            recommendationDecisionSuccessMessage={
              recommendationDecisionSuccessMessage
            }
            recommendationErrorMessage={recommendationErrorMessage}
            selectedEmployeeIds={selectedEmployeeIds}
            selectedRecommendationEmployeeId={
              selectedRecommendationEmployeeId
            }
            setAssignmentSearch={setAssignmentSearch}
            setOverrideNote={setOverrideNote}
            setOverrideReason={setOverrideReason}
            toggleEmployeeSelection={toggleEmployeeSelection}
            toggleRecommendationEmployeeSelection={
              toggleRecommendationEmployeeSelection
            }
          />
        ) : null}

        {isAssigned ? (
          <ManageAssignmentControls
            canManageAssignment={canManageAssignment}
            filteredManageableEmployees={filteredManageableEmployees}
            handleUnassignAllEmployees={handleUnassignAllEmployees}
            handleUpdateAssignedEmployees={handleUpdateAssignedEmployees}
            isManagingAssignment={isManagingAssignment}
            manageAssignmentErrorMessage={manageAssignmentErrorMessage}
            manageAssignmentSearch={manageAssignmentSearch}
            manageAssignmentSuccessMessage={manageAssignmentSuccessMessage}
            managedEmployeeIds={managedEmployeeIds}
            setManageAssignmentSearch={setManageAssignmentSearch}
            toggleManagedEmployeeSelection={toggleManagedEmployeeSelection}
          />
        ) : null}

        {job.status === JobStatuses.Draft ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Job is in Draft Status</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Open this job to enable AI worker recommendations and technician assignment.
            </p>
            {canUpdateStatus && (
              <button
                className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                disabled={isUpdatingStatus}
                onClick={() => void handleStatusUpdate(JobStatuses.Open)}
                type="button"
              >
                {isUpdatingStatus ? 'Opening job...' : 'Open job for assignment'}
              </button>
            )}
          </div>
        ) : !isOpen && !isAssigned ? (
          <p className="border-y border-border py-3 text-sm text-muted-foreground">
            Assignment changes are not available for this job status.
          </p>
        ) : null}

        <StatusControls
          allowedStatuses={allowedStatuses}
          canUpdateStatus={canUpdateStatus}
          handleStatusUpdate={handleStatusUpdate}
          isUpdatingStatus={isUpdatingStatus}
          job={job}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          statusErrorMessage={statusErrorMessage}
        />
      </div>
    </InfoCard>
  )
}

function OpenAssignmentControls({
  assignmentErrorMessage,
  assignmentSearch,
  assignmentSuccessMessage,
  canAssignEmployees,
  canGenerateRecommendations,
  filteredAssignableEmployees,
  handleAssignEmployees,
  handleAcceptRecommendation,
  handleChooseAnotherEmployee,
  handleConfirmRecommendationOverride,
  handleGenerateRecommendations,
  isAssigning,
  isDecidingRecommendation,
  isGeneratingRecommendation,
  overrideNote,
  overrideReason,
  recommendation,
  recommendationDecisionErrorMessage,
  recommendationDecisionMode,
  recommendationDecisionSuccessMessage,
  recommendationErrorMessage,
  selectedEmployeeIds,
  selectedRecommendationEmployeeId,
  setAssignmentSearch,
  setOverrideNote,
  setOverrideReason,
  toggleEmployeeSelection,
  toggleRecommendationEmployeeSelection,
}: {
  assignmentErrorMessage: string
  assignmentSearch: string
  assignmentSuccessMessage: string
  canAssignEmployees: boolean
  canGenerateRecommendations: boolean
  filteredAssignableEmployees: UserProfile[]
  handleAssignEmployees: () => Promise<void>
  handleAcceptRecommendation: (
    candidate: AssignmentRecommendationCandidate,
  ) => Promise<void>
  handleChooseAnotherEmployee: (
    candidate: AssignmentRecommendationCandidate,
  ) => void
  handleConfirmRecommendationOverride: () => Promise<void>
  handleGenerateRecommendations: () => Promise<void>
  isAssigning: boolean
  isDecidingRecommendation: boolean
  isGeneratingRecommendation: boolean
  overrideNote: string
  overrideReason: AssignmentOverrideReason | ''
  recommendation: AssignmentRecommendation | null
  recommendationDecisionErrorMessage: string
  recommendationDecisionMode: 'override' | null
  recommendationDecisionSuccessMessage: string
  recommendationErrorMessage: string
  selectedEmployeeIds: string[]
  selectedRecommendationEmployeeId: string
  setAssignmentSearch: (value: string) => void
  setOverrideNote: (value: string) => void
  setOverrideReason: (value: AssignmentOverrideReason | '') => void
  toggleEmployeeSelection: (employeeId: string) => void
  toggleRecommendationEmployeeSelection: (employeeId: string) => void
}) {
  const recommendedCandidate = recommendation?.candidates[0] ?? null
  const alternativeEmployees = recommendedCandidate
    ? filteredAssignableEmployees.filter(
        (employee) => employee.id !== recommendedCandidate.employeeId,
      )
    : filteredAssignableEmployees

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <SectionHeading
          description="Review a ranked suggestion or assign manually."
          title="AI Recommendation"
        />
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
          <span className="font-medium">Manager approval is required.</span>
          <span className="mt-1 block text-muted-foreground">
            Suggestions never assign employees automatically.
          </span>
        </div>

        {canGenerateRecommendations ? (
          <button
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isGeneratingRecommendation}
            onClick={handleGenerateRecommendations}
            type="button"
          >
            <Sparkles aria-hidden="true" className="size-4" />
            {isGeneratingRecommendation
              ? 'Generating...'
              : recommendation
                ? 'Refresh Suggestions'
                : 'Generate Suggestions'}
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
              {recommendedCandidate ? (
                <RecommendedEmployeeDecisionCard
                  candidate={recommendedCandidate}
                  disabled={isDecidingRecommendation}
                  onAcceptRecommendation={handleAcceptRecommendation}
                  onChooseAnotherEmployee={handleChooseAnotherEmployee}
                />
              ) : null}

              {recommendationDecisionMode === 'override' ? (
                <RecommendationOverrideControls
                  disabled={isDecidingRecommendation}
                  employees={alternativeEmployees}
                  onConfirmOverride={handleConfirmRecommendationOverride}
                  onOverrideNoteChange={setOverrideNote}
                  onOverrideReasonChange={setOverrideReason}
                  onSearchChange={setAssignmentSearch}
                  onToggleEmployee={toggleRecommendationEmployeeSelection}
                  overrideNote={overrideNote}
                  overrideReason={overrideReason}
                  searchValue={assignmentSearch}
                  selectedEmployeeId={selectedRecommendationEmployeeId}
                />
              ) : null}

              {recommendation.candidates.length > 1 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Other ranked candidates
                  </p>
                  {recommendation.candidates.slice(1).map((candidate) => (
                    <RecommendationCandidateCard
                      candidate={candidate}
                      key={candidate.employeeId}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
              No eligible employees were found for this recommendation.
            </p>
          )
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">
            Generate a recommendation to review the best eligible employees.
          </p>
        )}

        <ActionMessage
          message={recommendationDecisionErrorMessage}
          tone="danger"
        />
        <ActionMessage
          message={recommendationDecisionSuccessMessage}
          tone="success"
        />
      </section>

      <SectionDivider />

      <section className="space-y-3">
        <SectionHeading
          description="Select active employees from this organization."
          title="Assign Employee"
        />
        {canAssignEmployees ? (
          <>
            <EmployeeSelectionList
              disabled={isAssigning}
              employees={filteredAssignableEmployees}
              onSearchChange={setAssignmentSearch}
              onToggleEmployee={toggleEmployeeSelection}
              searchValue={assignmentSearch}
              selectedEmployeeIds={selectedEmployeeIds}
            />

            <button
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={selectedEmployeeIds.length === 0 || isAssigning}
              onClick={handleAssignEmployees}
              type="button"
            >
              {isAssigning ? 'Assigning...' : 'Assign Employee'}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Assignment is available to Admin and Manager users.
          </p>
        )}

        <ActionMessage message={assignmentErrorMessage} tone="danger" />
        <ActionMessage message={assignmentSuccessMessage} tone="success" />
      </section>
    </div>
  )
}

function ManageAssignmentControls({
  canManageAssignment,
  filteredManageableEmployees,
  handleUnassignAllEmployees,
  handleUpdateAssignedEmployees,
  isManagingAssignment,
  manageAssignmentErrorMessage,
  manageAssignmentSearch,
  manageAssignmentSuccessMessage,
  managedEmployeeIds,
  setManageAssignmentSearch,
  toggleManagedEmployeeSelection,
}: {
  canManageAssignment: boolean
  filteredManageableEmployees: UserProfile[]
  handleUnassignAllEmployees: () => Promise<void>
  handleUpdateAssignedEmployees: () => Promise<void>
  isManagingAssignment: boolean
  manageAssignmentErrorMessage: string
  manageAssignmentSearch: string
  manageAssignmentSuccessMessage: string
  managedEmployeeIds: string[]
  setManageAssignmentSearch: (value: string) => void
  toggleManagedEmployeeSelection: (employeeId: string) => void
}) {
  return (
    <section className="space-y-3">
      <SectionHeading
        description="Add or remove active employees assigned to this job."
        title="Reassign Employees"
      />

      {canManageAssignment ? (
        <>
          <EmployeeSelectionList
            disabled={isManagingAssignment}
            employees={filteredManageableEmployees}
            onSearchChange={setManageAssignmentSearch}
            onToggleEmployee={toggleManagedEmployeeSelection}
            searchValue={manageAssignmentSearch}
            selectedEmployeeIds={managedEmployeeIds}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={managedEmployeeIds.length === 0 || isManagingAssignment}
              onClick={handleUpdateAssignedEmployees}
              type="button"
            >
              {isManagingAssignment ? 'Saving...' : 'Reassign'}
            </button>
            <button
              className="inline-flex h-9 items-center justify-center rounded-md border border-destructive/30 bg-card px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isManagingAssignment}
              onClick={handleUnassignAllEmployees}
              type="button"
            >
              Unassign
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Assignment changes are available to Admin and Manager users.
        </p>
      )}

      <ActionMessage message={manageAssignmentErrorMessage} tone="danger" />
      <ActionMessage message={manageAssignmentSuccessMessage} tone="success" />
    </section>
  )
}

function StatusControls({
  allowedStatuses,
  canUpdateStatus,
  handleStatusUpdate,
  isUpdatingStatus,
  job,
  selectedStatus,
  setSelectedStatus,
  statusErrorMessage,
}: {
  allowedStatuses: JobStatus[]
  canUpdateStatus: boolean
  handleStatusUpdate: (nextStatus?: JobStatus) => Promise<void>
  isUpdatingStatus: boolean
  job: Job
  selectedStatus: JobStatus | ''
  setSelectedStatus: (value: JobStatus | '') => void
  statusErrorMessage: string
}) {
  return (
    <section className="space-y-3">
      <SectionDivider />
      <SectionHeading
        description="Move the job through the existing approved status flow."
        title="Status"
      />
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
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedStatus || isUpdatingStatus}
            onClick={() => void handleStatusUpdate()}
            type="button"
          >
            {isUpdatingStatus ? 'Updating...' : 'Update Status'}
          </button>
          <ActionMessage message={statusErrorMessage} tone="danger" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Status updates are available to Admin and Manager users.
        </p>
      )}
    </section>
  )
}

function EmployeeSelectionList({
  disabled,
  employees,
  onSearchChange,
  onToggleEmployee,
  searchValue,
  selectedEmployeeIds,
}: {
  disabled: boolean
  employees: UserProfile[]
  onSearchChange: (value: string) => void
  onToggleEmployee: (employeeId: string) => void
  searchValue: string
  selectedEmployeeIds: string[]
}) {
  return (
    <>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search employees..."
          type="search"
          value={searchValue}
        />
      </div>

      <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background p-2">
        {employees.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            No eligible employees found.
          </p>
        ) : (
          employees.map((employee) => (
            <label
              className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 text-sm transition hover:bg-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
              key={employee.id}
            >
              <input
                checked={selectedEmployeeIds.includes(employee.id)}
                className="mt-1 size-4"
                disabled={disabled}
                onChange={() => onToggleEmployee(employee.id)}
                type="checkbox"
              />
              <span className="min-w-0">
                <span className="block font-medium text-foreground">
                  {employee.displayName}
                </span>
                <span className="block break-all text-xs text-muted-foreground">
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
    </>
  )
}

function SectionHeading({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function SectionDivider() {
  return <div className="border-t border-border" />
}

function ActionMessage({
  message,
  tone,
}: {
  message: string
  tone: 'danger' | 'success'
}) {
  if (!message) {
    return null
  }

  return (
    <p
      className={
        tone === 'danger'
          ? 'text-sm font-medium text-destructive'
          : 'text-sm font-medium text-emerald-600'
      }
    >
      {message}
    </p>
  )
}

function BackLink() {
  return (
    <Link
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
      to="/jobs"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to Jobs
    </Link>
  )
}

function InfoCard({
  action,
  children,
  contained = false,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  contained?: boolean
  title: string
}) {
  return (
    <section
      className={
        contained
          ? 'rounded-lg border border-border bg-card p-4'
          : 'border-t border-border pt-4 first:border-t-0 first:pt-0'
      }
    >
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {action}
      </div>
      <div className="pt-3">{children}</div>
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
      <p className="mb-1 text-xs font-medium text-muted-foreground">
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

function RecommendedEmployeeDecisionCard({
  candidate,
  disabled,
  onAcceptRecommendation,
  onChooseAnotherEmployee,
}: {
  candidate: AssignmentRecommendationCandidate
  disabled: boolean
  onAcceptRecommendation: (
    candidate: AssignmentRecommendationCandidate,
  ) => Promise<void>
  onChooseAnotherEmployee: (
    candidate: AssignmentRecommendationCandidate,
  ) => void
}) {
  const summary = summarizeCandidateExplanation(candidate)

  return (
    <article className="rounded-md border border-border border-l-2 border-l-primary bg-card p-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              Recommended employee
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                summary.confidenceTone === 'success' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                summary.confidenceTone === 'warning' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                summary.confidenceTone === 'danger' && 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
              )}
            >
              {summary.confidenceBadgeText}
            </span>
          </div>
          <p className="mt-1 text-base font-bold text-foreground">
            {candidate.employeeName}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          {summary.displayScoreText}
        </span>
      </div>

      {summary.highlights.length > 0 ? (
        <ul className="mt-3.5 space-y-1.5 text-xs text-foreground">
          {summary.highlights.slice(0, 4).map((reason) => (
            <li className="flex items-center gap-2" key={reason}>
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {summary.requiresManualReview ? (
        <div className="mt-3 rounded border border-amber-500/20 bg-amber-500/10 p-2 text-xs font-medium text-amber-800 dark:text-amber-300">
          Manual review recommended due to lower score confidence.
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={() => void onAcceptRecommendation(candidate)}
          type="button"
        >
          {disabled ? 'Confirming...' : 'Accept Recommendation'}
        </button>
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={() => onChooseAnotherEmployee(candidate)}
          type="button"
        >
          Choose Another Employee
        </button>
      </div>
    </article>
  )
}

function RecommendationOverrideControls({
  disabled,
  employees,
  onConfirmOverride,
  onOverrideNoteChange,
  onOverrideReasonChange,
  onSearchChange,
  onToggleEmployee,
  overrideNote,
  overrideReason,
  searchValue,
  selectedEmployeeId,
}: {
  disabled: boolean
  employees: UserProfile[]
  onConfirmOverride: () => Promise<void>
  onOverrideNoteChange: (value: string) => void
  onOverrideReasonChange: (value: AssignmentOverrideReason | '') => void
  onSearchChange: (value: string) => void
  onToggleEmployee: (employeeId: string) => void
  overrideNote: string
  overrideReason: AssignmentOverrideReason | ''
  searchValue: string
  selectedEmployeeId: string
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <SectionHeading
        description="Choose one eligible employee and record why the recommendation changed."
        title="Override Recommendation"
      />
      <EmployeeSelectionList
        disabled={disabled}
        employees={employees}
        onSearchChange={onSearchChange}
        onToggleEmployee={onToggleEmployee}
        searchValue={searchValue}
        selectedEmployeeIds={selectedEmployeeId ? [selectedEmployeeId] : []}
      />
      <select
        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onChange={(event) =>
          onOverrideReasonChange(
            event.target.value as AssignmentOverrideReason | '',
          )
        }
        value={overrideReason}
      >
        <option value="">Select override reason</option>
        {ASSIGNMENT_OVERRIDE_REASONS.map((reason) => (
          <option key={reason} value={reason}>
            {reason}
          </option>
        ))}
      </select>
      {overrideReason === 'Other' ? (
        <textarea
          className="min-h-20 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onChange={(event) => onOverrideNoteChange(event.target.value)}
          placeholder="Optional note"
          value={overrideNote}
        />
      ) : null}
      <button
        className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!selectedEmployeeId || !overrideReason || disabled}
        onClick={() => void onConfirmOverride()}
        type="button"
      >
        {disabled ? 'Confirming...' : 'Confirm Assignment'}
      </button>
    </div>
  )
}

function RecommendationCandidateCard({
  candidate,
}: {
  candidate: AssignmentRecommendationCandidate
}) {
  const summary = summarizeCandidateExplanation(candidate)

  return (
    <article className="border-t border-border py-3 first:border-t-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            #{candidate.rank} {candidate.employeeName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {summary.displayScoreText}, {summary.confidenceBadgeText}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
          {summary.displayScoreText}
        </span>
      </div>

      {summary.highlights.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {summary.highlights.slice(0, 2).map((reason) => (
            <li className="flex items-center gap-1.5" key={reason}>
              <span className="size-1 rounded-full bg-muted-foreground/60" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}
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

function getDecisionSummary(job: Job) {
  if (job.status === JobStatuses.Open) {
    return job.assignedEmployeeIds.length === 0
      ? 'Needs assignment'
      : 'Review assignment'
  }

  if (job.status === JobStatuses.Assigned) {
    return 'Ready for work'
  }

  if (job.status === JobStatuses.InProgress) {
    return 'Work in progress'
  }

  if (job.status === JobStatuses.Completed) {
    return 'Completed'
  }

  if (job.status === JobStatuses.Cancelled) {
    return 'Cancelled'
  }

  return 'Review status'
}

function formatTimestamp(timestamp: unknown) {
  const date = toJsDate(timestamp)
  if (!date) return 'Not recorded'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
