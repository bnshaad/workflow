import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitResults,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { canAssignWorker } from '@/permissions'
import {
  readBoolean,
  readNumber,
  readNumberOrNull,
  readOptionalString,
  readOptionalTimestamp,
  readString,
  readStringArray,
  readStringOrNull,
  readTimestamp,
  readTimestampOrNull,
  requireActiveProfile,
  requireTenantAccess,
} from '@/services/common'
import { firestore } from '@/services/firestore'
import { cacheService } from '@/services/cache/cacheService'
import {
  JobStatuses,
  type AssignmentRecommendation,
  type AssignmentRecommendationCandidate,
  type AssignmentRecommendationDecision,
  type AssignmentOverrideReason,
  type AssignmentScoreBreakdown,
  type Job,
  type JobActivity,
  type JobPriority,
  type JobStatus,
  type UserProfile,
} from '@/types'
import { Roles } from '@/permissions/roles'
import { validateJobStatus } from '@/validators/jobValidator'
import {
  buildRecommendationDecisionEvaluationMetrics,
  incrementOverrideReasonDistribution,
  validateRecommendationDecisionInput,
  type RecommendationDecisionEvaluationMetrics,
} from './assignmentRecommendationDecisionRules'
import {
  ASSIGNMENT_ALGORITHM_VERSION,
  isEligibleRecommendationEmployee,
  rankAssignmentCandidates,
} from '../../../../../shared/assignmentRecommendation.ts'

const JOBS_COLLECTION = 'jobs'
const USERS_COLLECTION = 'users'
const RECOMMENDATIONS_COLLECTION = 'recommendations'
const JOB_ACTIVITIES_COLLECTION = 'jobActivities'
const AUDIT_LOGS_COLLECTION = 'auditLogs'
const ALGORITHM_VERSION = ASSIGNMENT_ALGORITHM_VERSION
const HISTORICAL_JOB_LIMIT = 100

export type GenerateAssignmentRecommendationsResult = {
  recommendation: AssignmentRecommendation
}

export type DecideAssignmentRecommendationInput = {
  decision: AssignmentRecommendationDecision
  overrideNote?: string
  overrideReason?: AssignmentOverrideReason | ''
  recommendationId: string
  selectedEmployeeId: string
}

export type DecideAssignmentRecommendationResult = {
  activity: JobActivity
  assignedEmployee: UserProfile
  job: Job
  recommendation: AssignmentRecommendation
}

type RecommendationEmployee = UserProfile & {
  availabilityKnown: boolean
  isUnavailable: boolean
  serviceZone?: string
  location?: string
}

export class AssignmentRecommendationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssignmentRecommendationError'
  }
}

export interface AssignmentRecommendationService {
  decideAssignmentRecommendation(
    profile: UserProfile,
    organizationId: string,
    input: DecideAssignmentRecommendationInput,
  ): Promise<DecideAssignmentRecommendationResult>
  generateAssignmentRecommendations(
    profile: UserProfile,
    organizationId: string,
    jobId: string,
  ): Promise<GenerateAssignmentRecommendationsResult>
  getGeneratedRecommendationJobIds(
    profile: UserProfile,
    organizationId: string,
  ): Promise<Set<string>>
  getRecommendationDecisionMetrics(
    profile: UserProfile,
    organizationId: string,
  ): Promise<RecommendationDecisionEvaluationMetrics>
}

