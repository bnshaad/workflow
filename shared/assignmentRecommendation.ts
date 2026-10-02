export const ASSIGNMENT_ALGORITHM_VERSIONS = {
  WEIGHTED: 'rule-based-v1',
  AHP_TOPSIS: 'ahp-topsis-v1',
} as const

export type AssignmentAlgorithmVersion =
  (typeof ASSIGNMENT_ALGORITHM_VERSIONS)[keyof typeof ASSIGNMENT_ALGORITHM_VERSIONS]

export const ASSIGNMENT_ALGORITHM_VERSION = ASSIGNMENT_ALGORITHM_VERSIONS.WEIGHTED
export const ASSIGNMENT_TOP_CANDIDATE_LIMIT = 5

export type AssignmentScoreBreakdown = {
  availability: number
  locationRelevance: number
  performance: number
  skillMatch: number
  workload: number
}

export type ConfidenceBucket = 'High' | 'Medium' | 'Low'

export type RankedAssignmentCandidate = {
  employeeId: string
  employeeName: string
  explanationReasons: string[]
  rank: number
  scoreBreakdown: AssignmentScoreBreakdown
  totalScore: number
  closenessScore?: number // TOPSIS relative closeness score C_i* in [0, 1]
  confidenceBucket?: ConfidenceBucket
  requiresManualReview?: boolean
}

export type RecommendationEmployee = {
  availability: string
  availabilityKnown: boolean
  displayName: string
  id: string
  isUnavailable: boolean
  role: string
  skills: string[]
  serviceZone?: string
  location?: string
}

export type RecommendationJob = {
  assignedEmployeeIds: string[]
  completedAt: unknown | null
  location: string
  serviceZone?: string
  serviceAddress?: string
  requiredSkills: string[]
  status: string
}

export type AhpProfileName = 'Standard' | 'Emergency Repair' | 'Commercial Maintenance'

export type DecisionEngineConfig = {
  strategy?: AssignmentAlgorithmVersion
  ahpProfile?: AhpProfileName
}

/**
 * STAGE 1: ELIGIBILITY ENGINE
 * Hard-constraint candidate filtering stage prior to ranking.
 */
export function isEligibleRecommendationEmployee(
  employee: RecommendationEmployee,
) {
  const availability = employee.availability.toLowerCase()

  return (
    employee.role === 'employee' &&
    !employee.isUnavailable &&
    availability !== 'leave'
  )
}

/**
 * STAGE 2: DECISION ENGINE (STRATEGY PATTERN)
 * Supports both Weighted Sum Strategy (rule-based-v1) and AHP-TOPSIS Strategy (ahp-topsis-v1).
 */
export function rankAssignmentCandidates(
  job: Pick<RecommendationJob, 'location' | 'requiredSkills' | 'serviceZone' | 'serviceAddress'>,
  employees: RecommendationEmployee[],
  historicalJobs: RecommendationJob[],
  config: DecisionEngineConfig = {},
): RankedAssignmentCandidate[] {
  const eligibleEmployees = employees.filter(isEligibleRecommendationEmployee)

  if (eligibleEmployees.length === 0) {
    return []
  }

  const strategy = config.strategy ?? ASSIGNMENT_ALGORITHM_VERSIONS.WEIGHTED

  if (strategy === ASSIGNMENT_ALGORITHM_VERSIONS.AHP_TOPSIS) {
    return rankViaAhpTopsis(job, eligibleEmployees, historicalJobs, config.ahpProfile)
  }

  return rankViaWeightedSum(job, eligibleEmployees, historicalJobs)
}

/**
 * Strategy 1: Weighted Strategy (rule-based-v1)
 * Fixed weight additive sum across criteria.
 */
function rankViaWeightedSum(
  job: Pick<RecommendationJob, 'location' | 'requiredSkills' | 'serviceZone' | 'serviceAddress'>,
  employees: RecommendationEmployee[],
  historicalJobs: RecommendationJob[],
): RankedAssignmentCandidate[] {
  return employees
    .map((employee) => scoreEmployeeWeighted(job, employee, historicalJobs))
    .sort((a, b) => b.totalScore - a.totalScore || a.employeeName.localeCompare(b.employeeName))
    .slice(0, ASSIGNMENT_TOP_CANDIDATE_LIMIT)
    .map((candidate, index) => {
      const normalizedScore = Math.min(1, Math.max(0, candidate.totalScore / 100))
      const confidence = deriveConfidenceBucket(normalizedScore)
      return {
        ...candidate,
        rank: index + 1,
        closenessScore: Math.round(normalizedScore * 100) / 100,
        confidenceBucket: confidence.bucket,
        requiresManualReview: confidence.requiresManualReview,
      }
    })
}

