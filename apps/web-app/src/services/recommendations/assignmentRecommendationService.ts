import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitResults,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { canAssignWorker } from '@/permissions'
import { requireActiveProfile, requireTenantAccess } from '@/services/common'
import { firestore } from '@/services/firestore'
import {
  JobStatuses,
  type AssignmentRecommendation,
  type AssignmentRecommendationCandidate,
  type AssignmentScoreBreakdown,
  type Job,
  type JobPriority,
  type JobStatus,
  type UserProfile,
} from '@/types'
import { Roles } from '@/permissions/roles'
import { validateJobStatus } from '@/validators/jobValidator'

const JOBS_COLLECTION = 'jobs'
const USERS_COLLECTION = 'users'
const RECOMMENDATIONS_COLLECTION = 'recommendations'
const AUDIT_LOGS_COLLECTION = 'auditLogs'
const ALGORITHM_VERSION = 'rule-based-v1'
const TOP_CANDIDATE_LIMIT = 5
const HISTORICAL_JOB_LIMIT = 100

export type GenerateAssignmentRecommendationsResult = {
  recommendation: AssignmentRecommendation
}

type HistoricalPerformance = {
  completedJobs: number
  consideredJobs: number
}

type RecommendationEmployee = UserProfile & {
  availabilityKnown: boolean
  isUnavailable: boolean
}

export class AssignmentRecommendationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssignmentRecommendationError'
  }
}

export interface AssignmentRecommendationService {
  generateAssignmentRecommendations(
    profile: UserProfile,
    organizationId: string,
    jobId: string,
  ): Promise<GenerateAssignmentRecommendationsResult>
}

export const assignmentRecommendationService: AssignmentRecommendationService = {
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
    const candidates = rankCandidates(job, employees, historicalJobs)
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
    .filter((employee) => isEligibleForRecommendation(employee))
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

function rankCandidates(
  job: Job,
  employees: RecommendationEmployee[],
  historicalJobs: Job[],
) {
  return employees
    .map((employee) => scoreEmployee(job, employee, historicalJobs))
    .sort((firstCandidate, secondCandidate) => {
      return (
        secondCandidate.totalScore - firstCandidate.totalScore ||
        firstCandidate.employeeName.localeCompare(secondCandidate.employeeName)
      )
    })
    .slice(0, TOP_CANDIDATE_LIMIT)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }))
}

function scoreEmployee(
  job: Job,
  employee: RecommendationEmployee,
  historicalJobs: Job[],
): AssignmentRecommendationCandidate {
  const skillScore = scoreSkillMatch(job.requiredSkills, employee.skills)
  const availabilityScore = scoreAvailability(employee)
  const workloadScore = scoreWorkload(
    getActiveWorkload(employee.id, historicalJobs),
  )
  const locationScore = scoreLocationRelevance(job.location)
  const performanceScore = scoreHistoricalPerformance(
    getHistoricalPerformance(employee.id, historicalJobs),
  )
  const scoreBreakdown: AssignmentScoreBreakdown = {
    availability: availabilityScore.score,
    locationRelevance: locationScore.score,
    performance: performanceScore.score,
    skillMatch: skillScore.score,
    workload: workloadScore.score,
  }
  const totalScore =
    scoreBreakdown.skillMatch +
    scoreBreakdown.availability +
    scoreBreakdown.workload +
    scoreBreakdown.locationRelevance +
    scoreBreakdown.performance

  return {
    employeeId: employee.id,
    employeeName: employee.displayName,
    rank: 0,
    totalScore,
    scoreBreakdown,
    explanationReasons: [
      ...skillScore.reasons,
      ...availabilityScore.reasons,
      ...workloadScore.reasons,
      ...locationScore.reasons,
      ...performanceScore.reasons,
    ],
  }
}

function scoreSkillMatch(requiredSkills: string[], employeeSkills: string[]) {
  const normalizedRequiredSkills = normalizeList(requiredSkills)
  const normalizedEmployeeSkills = normalizeList(employeeSkills)

  if (normalizedRequiredSkills.length === 0) {
    return {
      score: 0,
      reasons: ['Insufficient data: job has no required skills.'],
    }
  }

  if (normalizedEmployeeSkills.length === 0) {
    return {
      score: 0,
      reasons: ['No employee skills are available for matching.'],
    }
  }

  const matchedSkills = normalizedRequiredSkills.filter((requiredSkill) =>
    normalizedEmployeeSkills.includes(requiredSkill),
  )
  const score = Math.round(
    (matchedSkills.length / normalizedRequiredSkills.length) * 35,
  )

  return {
    score,
    reasons:
      matchedSkills.length > 0
        ? [
            `Matched ${matchedSkills.length} of ${normalizedRequiredSkills.length} required skill(s).`,
          ]
        : ['No required skills matched.'],
  }
}