export const assignmentRecommendationService: AssignmentRecommendationService = {
  async decideAssignmentRecommendation(profile, organizationId, input) {
    const activeProfile = requireActiveProfile(profile)
    requireTenantAccess(activeProfile, organizationId)

    if (!canAssignWorker(activeProfile)) {
      throw new AssignmentRecommendationError(
        'You do not have permission to assign employees.',
      )
    }

    const result = await runTransaction(firestore, async (transaction) => {
      const recommendationReference = doc(
        firestore,
        RECOMMENDATIONS_COLLECTION,
        input.recommendationId,
      )
      const recommendationSnapshot = await transaction.get(
        recommendationReference,
      )

      if (!recommendationSnapshot.exists()) {
        throw new AssignmentRecommendationError('Recommendation not found.')
      }

      const recommendation = mapAssignmentRecommendation(
        recommendationSnapshot.id,
        recommendationSnapshot.data(),
      )

      if (
        !recommendation.isActive ||
        recommendation.organizationId !== organizationId
      ) {
        throw new AssignmentRecommendationError('Recommendation not found.')
      }

      if (recommendation.status !== 'generated') {
        throw new AssignmentRecommendationError(
          'This recommendation decision has already been recorded.',
        )
      }

      const recommendedCandidate = recommendation.candidates[0] ?? null
      const recommendedEmployeeId = recommendedCandidate?.employeeId ?? ''
      const validation = validateRecommendationDecisionInput({
        decision: input.decision,
        overrideNote: input.overrideNote,
        overrideReason: input.overrideReason,
        recommendedEmployeeId,
        selectedEmployeeId: input.selectedEmployeeId,
      })

      if (!validation.isValid) {
        throw new AssignmentRecommendationError(validation.errors.join(' '))
      }

      const jobReference = doc(
        firestore,
        JOBS_COLLECTION,
        recommendation.jobId,
      )
      const employeeReference = doc(
        firestore,
        USERS_COLLECTION,
        input.selectedEmployeeId,
      )
      const [jobSnapshot, employeeSnapshot] = await Promise.all([
        transaction.get(jobReference),
        transaction.get(employeeReference),
      ])

      if (!jobSnapshot.exists()) {
        throw new AssignmentRecommendationError('Job not found.')
      }

      if (!employeeSnapshot.exists()) {
        throw new AssignmentRecommendationError(
          'Selected employee is not eligible.',
        )
      }

      const currentJob = mapJob(jobSnapshot.id, jobSnapshot.data())
      const selectedEmployee = mapUserProfile(employeeSnapshot.data())

      if (
        !currentJob.isActive ||
        currentJob.organizationId !== organizationId ||
        currentJob.id !== recommendation.jobId
      ) {
        throw new AssignmentRecommendationError('Job not found.')
      }

      if (currentJob.status !== JobStatuses.Open) {
        throw new AssignmentRecommendationError('Only open jobs can be assigned.')
      }

      if (
        !isEligibleRecommendationEmployee(selectedEmployee) ||
        selectedEmployee.organizationId !== organizationId ||
        selectedEmployee.id !== input.selectedEmployeeId
      ) {
        throw new AssignmentRecommendationError(
          'Selected employee is not eligible.',
        )
      }

      const timestamp = Timestamp.now()
      const employeeIds = [selectedEmployee.id]
      const employeeNames = [selectedEmployee.displayName]
      const isOverride = input.decision === 'overridden'
      const activityReference = doc(
        collection(firestore, JOB_ACTIVITIES_COLLECTION),
      )
      const auditLogReference = doc(collection(firestore, AUDIT_LOGS_COLLECTION))
      const activity: JobActivity = {
        id: activityReference.id,
        organizationId,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        jobId: currentJob.id,
        type: 'employees_assigned',
        fromStatus: currentJob.status,
        toStatus: JobStatuses.Assigned,
        employeeIds,
        employeeNames,
        createdBy: activeProfile.id,
        description: isOverride
          ? `Assigned ${selectedEmployee.displayName} after manager override.`
          : `Assigned ${selectedEmployee.displayName} from recommendation.`,
      }
      const recommendationUpdate = {
        decidedAt: timestamp,
        decidedBy: activeProfile.id,
        decision: input.decision,
        overrideNote: validation.normalizedOverrideNote,
        overrideReason: validation.normalizedOverrideReason,
        recommendedEmployeeId,
        recommendationCriteriaSnapshot:
          recommendedCandidate?.scoreBreakdown ?? {},
        recommendationScoreSnapshot: recommendedCandidate?.totalScore ?? 0,
        selectedEmployeeId: selectedEmployee.id,
        status: input.decision,
        updatedAt: timestamp,
      }
      const updatedRecommendation: AssignmentRecommendation = {
        ...recommendation,
        ...recommendationUpdate,
      }
      const updatedJob: Job = {
        ...currentJob,
        assignedEmployeeIds: employeeIds,
        assignedAt: timestamp,
        assignedBy: activeProfile.id,
        status: JobStatuses.Assigned,
        statusUpdatedAt: timestamp,
        statusUpdatedBy: activeProfile.id,
        updatedAt: timestamp,
      }
      const auditLog = {
        id: auditLogReference.id,
        organizationId,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        actorId: activeProfile.id,
        action: 'job_employees_assigned',
        entityId: currentJob.id,
        entityType: 'job',
        metadata: {
          assignmentMode: 'ai_recommendation',
          decision: input.decision,
          employeeIds,
          employeeNames,
          fromStatus: currentJob.status,
          jobId: currentJob.id,
          newEmployeeIds: employeeIds,
          newEmployeeNames: employeeNames,
          overrideReason: validation.normalizedOverrideReason,
          previousEmployeeIds: currentJob.assignedEmployeeIds,
          recommendationId: recommendation.id,
          recommendedEmployeeId,
          selectedEmployeeId: selectedEmployee.id,
          toStatus: JobStatuses.Assigned,
        },
      }

      transaction.update(jobReference, {
        assignedEmployeeIds: employeeIds,
        assignedAt: timestamp,
        assignedBy: activeProfile.id,
        status: JobStatuses.Assigned,
        statusUpdatedAt: timestamp,
        statusUpdatedBy: activeProfile.id,
        updatedAt: timestamp,
      })
      transaction.update(recommendationReference, recommendationUpdate)
      transaction.set(activityReference, activity)
      transaction.set(auditLogReference, auditLog)

      return {
        activity,
        assignedEmployee: selectedEmployee,
        job: updatedJob,
        recommendation: updatedRecommendation,
      }
    })

    cacheService.invalidate('jobs')
    cacheService.invalidate('dashboard')
    cacheService.invalidate(`job:${result.job.id}`)

    return result
  },

  async generateAssignmentRecommendations(profile, organizationId, jobId) {
    const activeProfile = requireActiveProfile(profile)
    requireTenantAccess(activeProfile, organizationId)
    requireJobId(jobId)

    if (!canAssignWorker(activeProfile)) {
      throw new AssignmentRecommendationError(
        'You do not have permission to generate assignment recommendations.',
      )
    }

    const [job, employees, historicalJobs] = await Promise.all([
      readOpenJob(organizationId, jobId),
      readEligibleEmployees(organizationId),
      readHistoricalJobs(organizationId),
    ])
    const candidates: AssignmentRecommendationCandidate[] =
      rankAssignmentCandidates(job, employees, historicalJobs)
    const timestamp = Timestamp.now()
    const recommendationReference = doc(
      collection(firestore, RECOMMENDATIONS_COLLECTION),
    )
    const auditLogReference = doc(collection(firestore, AUDIT_LOGS_COLLECTION))
    const recommendation: AssignmentRecommendation = {
      id: recommendationReference.id,
      organizationId,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      jobId: job.id,
      generatedBy: activeProfile.id,
      generatedAt: timestamp,
      algorithmVersion: ALGORITHM_VERSION,
      assignmentMode: 'ai_recommendation',
      candidates,
      status: 'generated',
    }
    const auditLog = {
      id: auditLogReference.id,
      organizationId,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      actorId: activeProfile.id,
      action: 'assignment_recommendations_generated',
      entityId: job.id,
      entityType: 'job',
      metadata: {
        algorithmVersion: ALGORITHM_VERSION,
        assignmentMode: 'ai_recommendation',
        candidateCount: candidates.length,
        jobId: job.id,
        recommendationId: recommendation.id,
      },
    }
    const batch = writeBatch(firestore)

    batch.set(recommendationReference, recommendation)
    batch.set(auditLogReference, auditLog)

    await batch.commit()

    return { recommendation }
  },

  async getGeneratedRecommendationJobIds(profile, organizationId) {
    const activeProfile = requireActiveProfile(profile)
    requireTenantAccess(activeProfile, organizationId)

    if (!canAssignWorker(activeProfile)) {
      throw new AssignmentRecommendationError(
        'You do not have permission to view assignment recommendations.',
      )
    }

    const recommendationsQuery = query(
      collection(firestore, RECOMMENDATIONS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true),
      limitResults(200),
    )
    const snapshot = await getDocs(recommendationsQuery)

    return new Set(
      snapshot.docs
        .map((recommendationDocument) =>
          mapAssignmentRecommendation(
            recommendationDocument.id,
            recommendationDocument.data(),
          ),
        )
        .filter((recommendation) => recommendation.status === 'generated')
        .map((recommendation) => recommendation.jobId),
    )
  },

  async getRecommendationDecisionMetrics(profile, organizationId) {
    const activeProfile = requireActiveProfile(profile)
    requireTenantAccess(activeProfile, organizationId)

    if (!canAssignWorker(activeProfile)) {
      throw new AssignmentRecommendationError(
        'You do not have permission to view recommendation decisions.',
      )
    }

    const recommendationsQuery = query(
      collection(firestore, RECOMMENDATIONS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true),
      limitResults(200),
    )
    const snapshot = await getDocs(recommendationsQuery)

    const recommendations = snapshot.docs.map((recommendationDocument) =>
      mapAssignmentRecommendation(
        recommendationDocument.id,
        recommendationDocument.data(),
      ),
    )
    const metrics = buildRecommendationDecisionEvaluationMetrics(
      recommendations,
    )

    return recommendations.reduce((currentMetrics, recommendation) => {
      if (recommendation.decision !== 'overridden') {
        return currentMetrics
      }

      return {
        ...currentMetrics,
        overrideReasonDistribution: incrementOverrideReasonDistribution(
          currentMetrics.overrideReasonDistribution,
          recommendation.overrideReason,
        ),
      }
    }, metrics)
  },
}