/**
 * Strategy 2: AHP-TOPSIS Strategy (ahp-topsis-v1)
 * Stage A: AHP (Analytic Hierarchy Process) to derive weights.
 * Stage B: TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution) vector ranking.
 */
function rankViaAhpTopsis(
  job: Pick<RecommendationJob, 'location' | 'requiredSkills' | 'serviceZone' | 'serviceAddress'>,
  employees: RecommendationEmployee[],
  historicalJobs: RecommendationJob[],
  profileName: AhpProfileName = 'Standard',
): RankedAssignmentCandidate[] {
  // AHP Criteria Weights
  const weights = getAhpCriteriaWeights(profileName)

  // Construct raw metric matrix [skill, availability, workload, location, performance] (all normalized to 0-1)
  const candidateMetrics = employees.map((employee) => {
    const rawScores = scoreEmployeeWeighted(job, employee, historicalJobs)
    return {
      candidate: rawScores,
      // Raw features normalized to 0..1 scale
      vector: [
        rawScores.scoreBreakdown.skillMatch / 30,
        rawScores.scoreBreakdown.availability / 25,
        rawScores.scoreBreakdown.workload / 20,
        rawScores.scoreBreakdown.locationRelevance / 15,
        rawScores.scoreBreakdown.performance / 10,
      ],
    }
  })

  // TOPSIS Step 1: Vector Normalization R = [r_ij]
  const numCriteria = 5
  const normFactors = Array.from({ length: numCriteria }, (_, col) => {
    const sumSquares = candidateMetrics.reduce(
      (sum, m) => sum + Math.pow(m.vector[col] ?? 0, 2),
      0,
    )
    return sumSquares > 0 ? Math.sqrt(sumSquares) : 1
  })

  // TOPSIS Step 2: Weighted Normalized Matrix V = [v_ij]
  const weightVector = [
    weights.skillMatch,
    weights.availability,
    weights.workload,
    weights.locationRelevance,
    weights.performance,
  ]

  const topsisMatrix = candidateMetrics.map((m) => {
    const weightedRow = m.vector.map((val, j) => {
      const normFactor = normFactors[j] ?? 1
      const weight = weightVector[j] ?? 0
      const r_ij = val / normFactor
      return r_ij * weight
    })
    return { candidate: m.candidate, weightedRow }
  })

  // TOPSIS Step 3: Determine Ideal Best (A+) and Ideal Worst (A-)
  const idealBest = Array.from({ length: numCriteria }, (_, col) =>
    Math.max(...topsisMatrix.map((row) => row.weightedRow[col] ?? 0)),
  )
  const idealWorst = Array.from({ length: numCriteria }, (_, col) =>
    Math.min(...topsisMatrix.map((row) => row.weightedRow[col] ?? 0)),
  )

  // TOPSIS Step 4: Euclidean distances S+ and S- and Relative Closeness C_i*
  const ranked = topsisMatrix.map(({ candidate, weightedRow }) => {
    const sPlus = Math.sqrt(
      weightedRow.reduce((sum, v, j) => sum + Math.pow(v - (idealBest[j] ?? 0), 2), 0),
    )
    const sMinus = Math.sqrt(
      weightedRow.reduce((sum, v, j) => sum + Math.pow(v - (idealWorst[j] ?? 0), 2), 0),
    )

    const closeness = sPlus + sMinus === 0 ? 0.5 : sMinus / (sPlus + sMinus)
    const closenessScore = Math.round(closeness * 100) / 100
    const confidence = deriveConfidenceBucket(closenessScore)

    return {
      ...candidate,
      closenessScore,
      confidenceBucket: confidence.bucket,
      requiresManualReview: confidence.requiresManualReview,
      totalScore: Math.round(closenessScore * 100),
    }
  })

  return ranked
    .sort((a, b) => b.closenessScore - a.closenessScore || a.employeeName.localeCompare(b.employeeName))
    .slice(0, ASSIGNMENT_TOP_CANDIDATE_LIMIT)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }))
}

/**
 * AHP Weight Derivation profiles based on pairwise comparison matrices.
 */
function getAhpCriteriaWeights(profile: AhpProfileName) {
  switch (profile) {
    case 'Emergency Repair':
      // Emergency repair heavily prioritizes availability (0.35) & location (0.25) & skill (0.25)
      return { skillMatch: 0.25, availability: 0.35, workload: 0.10, locationRelevance: 0.25, performance: 0.05 }
    case 'Commercial Maintenance':
      // Commercial maintenance heavily prioritizes skill (0.40) & performance (0.20) & location (0.15)
      return { skillMatch: 0.40, availability: 0.15, workload: 0.10, locationRelevance: 0.15, performance: 0.20 }
    case 'Standard':
    default:
      // Standard balanced profile derived via AHP pairwise comparison (Skill > Avail > Workload/Location > Perf)
      return { skillMatch: 0.35, availability: 0.25, workload: 0.15, locationRelevance: 0.15, performance: 0.10 }
  }
}

