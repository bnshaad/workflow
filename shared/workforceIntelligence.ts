import type {
  AssignmentAlgorithmVersion,
  AssignmentScoreBreakdown,
} from './assignmentRecommendation.js'

export const WORKFORCE_INTENTS = [
  'recommend_employee_for_job',
  'explain_recommendation',
  'compare_top_candidates',
] as const

export type WorkforceIntent = (typeof WORKFORCE_INTENTS)[number]

export type WorkforceRecommendationCandidate = {
  employeeId: string
  employeeName: string
  rank: number
  reasons: string[]
  score: number
  scoreBreakdown: AssignmentScoreBreakdown
  warnings: string[]
}

export type WorkforceRecommendationResult = {
  candidates: WorkforceRecommendationCandidate[]
  engineVersion: AssignmentAlgorithmVersion | string
  generatedAt: string
  jobId: string
}

export type WorkforceIntelligenceResult = WorkforceRecommendationResult & {
  intent: WorkforceIntent
  summary: string[]
}

export function isWorkforceIntent(value: unknown): value is WorkforceIntent {
  return (
    typeof value === 'string' &&
    WORKFORCE_INTENTS.includes(value as WorkforceIntent)
  )
}
