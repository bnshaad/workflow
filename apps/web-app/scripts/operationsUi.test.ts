import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

import type { Job } from '../src/types/index.ts'
import {
  getJobAttentionReason,
  getJobPrimaryAction,
  matchesJobQuickFilter,
} from '../src/utils/jobOperations.ts'

test('needs-assignment filter includes only open unassigned jobs', () => {
  assert.equal(matchesJobQuickFilter(job(), 'needs-assignment'), true)
  assert.equal(
    matchesJobQuickFilter(job({ assignedEmployeeIds: ['employee-1'] }), 'needs-assignment'),
    false,
  )
  assert.equal(
    matchesJobQuickFilter(job({ status: 'assigned' }), 'needs-assignment'),
    false,
  )
})

test('operational quick filters exclude terminal and progressed work', () => {
  assert.equal(
    matchesJobQuickFilter(
      job({ assignedEmployeeIds: ['employee-1'], status: 'in_progress' }),
      'assigned',
    ),
    false,
  )
  assert.equal(
    matchesJobQuickFilter(
      job({ assignedEmployeeIds: ['employee-1'], status: 'assigned' }),
      'assigned',
    ),
    true,
  )
  assert.equal(
    matchesJobQuickFilter(job({ status: 'completed' }), 'urgent'),
    false,
  )
  assert.equal(
    matchesJobQuickFilter(job({ status: 'cancelled' }), 'urgent'),
    false,
  )
})

test('job actions expose assign and reassign without changing assignment behavior', () => {
  assert.deepEqual(getJobPrimaryAction(job()), {
    href: '/jobs/job-1#assignment-controls',
    label: 'Assign',
  })
  assert.deepEqual(
    getJobPrimaryAction(
      job({ assignedEmployeeIds: ['employee-1'], status: 'assigned' }),
    ),
    { href: '/jobs/job-1#assignment-controls', label: 'Reassign' },
  )
})

test('dashboard attention classification remains deterministic and job-specific', () => {
  const attentionJob = job({ id: 'urgent-job' })

  assert.equal(getJobAttentionReason(attentionJob), 'Urgent and unassigned')
  assert.equal(
    getJobPrimaryAction(attentionJob).href,
    '/jobs/urgent-job#assignment-controls',
  )

  const dashboardSource = source('pages/DashboardPage.tsx')
  assert.match(dashboardSource, /setSelectedDrawerJobId/)
  assert.match(dashboardSource, /summary\?\.operationalJobs/)
  assert.doesNotMatch(dashboardSource, /jobService\.listJobs/)
  assert.match(dashboardSource, /getGeneratedRecommendationJobIds/)
})

test('manager actions remain role-gated from employee and inactive profiles', () => {
  const permissionsSource = source('permissions/permissions.ts')
  const routesSource = source('routes/AppRoutes.tsx')

  assert.match(
    permissionsSource,
    /canCreateJob[\s\S]*?Roles\.Admin, Roles\.Manager/,
  )
  assert.match(
    permissionsSource,
    /canAssignWorker[\s\S]*?Roles\.Admin, Roles\.Manager/,
  )
  assert.match(routesSource, /RoleRoute canAccess=\{canCreateJob\}/)
  assert.match(routesSource, /RoleRoute canAccess=\{canViewJobs\}/)
})

test('primary routes and responsive create action remain available', () => {
  const routesSource = source('routes/AppRoutes.tsx')
  const headerSource = source('components/Header.tsx')
  const sidebarSource = source('components/Sidebar.tsx')

  assert.match(routesSource, /path="\/assignments" element=\{<JobsPage \/>\}/)
  assert.match(routesSource, /path="\/analytics" element=\{<AnalyticsPage \/>\}/)
  assert.match(headerSource, /aria-label="Create job"/)
  assert.match(headerSource, /<span className="hidden sm:inline">Create [Jj]ob<\/span>/)
  assert.match(sidebarSource, /label: 'Dashboard'/)
  assert.doesNotMatch(sidebarSource, /SidebarPrimaryAction/)
  assert.match(source('pages/AnalyticsPage.tsx'), /title="Reports & Evaluation"/)
})

test('recommendation decisions still use the existing persistence flow', () => {
  const detailsSource = source('pages/JobDetailsPage.tsx')

  assert.match(detailsSource, /assignmentRecommendationService\.decideAssignmentRecommendation/)
  assert.match(detailsSource, /ASSIGNMENT_OVERRIDE_REASONS/)
  assert.match(detailsSource, /Accept Recommendation/)
  assert.doesNotMatch(detailsSource, /ScoreBreakdown|Engine:/)
})

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), 'src', relativePath), 'utf8')
}

function job(overrides: Partial<Job> = {}): Job {
  const timestamp = {
    toDate: () => new Date('2026-07-15T08:00:00.000Z'),
  } as Job['createdAt']

  return {
    assignedEmployeeIds: [],
    attachments: [],
    completedAt: null,
    completedBy: null,
    createdAt: timestamp,
    createdBy: 'manager-1',
    customerName: 'Customer',
    customerPhone: '555-0100',
    description: 'Repair requested',
    dueDate: timestamp,
    id: 'job-1',
    isActive: true,
    issueCount: 0,
    location: 'Kakkanad',
    manualOverride: false,
    organizationId: 'organization-1',
    overrideReason: null,
    priority: 'Urgent',
    requiredSkills: [],
    serviceAddress: 'Kakkanad',
    startedAt: null,
    startedBy: null,
    status: 'open',
    statusUpdatedAt: null,
    statusUpdatedBy: null,
    title: 'AC repair',
    updatedAt: timestamp,
    workProofCount: 0,
    aiRecommendation: null,
    assignedAt: null,
    assignedBy: null,
    ...overrides,
  }
}