/**
 * Confidence Score Calculation & Manual Review Threshold
 */
export function deriveConfidenceBucket(normalizedScore: number): {
  bucket: ConfidenceBucket
  requiresManualReview: boolean
} {
  if (normalizedScore >= 0.80) {
    return { bucket: 'High', requiresManualReview: false }
  }
  if (normalizedScore >= 0.60) {
    return { bucket: 'Medium', requiresManualReview: false }
  }
  return { bucket: 'Low', requiresManualReview: true }
}

function scoreEmployeeWeighted(
  job: Pick<RecommendationJob, 'location' | 'requiredSkills' | 'serviceZone' | 'serviceAddress'>,
  employee: RecommendationEmployee,
  historicalJobs: RecommendationJob[],
): RankedAssignmentCandidate {
  const skillScore = scoreSkillMatch(job.requiredSkills, employee.skills)
  const availabilityScore = scoreAvailability(employee)
  const workloadScore = scoreWorkload(
    getActiveWorkload(employee.id, historicalJobs),
  )
  const locationScore = scoreLocationRelevance(
    job.serviceZone || job.serviceAddress || job.location,
    employee.serviceZone || employee.location,
  )
  const performanceScore = scoreHistoricalPerformance(
    getHistoricalPerformance(employee.id, historicalJobs),
  )
  const scoreBreakdown: AssignmentScoreBreakdown = {
    availability: availabilityScore.score,
    locationRelevance: locationScore.score,
    performance: performanceScore.score,
    skillMatch: skillScore.score,
    workload: workloadScore.score,
  }
  const totalScore =
    scoreBreakdown.skillMatch +
    scoreBreakdown.availability +
    scoreBreakdown.workload +
    scoreBreakdown.locationRelevance +
    scoreBreakdown.performance

  return {
    employeeId: employee.id,
    employeeName: employee.displayName,
    explanationReasons: [
      ...skillScore.reasons,
      ...availabilityScore.reasons,
      ...workloadScore.reasons,
      ...locationScore.reasons,
      ...performanceScore.reasons,
    ],
    rank: 0,
    scoreBreakdown,
    totalScore,
  }
}

function scoreSkillMatch(requiredSkills: string[], employeeSkills: string[]) {
  const normalizedRequiredSkills = normalizeList(requiredSkills)
  const normalizedEmployeeSkills = normalizeList(employeeSkills)

  if (normalizedRequiredSkills.length === 0) {
    return {
      score: 0,
      reasons: ['Insufficient data: job has no required skills.'],
    }
  }

  if (normalizedEmployeeSkills.length === 0) {
    return {
      score: 0,
      reasons: ['No employee skills are available for matching.'],
    }
  }

  const matchedSkills = normalizedRequiredSkills.filter((requiredSkill) =>
    normalizedEmployeeSkills.includes(requiredSkill),
  )
  const score = Math.round(
    (matchedSkills.length / normalizedRequiredSkills.length) * 30,
  )

  return {
    score,
    reasons:
      matchedSkills.length > 0
        ? [
            `Matched ${matchedSkills.length} of ${normalizedRequiredSkills.length} required skill(s).`,
          ]
        : ['No required skills matched.'],
  }
}

function scoreAvailability(employee: RecommendationEmployee) {
  if (!employee.availabilityKnown) {
    return {
      score: 0,
      reasons: ['Insufficient availability data for scoring.'],
    }
  }

  const normalizedAvailability = employee.availability.toLowerCase()

  if (normalizedAvailability === 'available') {
    return {
      score: 25,
      reasons: ['Employee is marked available.'],
    }
  }

  if (normalizedAvailability === 'busy') {
    return {
      score: 12,
      reasons: ['Employee is marked busy, so availability is reduced.'],
    }
  }

  return {
    score: 0,
    reasons: ['Insufficient availability data for scoring.'],
  }
}

function scoreWorkload(activeTaskCount: number) {
  if (!Number.isFinite(activeTaskCount)) {
    return {
      score: 0,
      reasons: ['Insufficient workload data for scoring.'],
    }
  }

  if (activeTaskCount <= 0) {
    return {
      score: 20,
      reasons: ['Employee has no active assigned jobs.'],
    }
  }

  if (activeTaskCount === 1) {
    return {
      score: 16,
      reasons: ['Employee has a light active workload.'],
    }
  }

  if (activeTaskCount === 2) {
    return {
      score: 12,
      reasons: ['Employee has a moderate active workload.'],
    }
  }

  if (activeTaskCount === 3) {
    return {
      score: 8,
      reasons: ['Employee has a high active workload.'],
    }
  }

  return {
    score: activeTaskCount === 4 ? 4 : 0,
    reasons: ['Employee has a very high active workload.'],
  }
}

