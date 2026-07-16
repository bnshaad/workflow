import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const DEMO_ORGANIZATION_ID = 'demo-org-001'
const DEMO_ORGANIZATION_NAME = 'Workflow Demo Services'
const SEED_CONFIRMATION = 'SEED_WORKFLOW_DEMO_SERVICES'
const RESET_CONFIRMATION = 'DELETE_WORKFLOW_DEMO_SERVICES'
const DEMO_AUTH_PASSWORD = 'WorkflowDemo-Only-123!'
const JOB_STATUSES = [
  'draft',
  'open',
  'assigned',
  'in_progress',
  'completed',
  'cancelled',
]
const JOB_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')

loadEnvFile(path.join(appRoot, '.env'))
loadEnvFile(path.join(appRoot, '.env.local'))

const timestampAnchor = new Date('2026-07-04T09:00:00.000Z')
let db
let seedAuthEmulator = false

async function seedDemoDataset() {
  const users = buildUsers()
  const jobs = buildJobs(users.employees)
  const activityAndAudit = buildActivityAndAuditLogs(jobs)
  const writes = [
    {
      ref: db.collection('organizations').doc(DEMO_ORGANIZATION_ID),
      data: buildOrganization(),
    },
    ...users.all.map((user) => ({
      ref: db.collection('users').doc(user.id),
      data: applyWorkloadCounts(user, jobs),
    })),
    ...jobs.map((job) => ({
      ref: db.collection('jobs').doc(job.id),
      data: job,
    })),
    ...activityAndAudit.activities.map((activity) => ({
      ref: db.collection('jobActivities').doc(activity.id),
      data: activity,
    })),
    ...activityAndAudit.auditLogs.map((auditLog) => ({
      ref: db.collection('auditLogs').doc(auditLog.id),
      data: auditLog,
    })),
  ]

  await commitInBatches(writes)

  if (seedAuthEmulator) {
    await seedDemoAuthUsers(users.all)
  }

  return {
    activities: activityAndAudit.activities.length,
    auditLogs: activityAndAudit.auditLogs.length,
    jobs: jobs.length,
    organizations: 1,
    users: users.all.length,
  }
}

async function seedDemoAuthUsers(users) {
  const auth = getAuth()

  for (const user of users) {
    try {
      const existingUser = await auth.getUser(user.id)

      if (existingUser.email !== user.email) {
        throw new Error(
          `Auth user ${user.id} is already associated with a different email.`,
        )
      }
    } catch (error) {
      if (getAuthErrorCode(error) !== 'auth/user-not-found') {
        throw error
      }

      await auth.createUser({
        displayName: user.displayName,
        email: user.email,
        emailVerified: true,
        password: DEMO_AUTH_PASSWORD,
        uid: user.id,
      })
    }
  }
}

async function resetDemoOrganization() {
  console.log(`Resetting demo organization ${DEMO_ORGANIZATION_ID} only...`)

  for (const collectionName of [
    'auditLogs',
    'jobActivities',
    'jobs',
    'users',
  ]) {
    await deleteCollectionDocumentsByOrganization(collectionName)
  }

  await db.collection('organizations').doc(DEMO_ORGANIZATION_ID).delete()
  console.log('Demo organization reset complete.')
}

async function deleteCollectionDocumentsByOrganization(collectionName) {
  const snapshot = await db
    .collection(collectionName)
    .where('organizationId', '==', DEMO_ORGANIZATION_ID)
    .get()

  await commitInBatches(
    snapshot.docs.map((documentSnapshot) => ({
      ref: documentSnapshot.ref,
      delete: true,
    })),
  )

  console.log(`Deleted ${snapshot.size} ${collectionName} demo documents.`)
}

function buildOrganization() {
  const createdAt = toTimestamp(-40, 9)

  return {
    id: DEMO_ORGANIZATION_ID,
    organizationId: DEMO_ORGANIZATION_ID,
    name: DEMO_ORGANIZATION_NAME,
    isActive: true,
    createdAt,
    updatedAt: toTimestamp(0, 9),
  }
}

