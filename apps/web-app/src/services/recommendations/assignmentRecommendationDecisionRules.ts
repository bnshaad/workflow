import type {
  AssignmentOverrideReason,
  AssignmentRecommendationDecision,
} from '../../types'

export const ASSIGNMENT_OVERRIDE_REASONS: AssignmentOverrideReason[] = [
  'Better local availability',
  'Customer requested this employee',
  'Special experience required',
  'Workload balancing',
  'Recommended employee unavailable',
  'Manager preference',
  'Other',
]

export type RecommendationDecisionValidationInput = {
  decision: AssignmentRecommendationDecision
  overrideNote?: string
  overrideReason?: AssignmentOverrideReason | ''
  recommendedEmployeeId: string
  selectedEmployeeId: string
}

export type RecommendationDecisionValidationResult = {
  isValid: boolean
  errors: string[]
  normalizedOverrideNote: string | null
  normalizedOverrideReason: AssignmentOverrideReason | null
}

export type RecommendationDecisionEvaluationMetrics = {
  acceptanceRate: number
  overrideReasonDistribution: Record<AssignmentOverrideReason, number>
  recommendationsAccepted: number
  recommendationsGenerated: number
  recommendationsOverridden: number
}

export function validateRecommendationDecisionInput(
  input: RecommendationDecisionValidationInput,
): RecommendationDecisionValidationResult {
  const errors: string[] = []
  const selectedEmployeeId = input.selectedEmployeeId.trim()
  const recommendedEmployeeId = input.recommendedEmployeeId.trim()
  const normalizedOverrideReason = isAssignmentOverrideReason(
    input.overrideReason,
  )
    ? input.overrideReason
    : null
  const normalizedOverrideNote =
    input.overrideReason === 'Other' && input.overrideNote
      ? input.overrideNote.trim()
      : null

  if (!selectedEmployeeId) {
    errors.push('Select an employee before confirming the assignment.')
  }

  if (!recommendedEmployeeId) {
    errors.push('Recommendation does not include a recommended employee.')
  }

  if (input.decision === 'accepted') {
    if (selectedEmployeeId !== recommendedEmployeeId) {
      errors.push('Accepting a recommendation must select the recommended employee.')
    }
  } else if (input.decision === 'overridden') {
    if (!normalizedOverrideReason) {
      errors.push('Select an override reason before confirming the assignment.')
    }

    if (selectedEmployeeId === recommendedEmployeeId) {
      errors.push('Choose another employee to override the recommendation.')
    }
  } else {
    errors.push('Recommendation decision is invalid.')
  }

  return {
    errors,
    isValid: errors.length === 0,
    normalizedOverrideNote,
    normalizedOverrideReason:
      input.decision === 'overridden' ? normalizedOverrideReason : null,
  }
}

export function buildRecommendationDecisionEvaluationMetrics(
  decisions: Array<{ decision?: AssignmentRecommendationDecision | null }>,
): RecommendationDecisionEvaluationMetrics {
  const metrics: RecommendationDecisionEvaluationMetrics = {
    acceptanceRate: 0,
    overrideReasonDistribution: ASSIGNMENT_OVERRIDE_REASONS.reduce(
      (distribution, reason) => {
        distribution[reason] = 0
        return distribution
      },
      {} as Record<AssignmentOverrideReason, number>,
    ),
    recommendationsAccepted: 0,
    recommendationsGenerated: decisions.length,
    recommendationsOverridden: 0,
  }

  for (const decision of decisions) {
    if (decision.decision === 'accepted') {
      metrics.recommendationsAccepted += 1
    }

    if (decision.decision === 'overridden') {
      metrics.recommendationsOverridden += 1
    }
  }

  metrics.acceptanceRate =
    metrics.recommendationsGenerated === 0
      ? 0
      : metrics.recommendationsAccepted / metrics.recommendationsGenerated

  return metrics
}

export function incrementOverrideReasonDistribution(
  distribution: Record<AssignmentOverrideReason, number>,
  reason: AssignmentOverrideReason | null | undefined,
) {
  if (!reason) {
    return distribution
  }

  return {
    ...distribution,
    [reason]: distribution[reason] + 1,
  }
}

function isAssignmentOverrideReason(
  value: unknown,
): value is AssignmentOverrideReason {
  return (
    typeof value === 'string' &&
    ASSIGNMENT_OVERRIDE_REASONS.includes(value as AssignmentOverrideReason)
  )
}