export const ZONE_ADJACENCY: Record<string, string[]> = {
  Downtown: ['North Zone', 'South Zone', 'East Zone', 'West Zone'],
  'North Zone': ['Downtown', 'East Zone', 'West Zone'],
  'South Zone': ['Downtown', 'East Zone', 'West Zone'],
  'East Zone': ['Downtown', 'North Zone', 'South Zone'],
  'West Zone': ['Downtown', 'North Zone', 'South Zone'],
}

export function extractZone(text?: string | null): string | null {
  if (!text) return null
  const normalized = text.toLowerCase()
  if (normalized.includes('north')) return 'North Zone'
  if (normalized.includes('south')) return 'South Zone'
  if (normalized.includes('east')) return 'East Zone'
  if (normalized.includes('west')) return 'West Zone'
  if (
    normalized.includes('downtown') ||
    normalized.includes('central') ||
    normalized.includes('cbd')
  ) {
    return 'Downtown'
  }
  return null
}

function scoreLocationRelevance(
  jobLocationOrZone: string,
  employeeLocationOrZone?: string,
): { score: number; reasons: string[] } {
  if (!jobLocationOrZone || jobLocationOrZone.trim().length === 0) {
    return {
      score: 0,
      reasons: ['Insufficient data: job has no location note.'],
    }
  }

  const jobZone = extractZone(jobLocationOrZone)
  const employeeZone = extractZone(employeeLocationOrZone)

  // Case 1: Recognized service zones
  if (jobZone && employeeZone) {
    if (jobZone === employeeZone) {
      return {
        score: 15,
        reasons: [`Technician primary zone matches job location (${jobZone}).`],
      }
    }

    const adjacentZones = ZONE_ADJACENCY[jobZone] || []
    if (adjacentZones.includes(employeeZone)) {
      return {
        score: 8,
        reasons: [`Technician is in adjacent zone (${employeeZone} to ${jobZone}).`],
      }
    }

    return {
      score: 3,
      reasons: [`Technician is in distant zone (${employeeZone} vs ${jobZone}).`],
    }
  }

  // Case 2: Keyword / district match
  if (jobLocationOrZone.trim() && employeeLocationOrZone?.trim()) {
    const jobTokens = jobLocationOrZone
      .toLowerCase()
      .split(/[\s,.-]+/)
      .filter((t) => t.length > 2)
    const empTokens = employeeLocationOrZone
      .toLowerCase()
      .split(/[\s,.-]+/)
      .filter((t) => t.length > 2)
    const matches = jobTokens.filter((t) => empTokens.includes(t))

    if (matches.length > 0) {
      return {
        score: 12,
        reasons: [
          `Technician service area matches job address keywords (${matches.join(', ')}).`,
        ],
      }
    }

    return {
      score: 4,
      reasons: ['Technician is registered in a different service area.'],
    }
  }

  return {
    score: 0,
    reasons: [
      'Insufficient data: employee service area or location history is not available.',
    ],
  }
}

function scoreHistoricalPerformance(performance: HistoricalPerformance) {
  if (performance.consideredJobs === 0) {
    return {
      score: 0,
      reasons: [
        'Insufficient historical completion data for performance scoring.',
      ],
    }
  }

  const score = Math.round(
    (performance.completedJobs / performance.consideredJobs) * 10,
  )

  return {
    score,
    reasons: [
      `Completed ${performance.completedJobs} of ${performance.consideredJobs} historical assigned job(s).`,
    ],
  }
}

type HistoricalPerformance = {
  completedJobs: number
  consideredJobs: number
}

function getHistoricalPerformance(
  employeeId: string,
  historicalJobs: RecommendationJob[],
): HistoricalPerformance {
  const consideredJobs = historicalJobs.filter((job) => {
    return (
      job.assignedEmployeeIds.includes(employeeId) &&
      (job.status === 'completed' || job.status === 'cancelled')
    )
  })
  const completedJobs = consideredJobs.filter((job) => {
    return job.status === 'completed' && job.completedAt !== null
  })

  return {
    completedJobs: completedJobs.length,
    consideredJobs: consideredJobs.length,
  }
}

function getActiveWorkload(
  employeeId: string,
  historicalJobs: RecommendationJob[],
) {
  return historicalJobs.filter((job) => {
    return (
      job.assignedEmployeeIds.includes(employeeId) &&
      (job.status === 'assigned' || job.status === 'in_progress')
    )
  }).length
}

function normalizeList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}