function buildUsers() {
  const admin = createUser({
    id: 'LWPlJkdHfcMnaLXzYwvKFdBB6ky1',
    email: 'admin@workflow.local',
    displayName: 'Admin User',
    role: 'admin',
  })
  const managers = [
    createUser({
      id: 'QwqyXsRidjONYocpCPMw7BBtDsp2',
      email: 'manager@workflow.local',
      displayName: 'Manager User',
      role: 'manager',
    }),
    createUser({
      id: 'demo-manager-002',
      email: 'dispatch.manager@workflow.local',
      displayName: 'Dispatch Manager',
      role: 'manager',
    }),
  ]
  const employees = [
    createUser({
      id: 'PfiwacyF9TW3MgROr4YMA494DF83',
      email: 'employee@workflow.local',
      displayName: 'Employee User',
      role: 'employee',
      skills: ['AC Repair', 'Installation'],
      performanceScore: 96,
    }),
    createUser({
      id: 'demo-employee-002',
      email: 'nina.patel@workflow.local',
      displayName: 'Nina Patel',
      role: 'employee',
      skills: ['Refrigerant Charging', 'Diagnostics'],
      performanceScore: 94,
    }),
    createUser({
      id: 'demo-employee-003',
      email: 'omar.hassan@workflow.local',
      displayName: 'Omar Hassan',
      role: 'employee',
      skills: ['Circuit Boards', 'Smart Thermostats'],
      performanceScore: 91,
    }),
    createUser({
      id: 'demo-employee-004',
      email: 'mia.chen@workflow.local',
      displayName: 'Mia Chen',
      role: 'employee',
      skills: ['Compressor Repair', 'Preventive Maintenance'],
      performanceScore: 89,
    }),
    createUser({
      id: 'demo-employee-005',
      email: 'leo.martinez@workflow.local',
      displayName: 'Leo Martinez',
      role: 'employee',
      skills: ['Appliance Electronics', 'Motor Replacement'],
      performanceScore: 92,
    }),
    createUser({
      id: 'demo-employee-006',
      email: 'aisha.robinson@workflow.local',
      displayName: 'Aisha Robinson',
      role: 'employee',
      skills: ['Installation', 'Ductless Systems'],
      performanceScore: 88,
    }),
    createUser({
      id: 'demo-employee-007',
      email: 'ben.walker@workflow.local',
      displayName: 'Ben Walker',
      role: 'employee',
      skills: ['Wiring', 'Control Panels'],
      performanceScore: 86,
    }),
    createUser({
      id: 'demo-employee-008',
      email: 'sofia.garcia@workflow.local',
      displayName: 'Sofia Garcia',
      role: 'employee',
      skills: ['AC Repair', 'Customer Handover'],
      performanceScore: 95,
    }),
    createUser({
      id: 'demo-employee-009',
      email: 'ethan.kim@workflow.local',
      displayName: 'Ethan Kim',
      role: 'employee',
      skills: ['Diagnostics', 'Inverter Systems'],
      performanceScore: 90,
    }),
    createUser({
      id: 'demo-employee-010',
      email: 'priya.nair@workflow.local',
      displayName: 'Priya Nair',
      role: 'employee',
      skills: ['Electronics Repair', 'Safety Inspection'],
      performanceScore: 93,
    }),
  ]

  return {
    admin,
    managers,
    employees,
    all: [admin, ...managers, ...employees],
  }
}

function createUser({
  id,
  email,
  displayName,
  role,
  skills = [],
  performanceScore = 100,
}) {
  return {
    id,
    organizationId: DEMO_ORGANIZATION_ID,
    email,
    displayName,
    role,
    skills,
    availability: 'available',
    activeTaskCount: 0,
    performanceScore,
    isActive: true,
    createdAt: toTimestamp(-35, 9),
    updatedAt: toTimestamp(0, 9),
  }
}

const employeeLoadPattern = [0, 0, 0, 1, 1, 2, 0, 3, 1, 4, 5, 2, 6, 0, 7, 8, 1, 9]

const serviceTitles = [
  'Split AC cooling issue',
  'Smart TV power board repair',
  'Compressor noise inspection',
  'Ductless AC installation',
  'Refrigerator control panel fault',
  'Thermostat calibration',
  'Commercial AC preventive service',
  'Washing machine inverter fault',
]

