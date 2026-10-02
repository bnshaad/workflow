import type { TenantDocument } from './common'

export type AssignmentAlgorithmVersion = 'rule-based-v1' | 'ahp-topsis-v1'
export type AhpProfileName = 'Standard' | 'Emergency Repair' | 'Commercial Maintenance'
export type AssignmentRecommendationMode = 'ai_recommendation'
export type AssignmentRecommendationStatus =
  | 'accepted'
  | 'generated'
  | 'overridden'
export type AssignmentRecommendationDecision = 'accepted' | 'overridden'
export type AssignmentOverrideReason =
  | 'Better local availability'
  | 'Customer requested this employee'
  | 'Special experience required'
  | 'Workload balancing'
  | 'Recommended employee unavailable'
  | 'Manager preference'
  | 'Other'

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
  closenessScore?: number
  confidenceBucket?: 'High' | 'Medium' | 'Low'
  requiresManualReview?: boolean
}

export interface AssignmentRecommendation extends TenantDocument {
  algorithmVersion: AssignmentAlgorithmVersion
  ahpProfile?: AhpProfileName | null
  assignmentMode: AssignmentRecommendationMode
  candidates: AssignmentRecommendationCandidate[]
  decidedAt?: TenantDocument['createdAt']
  decidedBy?: string
  decision?: AssignmentRecommendationDecision
  generatedAt: TenantDocument['createdAt']
  generatedBy: string
  jobId: string
  overrideNote?: string | null
  overrideReason?: AssignmentOverrideReason | null
  recommendedEmployeeId?: string | null
  recommendationCriteriaSnapshot?: AssignmentScoreBreakdown | null
  recommendationScoreSnapshot?: number | null
  selectedEmployeeId?: string | null
  status: AssignmentRecommendationStatus
}