function scoreAvailability(employee: RecommendationEmployee) {
  if (!employee.availabilityKnown) {
    return {
      score: 0,
      reasons: ['Insufficient availability data for scoring.'],
    }
  }

  const normalizedAvailability = employee.availability.toLowerCase()

  if (normalizedAvailability === 'available') {
    return {
      score: 25,
      reasons: ['Employee is marked available.'],
    }
  }

  if (normalizedAvailability === 'busy') {
    return {
      score: 12,
      reasons: ['Employee is marked busy, so availability is reduced.'],
    }
  }

  return {
    score: 0,
    reasons: ['Insufficient availability data for scoring.'],
  }
}

function scoreWorkload(activeTaskCount: number) {
  if (!Number.isFinite(activeTaskCount)) {
    return {
      score: 0,
      reasons: ['Insufficient workload data for scoring.'],
    }
  }

  if (activeTaskCount <= 0) {
    return {
      score: 20,
      reasons: ['Employee has no active assigned jobs.'],
    }
  }

  if (activeTaskCount === 1) {
    return {
      score: 16,
      reasons: ['Employee has a light active workload.'],
    }
  }

  if (activeTaskCount === 2) {
    return {
      score: 12,
      reasons: ['Employee has a moderate active workload.'],
    }
  }

  if (activeTaskCount === 3) {
    return {
      score: 8,
      reasons: ['Employee has a high active workload.'],
    }
  }

  return {
    score: activeTaskCount === 4 ? 4 : 0,
    reasons: ['Employee has a very high active workload.'],
  }
}

function scoreLocationRelevance(jobLocation: string) {
  if (jobLocation.trim().length === 0) {
    return {
      score: 0,
      reasons: ['Insufficient data: job has no location note.'],
    }
  }

  return {
    score: 0,
    reasons: [
      'Insufficient data: employee service area or location history is not available.',
    ],
  }
}

function scoreHistoricalPerformance(performance: HistoricalPerformance) {
  if (performance.consideredJobs === 0) {
    return {
      score: 0,
      reasons: ['Insufficient historical completion data for performance scoring.'],
    }
  }

  const score = Math.round(
    (performance.completedJobs / performance.consideredJobs) * 10,
  )

  return {
    score,
    reasons: [
      `Completed ${performance.completedJobs} of ${performance.consideredJobs} historical assigned job(s).`,
    ],
  }
}

function getHistoricalPerformance(
  employeeId: string,
  historicalJobs: Job[],
): HistoricalPerformance {
  const consideredJobs = historicalJobs.filter((job) => {
    return (
      job.assignedEmployeeIds.includes(employeeId) &&
      (job.status === JobStatuses.Completed ||
        job.status === JobStatuses.Cancelled)
    )
  })
  const completedJobs = consideredJobs.filter((job) => {
    return job.status === JobStatuses.Completed && job.completedAt !== null
  })

  return {
    completedJobs: completedJobs.length,
    consideredJobs: consideredJobs.length,
  }
}

function getActiveWorkload(employeeId: string, historicalJobs: Job[]) {
  return historicalJobs.filter((job) => {
    return (
      job.assignedEmployeeIds.includes(employeeId) &&
      (job.status === JobStatuses.Assigned ||
        job.status === JobStatuses.InProgress)
    )
  }).length
}

function isEligibleForRecommendation(employee: RecommendationEmployee) {
  const availability = employee.availability.toLowerCase()

  return (
    employee.role === Roles.Employee &&
    !employee.isUnavailable &&
    availability !== 'leave'
  )
}

function normalizeList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}

function requireJobId(jobId: string) {
  if (jobId.trim().length === 0) {
    throw new AssignmentRecommendationError('Job ID is required.')
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

function readString(data: DocumentData, key: string, fallback = '') {
  const value = data[key]

  return typeof value === 'string' ? value : fallback
}

function readStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function readBoolean(data: DocumentData, key: string) {
  return typeof data[key] === 'boolean' ? data[key] : false
}

function readNumber(data: DocumentData, key: string) {
  return typeof data[key] === 'number' && Number.isFinite(data[key])
    ? data[key]
    : 0
}

function readTimestamp(value: unknown) {
  return value instanceof Timestamp ? value : Timestamp.fromMillis(0)
}

function readTimestampOrNull(value: unknown) {
  return value instanceof Timestamp ? value : null
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
