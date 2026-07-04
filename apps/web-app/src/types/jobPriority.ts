export const JobPriorities = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Urgent: 'Urgent',
} as const

export type JobPriority = (typeof JobPriorities)[keyof typeof JobPriorities]

export const JOB_PRIORITY_VALUES = Object.values(JobPriorities) as JobPriority[]
