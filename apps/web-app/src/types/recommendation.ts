import type { TenantDocument } from './common'

export type AssignmentAlgorithmVersion = 'rule-based-v1'
export type AssignmentRecommendationMode = 'ai_recommendation'
export type AssignmentRecommendationStatus = 'generated'

export type AssignmentScoreBreakdown = {
  availability: number
  locationRelevance: number
  performance: number
  skillMatch: number
  workload: number
}

export type AssignmentRecommendationCandidate = {
  employeeId: string
  employeeName: string
  explanationReasons: string[]
  rank: number
  scoreBreakdown: AssignmentScoreBreakdown
  totalScore: number
}

export interface AssignmentRecommendation extends TenantDocument {
  algorithmVersion: AssignmentAlgorithmVersion
  assignmentMode: AssignmentRecommendationMode
  candidates: AssignmentRecommendationCandidate[]
  generatedAt: TenantDocument['createdAt']
  generatedBy: string
  jobId: string
  status: AssignmentRecommendationStatus
}