async function readOpenJob(organizationId: string, jobId: string) {
  const jobSnapshot = await getDoc(doc(firestore, JOBS_COLLECTION, jobId))

  if (!jobSnapshot.exists()) {
    throw new AssignmentRecommendationError('Job not found.')
  }

  const job = mapJob(jobSnapshot.id, jobSnapshot.data())

  if (!job.isActive || job.organizationId !== organizationId) {
    throw new AssignmentRecommendationError('Job not found.')
  }

  if (job.status !== JobStatuses.Open) {
    throw new AssignmentRecommendationError(
      'Recommendations can only be generated for open jobs.',
    )
  }

  return job
}

async function readEligibleEmployees(organizationId: string) {
  const employeesQuery = query(
    collection(firestore, USERS_COLLECTION),
    where('organizationId', '==', organizationId),
    where('isActive', '==', true),
    where('role', '==', Roles.Employee),
  )
  const snapshot = await getDocs(employeesQuery)

  return snapshot.docs
    .map((employeeDocument) => mapUserProfile(employeeDocument.data()))
    .filter((employee) => isEligibleRecommendationEmployee(employee))
}

async function readHistoricalJobs(organizationId: string) {
  const historicalJobsQuery = query(
    collection(firestore, JOBS_COLLECTION),
    where('organizationId', '==', organizationId),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
    limitResults(HISTORICAL_JOB_LIMIT),
  )
  const snapshot = await getDocs(historicalJobsQuery)

  return snapshot.docs.map((jobDocument) =>
    mapJob(jobDocument.id, jobDocument.data()),
  )
}