const serviceDescriptions = [
  'Customer reports weak cooling and uneven airflow across the living room.',
  'Unit fails to power on and requires electronics diagnostics.',
  'Outdoor unit is vibrating loudly during startup.',
  'Install new ductless system and complete basic handover checks.',
  'Display panel flickers and appliance resets during operation.',
  'Thermostat readings drift from room temperature and need calibration.',
  'Scheduled preventive service for filters, coils, and electrical contacts.',
  'Motor controller fault suspected after intermittent spin failure.',
]

const customerNames = [
  'Avery Johnson',
  'Morgan Lee',
  'Taylor Brooks',
  'Jordan Smith',
  'Riley Cooper',
  'Casey Bennett',
  'Samira Khan',
  'Noah Wilson',
  'Elena Rivera',
  'Dev Patel',
]

const serviceAddresses = [
  '1248 Maple Street',
  '88 Harbor View Road',
  '409 Cedar Avenue',
  '72 North Market Lane',
  '930 Pinecrest Drive',
  '15 Lakeside Plaza',
  '6700 West Commerce Park',
  '311 Orchard Court',
  '502 Sunrise Boulevard',
  '44 Hilltop Terrace',
]

const serviceLocations = [
  'North District',
  'Harbor Area',
  'Central City',
  'Market Quarter',
  'Westside',
  'Lakeside',
  'Commerce Park',
  'East End',
  'South Boulevard',
  'Hilltop',
]

const skillSets = [
  ['AC Repair', 'Diagnostics'],
  ['Circuit Boards', 'Electronics Repair'],
  ['Compressor Repair', 'Safety Inspection'],
  ['Installation', 'Ductless Systems'],
  ['Appliance Electronics', 'Control Panels'],
  ['Smart Thermostats', 'Diagnostics'],
]

function buildJobs(employees) {
  const statusPlan = [
    ...Array.from({ length: 4 }, () => 'draft'),
    ...Array.from({ length: 7 }, () => 'open'),
    ...Array.from({ length: 8 }, () => 'assigned'),
    ...Array.from({ length: 6 }, () => 'in_progress'),
    ...Array.from({ length: 5 }, () => 'completed'),
    ...Array.from({ length: 2 }, () => 'cancelled'),
  ]

  return statusPlan.map((status, index) => {
    const jobNumber = index + 1
    const employeeIds = getAssignedEmployeeIds(status, jobNumber, employees)
    const createdAt = toTimestamp(-31 + index, 8 + (index % 7))
    const openedAt = addHours(createdAt, 2)
    const assignedAt = employeeIds.length > 0 ? addHours(openedAt, 3) : null
    const startedAt =
      status === 'in_progress' || status === 'completed'
        ? addHours(assignedAt ?? openedAt, 5)
        : null
    const completedAt =
      status === 'completed' ? addHours(startedAt ?? openedAt, 7) : null
    const cancelledAt = status === 'cancelled' ? addHours(openedAt, 4) : null
    const statusUpdatedAt =
      completedAt ?? startedAt ?? assignedAt ?? cancelledAt ?? openedAt
    const statusUpdatedBy =
      status === 'in_progress' || status === 'completed'
        ? employeeIds[0]
        : 'QwqyXsRidjONYocpCPMw7BBtDsp2'

    return {
      id: formatJobId(jobNumber),
      organizationId: DEMO_ORGANIZATION_ID,
      title: serviceTitles[index % serviceTitles.length],
      description: serviceDescriptions[index % serviceDescriptions.length],
      customerName: customerNames[index % customerNames.length],
      customerPhone: `555-01${String(jobNumber).padStart(2, '0')}`,
      serviceAddress: serviceAddresses[index % serviceAddresses.length],
      location: serviceLocations[index % serviceLocations.length],
      priority: JOB_PRIORITIES[index % JOB_PRIORITIES.length],
      status,
      statusUpdatedAt: status === 'draft' ? null : statusUpdatedAt,
      statusUpdatedBy: status === 'draft' ? null : statusUpdatedBy,
      requiredSkills: skillSets[index % skillSets.length],
      assignedEmployeeIds: employeeIds,
      assignedAt,
      assignedBy: assignedAt ? 'QwqyXsRidjONYocpCPMw7BBtDsp2' : null,
      startedAt,
      startedBy: startedAt ? employeeIds[0] : null,
      createdBy: index % 3 === 0 ? 'demo-manager-002' : 'QwqyXsRidjONYocpCPMw7BBtDsp2',
      createdAt,
      updatedAt: status === 'draft' ? createdAt : statusUpdatedAt,
      dueDate: buildDueDate(status, index),
      attachments: [],
      workProofCount: status === 'completed' ? 1 + (index % 2) : 0,
      issueCount: index % 11 === 0 ? 1 : 0,
      aiRecommendation: null,
      manualOverride: index % 9 === 0,
      overrideReason: index % 9 === 0 ? 'Manager balanced workload manually.' : null,
      completedAt,
      completedBy: completedAt ? employeeIds[0] : null,
      isActive: true,
    }
  })
}

