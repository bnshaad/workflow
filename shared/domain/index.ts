export type {
  Job,
  JobActivity,
  JobActivityType,
  JobAttachment,
  JobPriority,
  JobStatus,
  UserProfile,
} from './models/job.js'

export type {
  Incident,
  IncidentCategory,
  IncidentStatus,
} from './models/incident.js'

export { INCIDENT_CATEGORY_LABELS } from './models/incident.js'

export {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionJobStatus,
  validateEmployeeStatusTransition,
} from './validators/statusValidator.js'

export type { JobRepository } from './repositories/JobRepository.js'

