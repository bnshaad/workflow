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
} from './models'

export {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionJobStatus,
  validateEmployeeStatusTransition,
} from './validators'

export type { JobRepository } from './repository'