function getAssignedEmployeeIds(status, jobNumber, employees) {
  if (status === 'draft' || status === 'open') {
    return []
  }

  const primaryIndex = employeeLoadPattern[(jobNumber - 1) % employeeLoadPattern.length]
  const primaryEmployee = employees[primaryIndex]

  if (jobNumber % 7 === 0) {
    const secondaryEmployee = employees[(primaryIndex + 3) % employees.length]
    return [primaryEmployee.id, secondaryEmployee.id]
  }

  return [primaryEmployee.id]
}

function buildActivityAndAuditLogs(jobs) {
  const activities = []
  const auditLogs = []

  for (const job of jobs) {
    if (job.status === 'draft') {
      continue
    }

    const openedAt = addHours(job.createdAt, 2)
    activities.push(createStatusActivity(job, openedAt, 'draft', 'open'))
    auditLogs.push(createStatusAuditLog(job, openedAt, 'draft', 'open'))

    if (job.assignedAt && job.assignedEmployeeIds.length > 0) {
      activities.push(createAssignmentActivity(job))
      auditLogs.push(createAssignmentAuditLog(job))
    }

    if (job.startedAt && job.startedBy) {
      activities.push(createEmployeeActivity(job, 'start'))
      auditLogs.push(createEmployeeAuditLog(job, 'start'))
    }

    if (job.completedAt && job.completedBy) {
      activities.push(createEmployeeActivity(job, 'complete'))
      auditLogs.push(createEmployeeAuditLog(job, 'complete'))
    }

    if (job.status === 'cancelled' && job.statusUpdatedAt) {
      activities.push(
        createStatusActivity(job, job.statusUpdatedAt, 'open', 'cancelled'),
      )
      auditLogs.push(
        createStatusAuditLog(job, job.statusUpdatedAt, 'open', 'cancelled'),
      )
    }
  }

  return { activities, auditLogs }
}

function createStatusActivity(job, timestamp, fromStatus, toStatus) {
  return {
    id: `${job.id}-activity-${fromStatus}-to-${toStatus}`,
    organizationId: DEMO_ORGANIZATION_ID,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    jobId: job.id,
    type: 'status_changed',
    fromStatus,
    toStatus,
    createdBy: job.createdBy,
    description: `Status changed from ${fromStatus} to ${toStatus}.`,
  }
}

function createStatusAuditLog(job, timestamp, fromStatus, toStatus) {
  return {
    id: `${job.id}-audit-${fromStatus}-to-${toStatus}`,
    organizationId: DEMO_ORGANIZATION_ID,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    actorId: job.createdBy,
    action: 'job.status_updated',
    entityId: job.id,
    entityType: 'job',
    metadata: {
      fromStatus,
      toStatus,
      jobId: job.id,
    },
  }
}

function createAssignmentActivity(job) {
  return {
    id: `${job.id}-activity-assigned`,
    organizationId: DEMO_ORGANIZATION_ID,
    isActive: true,
    createdAt: job.assignedAt,
    updatedAt: job.assignedAt,
    jobId: job.id,
    type: 'employees_assigned',
    fromStatus: 'open',
    toStatus: 'assigned',
    employeeIds: job.assignedEmployeeIds,
    employeeNames: job.assignedEmployeeIds,
    createdBy: job.assignedBy,
    description: `Assigned ${job.assignedEmployeeIds.length} employee(s).`,
  }
}