function requireJobId(jobId: string) {
  if (jobId.trim().length === 0) {
    throw new AssignmentRecommendationError('Job ID is required.')
  }
}

function mapAssignmentRecommendation(
  id: string,
  data: DocumentData,
): AssignmentRecommendation {
  const decision = readRecommendationDecision(data.decision)
  const candidates = Array.isArray(data.candidates)
    ? data.candidates.map(mapAssignmentRecommendationCandidate)
    : []

  return {
    id: readString(data, 'id', id),
    organizationId: readString(data, 'organizationId'),
    isActive: readBoolean(data, 'isActive'),
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
    jobId: readString(data, 'jobId'),
    generatedBy: readString(data, 'generatedBy'),
    generatedAt: readTimestamp(data.generatedAt),
    algorithmVersion:
      data.algorithmVersion === ALGORITHM_VERSION
        ? ALGORITHM_VERSION
        : ALGORITHM_VERSION,
    assignmentMode: 'ai_recommendation',
    candidates,
    status: readRecommendationStatus(data.status),
    decidedAt: readOptionalTimestamp(data.decidedAt),
    decidedBy: readOptionalString(data.decidedBy),
    decision,
    overrideNote: readStringOrNull(data.overrideNote),
    overrideReason: readOverrideReason(data.overrideReason),
    recommendedEmployeeId: readStringOrNull(data.recommendedEmployeeId),
    recommendationCriteriaSnapshot: readScoreBreakdownOrNull(
      data.recommendationCriteriaSnapshot,
    ),
    recommendationScoreSnapshot: readNumberOrNull(
      data.recommendationScoreSnapshot,
    ),
    selectedEmployeeId: readStringOrNull(data.selectedEmployeeId),
  }
}

function mapAssignmentRecommendationCandidate(
  data: DocumentData,
): AssignmentRecommendationCandidate {
  return {
    employeeId: readString(data, 'employeeId'),
    employeeName: readString(data, 'employeeName', 'Workflow employee'),
    explanationReasons: readStringArray(data.explanationReasons),
    rank: readNumber(data, 'rank'),
    scoreBreakdown: readScoreBreakdown(data.scoreBreakdown),
    totalScore: readNumber(data, 'totalScore'),
  }
}

