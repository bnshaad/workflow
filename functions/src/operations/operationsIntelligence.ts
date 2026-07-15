import {
  getFirestore,
  type DocumentData,
  type Firestore,
} from 'firebase-admin/firestore'
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import {
  buildOperationsToolResult,
  isOperationsIntent,
  type OperationsEmployeeInput,
  type OperationsIntent,
  type OperationsJobInput,
  type OperationsToolResult,
} from '../../../shared/operationsIntelligence.js'
import { requireTrustedManager } from '../auth/requireTrustedManager.js'

const JOBS_COLLECTION = 'jobs'
const USERS_COLLECTION = 'users'
const SOURCE_JOB_LIMIT = 200
const SOURCE_EMPLOYEE_LIMIT = 100

type TrustedOperationsProfile = {
  id: string
  organizationId: string
}

type OperationsRequest = {
  intent: OperationsIntent
  jobId: string | null
}

export async function getOperationsInsight(
  request: CallableRequest<unknown>,
): Promise<OperationsToolResult> {
  const caller = await requireTrustedManager(request)
  const input = readOperationsRequest(request.data)

  return createOperationsIntelligenceService(getFirestore()).getInsight(
    caller,
    input,
  )
}

export function createOperationsIntelligenceService(
  firestore: Firestore,
  now: () => number = Date.now,
) {
  return {
    async getInsight(
      caller: TrustedOperationsProfile,
      input: OperationsRequest,
    ): Promise<OperationsToolResult> {
      const nowMillis = now()

      if (input.intent === 'explain_job_attention_flag') {
        if (!input.jobId) {
          throw new HttpsError(
            'invalid-argument',
            'A job ID is required for an attention explanation.',
          )
        }

        const snapshot = await firestore
          .collection(JOBS_COLLECTION)
          .doc(input.jobId)
          .get()
        const data = snapshot.data()

        if (
          !snapshot.exists ||
          !data ||
          data.organizationId !== caller.organizationId ||
          data.isActive !== true
        ) {
          throw new HttpsError('not-found', 'The job was not found.')
        }

        return buildOperationsToolResult({
          intent: input.intent,
          isTruncated: false,
          jobs: [mapOperationsJob(snapshot.id, data)],
          nowMillis,
          sourceJobLimit: 1,
        })
      }

      const jobsSnapshot = await firestore
        .collection(JOBS_COLLECTION)
        .where('organizationId', '==', caller.organizationId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(SOURCE_JOB_LIMIT)
        .select(
          'assignedEmployeeIds',
          'dueDate',
          'isActive',
          'priority',
          'status',
          'title',
        )
        .get()
      const jobs = jobsSnapshot.docs.map((snapshot) =>
        mapOperationsJob(snapshot.id, snapshot.data()),
      )

      if (input.intent !== 'show_workload_distribution') {
        return buildOperationsToolResult({
          intent: input.intent,
          isTruncated: jobsSnapshot.size === SOURCE_JOB_LIMIT,
          jobs,
          nowMillis,
          sourceJobLimit: SOURCE_JOB_LIMIT,
        })
      }

      const employeeSnapshot = await firestore
        .collection(USERS_COLLECTION)
        .where('organizationId', '==', caller.organizationId)
        .where('isActive', '==', true)
        .where('role', '==', 'employee')
        .limit(SOURCE_EMPLOYEE_LIMIT)
        .select('displayName')
        .get()

      return buildOperationsToolResult({
        employeeIsTruncated: employeeSnapshot.size === SOURCE_EMPLOYEE_LIMIT,
        employees: employeeSnapshot.docs.map((snapshot) =>
          mapOperationsEmployee(snapshot.id, snapshot.data()),
        ),
        intent: input.intent,
        isTruncated: jobsSnapshot.size === SOURCE_JOB_LIMIT,
        jobs,
        nowMillis,
        sourceEmployeeLimit: SOURCE_EMPLOYEE_LIMIT,
        sourceJobLimit: SOURCE_JOB_LIMIT,
      })
    },
  }
}

function readOperationsRequest(value: unknown): OperationsRequest {
  if (!value || typeof value !== 'object') {
    throw new HttpsError('invalid-argument', 'An operations intent is required.')
  }

  const input = value as Record<string, unknown>
  if (!isOperationsIntent(input.intent)) {
    throw new HttpsError('invalid-argument', 'The operations intent is not supported.')
  }

  const rawJobId = input.jobId
  if (
    rawJobId !== undefined &&
    rawJobId !== null &&
    (typeof rawJobId !== 'string' ||
      rawJobId.trim().length === 0 ||
      rawJobId.length > 128)
  ) {
    throw new HttpsError('invalid-argument', 'A valid job ID is required.')
  }

  return {
    intent: input.intent,
    jobId: typeof rawJobId === 'string' ? rawJobId.trim() : null,
  }
}

function mapOperationsJob(
  id: string,
  data: DocumentData,
): OperationsJobInput {
  return {
    assignedEmployeeIds: readStringArray(data.assignedEmployeeIds),
    dueAtMillis: readTimestampMillis(data.dueDate),
    id,
    isActive: data.isActive === true,
    priority: readString(data.priority),
    status: readString(data.status),
    title: readString(data.title) || id,
  }
}

function mapOperationsEmployee(
  id: string,
  data: DocumentData,
): OperationsEmployeeInput {
  return {
    displayName: readString(data.displayName) || id,
    id,
  }
}

function readTimestampMillis(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    const millis = value.toMillis()
    return typeof millis === 'number' && Number.isFinite(millis) ? millis : null
  }

  return null
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}