function createAssignmentAuditLog(job) {
  return {
    id: `${job.id}-audit-assigned`,
    organizationId: DEMO_ORGANIZATION_ID,
    isActive: true,
    createdAt: job.assignedAt,
    updatedAt: job.assignedAt,
    actorId: job.assignedBy,
    action: 'job_employees_assigned',
    entityId: job.id,
    entityType: 'job',
    metadata: {
      assignmentMode: 'manual',
      employeeIds: job.assignedEmployeeIds,
      employeeNames: job.assignedEmployeeIds,
      fromStatus: 'open',
      jobId: job.id,
      previousEmployeeIds: [],
      newEmployeeIds: job.assignedEmployeeIds,
      newEmployeeNames: job.assignedEmployeeIds,
      toStatus: 'assigned',
    },
  }
}

function createEmployeeActivity(job, action) {
  const isComplete = action === 'complete'
  const timestamp = isComplete ? job.completedAt : job.startedAt
  const employeeId = isComplete ? job.completedBy : job.startedBy

  return {
    id: `${job.id}-activity-employee-${action}`,
    organizationId: DEMO_ORGANIZATION_ID,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    jobId: job.id,
    type: isComplete ? 'employee_completed_job' : 'employee_started_job',
    fromStatus: isComplete ? 'in_progress' : 'assigned',
    toStatus: isComplete ? 'completed' : 'in_progress',
    employeeId,
    performedAt: timestamp,
    performedBy: employeeId,
    createdBy: employeeId,
    description: isComplete
      ? 'Employee completed the job.'
      : 'Employee started the job.',
  }
}

function createEmployeeAuditLog(job, action) {
  const isComplete = action === 'complete'
  const timestamp = isComplete ? job.completedAt : job.startedAt
  const employeeId = isComplete ? job.completedBy : job.startedBy

  return {
    id: `${job.id}-audit-employee-${action}`,
    organizationId: DEMO_ORGANIZATION_ID,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    actorId: employeeId,
    action: isComplete
      ? 'job_completed_by_employee'
      : 'job_started_by_employee',
    entityId: job.id,
    entityType: 'job',
    metadata: {
      employeeId,
      fromStatus: isComplete ? 'in_progress' : 'assigned',
      jobId: job.id,
      organizationId: DEMO_ORGANIZATION_ID,
      performedAt: timestamp,
      performedBy: employeeId,
      toStatus: isComplete ? 'completed' : 'in_progress',
    },
  }
}

function applyWorkloadCounts(user, jobs) {
  if (user.role !== 'employee') {
    return user
  }

  const activeTaskCount = jobs.filter(
    (job) =>
      job.assignedEmployeeIds.includes(user.id) &&
      (job.status === 'assigned' || job.status === 'in_progress'),
  ).length

  return {
    ...user,
    activeTaskCount,
    availability: activeTaskCount > 3 ? 'busy' : 'available',
  }
}

async function commitInBatches(writes) {
  for (let index = 0; index < writes.length; index += 450) {
    const batch = db.batch()
    const chunk = writes.slice(index, index + 450)

    for (const write of chunk) {
      if (write.delete) {
        batch.delete(write.ref)
      } else {
        batch.set(write.ref, write.data)
      }
    }

    await batch.commit()
  }
}

function initializeFirebaseAdmin(projectId) {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const serviceAccountJson = readServiceAccountJson()

  return initializeApp({
    credential: serviceAccountJson
      ? cert(serviceAccountJson)
      : applicationDefault(),
    projectId,
  })
}

function readServiceAccountJson() {
  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ??
    decodeBase64(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64)

  if (!rawJson) {
    return null
  }

  return JSON.parse(rawJson)
}