function mapJob(id: string, data: DocumentData): Job {
  return {
    id: readString(data, 'id', id),
    organizationId: readString(data, 'organizationId'),
    title: readString(data, 'title', 'Untitled job'),
    description: readString(data, 'description'),
    customerName: readString(data, 'customerName', 'Unknown customer'),
    customerPhone: readString(data, 'customerPhone'),
    serviceAddress: readString(data, 'serviceAddress'),
    location: readString(data, 'location'),
    priority: readJobPriority(data.priority),
    status: readJobStatus(data.status),
    statusUpdatedAt: readTimestampOrNull(data.statusUpdatedAt),
    statusUpdatedBy: readStringOrNull(data.statusUpdatedBy),
    requiredSkills: readStringArray(data.requiredSkills),
    assignedEmployeeIds: readStringArray(data.assignedEmployeeIds),
    assignedAt: readTimestampOrNull(data.assignedAt),
    assignedBy: readStringOrNull(data.assignedBy),
    startedAt: readTimestampOrNull(data.startedAt),
    startedBy: readStringOrNull(data.startedBy),
    createdBy: readString(data, 'createdBy'),
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
    dueDate: readTimestampOrNull(data.dueDate),
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    workProofCount: readNumber(data, 'workProofCount'),
    issueCount: readNumber(data, 'issueCount'),
    aiRecommendation: data.aiRecommendation ?? null,
    manualOverride: readBoolean(data, 'manualOverride'),
    overrideReason: readStringOrNull(data.overrideReason),
    completedAt: readTimestampOrNull(data.completedAt),
    completedBy: readStringOrNull(data.completedBy),
    isActive: readBoolean(data, 'isActive'),
  }
}

function mapUserProfile(data: DocumentData): RecommendationEmployee {
  const availabilityInfo = readAvailabilityInfo(data.availability)

  return {
    id: readString(data, 'id'),
    organizationId: readString(data, 'organizationId'),
    email: readString(data, 'email'),
    displayName: readString(data, 'displayName', 'Workflow employee'),
    role: data.role === Roles.Employee ? Roles.Employee : Roles.Manager,
    skills: readStringArray(data.skills),
    serviceZone: readOptionalString(data.serviceZone),
    location: readOptionalString(data.location),
    availability: availabilityInfo.value,
    availabilityKnown: availabilityInfo.known,
    isUnavailable: availabilityInfo.isUnavailable,
    activeTaskCount: readNumber(data, 'activeTaskCount'),
    performanceScore: readNumber(data, 'performanceScore'),
    isActive: readBoolean(data, 'isActive'),
    createdAt: readTimestamp(data.createdAt),
    updatedAt: readTimestamp(data.updatedAt),
  }
}



function readJobStatus(value: unknown): JobStatus {
  return validateJobStatus(value) ? value : JobStatuses.Draft
}

function readJobPriority(value: unknown): JobPriority {
  return value === 'Low' ||
    value === 'Medium' ||
    value === 'High' ||
    value === 'Urgent'
    ? value
    : 'Medium'
}

function readRecommendationStatus(
  value: unknown,
): AssignmentRecommendation['status'] {
  return value === 'accepted' || value === 'overridden' || value === 'generated'
    ? value
    : 'generated'
}

function readRecommendationDecision(
  value: unknown,
): AssignmentRecommendation['decision'] {
  return value === 'accepted' || value === 'overridden' ? value : undefined
}

function readOverrideReason(
  value: unknown,
): AssignmentRecommendation['overrideReason'] {
  return value === 'Better local availability' ||
    value === 'Customer requested this employee' ||
    value === 'Special experience required' ||
    value === 'Workload balancing' ||
    value === 'Recommended employee unavailable' ||
    value === 'Manager preference' ||
    value === 'Other'
    ? value
    : null
}

function readScoreBreakdown(value: unknown): AssignmentScoreBreakdown {
  const data = isRecord(value) ? value : {}

  return {
    availability: readNumber(data, 'availability'),
    locationRelevance: readNumber(data, 'locationRelevance'),
    performance: readNumber(data, 'performance'),
    skillMatch: readNumber(data, 'skillMatch'),
    workload: readNumber(data, 'workload'),
  }
}

function readScoreBreakdownOrNull(
  value: unknown,
): AssignmentScoreBreakdown | null {
  return isRecord(value) ? readScoreBreakdown(value) : null
}

function isRecord(value: unknown): value is DocumentData {
  return typeof value === 'object' && value !== null
}

function readAvailabilityInfo(value: unknown): {
  isUnavailable: boolean
  known: boolean
  value: UserProfile['availability']
} {
  if (
    value === 'available' ||
    value === 'busy' ||
    value === 'leave' ||
    value === 'Available' ||
    value === 'Busy' ||
    value === 'Leave'
  ) {
    return {
      isUnavailable: value.toLowerCase() === 'leave',
      known: true,
      value,
    }
  }

  return {
    isUnavailable: false,
    known: false,
    value: 'available',
  }
}
