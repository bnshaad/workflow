export type RecommendationExplanationSummary = {
  confidenceBadgeText: string
  confidenceBucket: 'High' | 'Medium' | 'Low'
  confidenceTone: 'success' | 'warning' | 'danger'
  displayScoreText: string
  highlights: string[]
  matchPercentage: number
  requiresManualReview: boolean
}

export function formatExplanationReason(rawReason: string): string {
  const r = rawReason.trim()

  if (r.startsWith('Matched ') && r.includes('required skill')) {
    return r.replace('required skill(s).', 'required skills matched')
  }
  if (r === 'No required skills matched.') {
    return 'Missing required skills'
  }

  if (r === 'Employee is marked available.') {
    return 'Fully available for immediate assignment'
  }
  if (r.includes('marked busy')) {
    return 'Currently busy (reduced availability)'
  }

  if (r === 'Employee has no active assigned jobs.') {
    return 'Clear schedule (0 active jobs)'
  }
  if (r === 'Employee has a light active workload.') {
    return 'Light workload (1 active job)'
  }
  if (r === 'Employee has a moderate active workload.') {
    return 'Moderate workload (2 active jobs)'
  }
  if (r === 'Employee has a high active workload.') {
    return 'Heavy workload (3 active jobs)'
  }
  if (r === 'Employee has a very high active workload.') {
    return 'High workload (4+ active jobs)'
  }

  if (r.startsWith('Completed ') && r.includes('historical assigned job')) {
    return r.replace('historical assigned job(s).', 'past jobs completed on time')
  }

  return r
}

export function filterHumanExplanationReasons(reasons: string[]): string[] {
  const informative = reasons
    .filter((reason) => !reason.toLowerCase().startsWith('insufficient data'))
    .map(formatExplanationReason)

  if (informative.length > 0) {
    return informative
  }

  return reasons.map(formatExplanationReason)
}

export function summarizeCandidateExplanation(candidate: {
  closenessScore?: number
  confidenceBucket?: 'High' | 'Medium' | 'Low'
  explanationReasons: string[]
  requiresManualReview?: boolean
  totalScore: number
}): RecommendationExplanationSummary {
  const rawScore = candidate.closenessScore ?? candidate.totalScore
  const matchPercentage = Math.round(rawScore <= 1 ? rawScore * 100 : rawScore)
  const displayScoreText = `${matchPercentage}% Match`

  let confidenceBucket: 'High' | 'Medium' | 'Low' = candidate.confidenceBucket ?? 'Medium'
  if (!candidate.confidenceBucket) {
    if (matchPercentage >= 75) confidenceBucket = 'High'
    else if (matchPercentage >= 55) confidenceBucket = 'Medium'
    else confidenceBucket = 'Low'
  }

  const requiresManualReview = Boolean(candidate.requiresManualReview || confidenceBucket === 'Low')

  const confidenceBadgeText =
    confidenceBucket === 'High'
      ? 'High Confidence'
      : confidenceBucket === 'Medium'
        ? 'Medium Confidence'
        : 'Manual Review Recommended'

  const confidenceTone: 'success' | 'warning' | 'danger' =
    confidenceBucket === 'High'
      ? 'success'
      : confidenceBucket === 'Medium'
        ? 'warning'
        : 'danger'

  const highlights = filterHumanExplanationReasons(candidate.explanationReasons)

  return {
    confidenceBadgeText,
    confidenceBucket,
    confidenceTone,
    displayScoreText,
    highlights,
    matchPercentage,
    requiresManualReview,
  }
}