function assertSafeSeedEnvironment(parsedOptions) {
  const projectId = getRequiredEnv('VITE_FIREBASE_PROJECT_ID')
  const firebaseEnvironment = process.env.WORKFLOW_FIREBASE_ENV
  const blockedProjectIds = (
    process.env.WORKFLOW_PRODUCTION_FIREBASE_PROJECT_IDS ?? ''
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (process.env.WORKFLOW_DEMO_SEED_ENABLED !== 'true') {
    throw new Error('Set WORKFLOW_DEMO_SEED_ENABLED=true before seeding.')
  }

  if (firebaseEnvironment !== 'development') {
    throw new Error('Set WORKFLOW_FIREBASE_ENV=development before seeding.')
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed while NODE_ENV=production.')
  }

  if (/prod|production/i.test(projectId)) {
    throw new Error(`Refusing to seed production-looking project: ${projectId}`)
  }

  if (blockedProjectIds.includes(projectId)) {
    throw new Error(`Refusing to seed configured production project: ${projectId}`)
  }

  if (parsedOptions.confirm !== SEED_CONFIRMATION) {
    throw new Error(`Pass --confirm=${SEED_CONFIRMATION} to seed demo data.`)
  }

  if (parsedOptions.reset && parsedOptions.confirmReset !== RESET_CONFIRMATION) {
    throw new Error(
      `Pass --confirm-reset=${RESET_CONFIRMATION} to reset demo data.`,
    )
  }

  if (parsedOptions.withAuthEmulator) {
    assertLocalAuthEmulator(projectId)
  }
}

function assertLocalAuthEmulator(projectId) {
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST

  if (projectId !== 'workflow-integration') {
    throw new Error(
      'Auth demo seeding is restricted to the workflow-integration emulator project.',
    )
  }

  if (authEmulatorHost !== '127.0.0.1:9099') {
    throw new Error(
      'Set FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 to seed local Auth users.',
    )
  }

  if (firestoreEmulatorHost !== '127.0.0.1:8080') {
    throw new Error(
      'Set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 to seed local demo data.',
    )
  }
}

function parseArgs(args) {
  return args.reduce(
    (parsedOptions, arg) => {
      if (arg === '--reset') {
        return { ...parsedOptions, reset: true }
      }

      if (arg === '--with-auth-emulator') {
        return { ...parsedOptions, withAuthEmulator: true }
      }

      if (arg.startsWith('--confirm=')) {
        return { ...parsedOptions, confirm: arg.slice('--confirm='.length) }
      }

      if (arg.startsWith('--confirm-reset=')) {
        return {
          ...parsedOptions,
          confirmReset: arg.slice('--confirm-reset='.length),
        }
      }

      return parsedOptions
    },
    { confirm: '', confirmReset: '', reset: false, withAuthEmulator: false },
  )
}

function getAuthErrorCode(error) {
  return error && typeof error === 'object' && 'code' in error
    ? error.code
    : undefined
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return
  }

  const lines = readFileSync(filePath, 'utf8').split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmedLine.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const value = stripQuotes(trimmedLine.slice(separatorIndex + 1).trim())

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function getRequiredEnv(key) {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

function decodeBase64(value) {
  return value ? Buffer.from(value, 'base64').toString('utf8') : null
}

function formatJobId(jobNumber) {
  return `demo-job-${String(jobNumber).padStart(3, '0')}`
}

function toTimestamp(dayOffset, hour) {
  const date = new Date(timestampAnchor)
  date.setUTCDate(date.getUTCDate() + dayOffset)
  date.setUTCHours(hour, 0, 0, 0)

  return Timestamp.fromDate(date)
}

function addHours(timestamp, hours) {
  return Timestamp.fromMillis(timestamp.toMillis() + hours * 60 * 60 * 1000)
}

function buildDueDate(status, index) {
  if (status === 'draft') {
    return null
  }

  if (['open', 'assigned', 'in_progress'].includes(status) && index % 5 === 0) {
    return toTimestamp(-2, 17)
  }

  if (status === 'completed') {
    return toTimestamp(-8 + (index % 4), 17)
  }

  return toTimestamp(2 + (index % 12), 17)
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2))

    assertSafeSeedEnvironment(options)

    const projectId = getRequiredEnv('VITE_FIREBASE_PROJECT_ID')
    db = getFirestore(initializeFirebaseAdmin(projectId))
    seedAuthEmulator = options.withAuthEmulator

    console.log(`Connected Firebase project ID: ${projectId}`)

    if (options.reset) {
      await resetDemoOrganization()
    }

    const counts = await seedDemoDataset()

    console.log(`Organizations written: ${counts.organizations}`)
    console.log(`Users written: ${counts.users}`)
    console.log(`Jobs written: ${counts.jobs}`)
    console.log(`Job activities written: ${counts.activities}`)
    console.log(`Audit logs written: ${counts.auditLogs}`)
    console.log(
      `Seeded ${DEMO_ORGANIZATION_NAME} (${DEMO_ORGANIZATION_ID}) in Firebase project ${projectId}.`,
    )
    console.log('Demo dataset seed complete.')
  } catch (error) {
    console.error('Demo dataset seed failed.')
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

await main()
