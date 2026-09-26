// Domain barrel export for mobile app
// Local copies of shared domain code to avoid Metro bundler cross-boundary issues.

export type {
  Job,
  JobActivity,
  JobActivityType,
  JobAttachment,
  JobPriority,
  JobStatus,
  UserProfile,
  Incident,
  IncidentCategory,
  IncidentStatus,
} from './models'

export { INCIDENT_CATEGORY_LABELS } from './models'

export {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionJobStatus,
  validateEmployeeStatusTransition,
} from './validators'

export type { JobRepository } from './repository'
