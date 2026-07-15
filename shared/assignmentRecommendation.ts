export const ASSIGNMENT_ALGORITHM_VERSION = 'rule-based-v1' as const
export const ASSIGNMENT_TOP_CANDIDATE_LIMIT = 5

export type AssignmentScoreBreakdown = {
  availability: number
  locationRelevance: number
  performance: number
  skillMatch: number
  workload: number
}

export type RankedAssignmentCandidate = {
  employeeId: string
  employeeName: string
  explanationReasons: string[]
  rank: number
  scoreBreakdown: AssignmentScoreBreakdown
  totalScore: number
}

export type RecommendationEmployee = {
  availability: string
  availabilityKnown: boolean
  displayName: string
  id: string
  isUnavailable: boolean
  role: string
  skills: string[]
}

export type RecommendationJob = {
  assignedEmployeeIds: string[]
  completedAt: unknown | null
  location: string
  requiredSkills: string[]
  status: string
}

type HistoricalPerformance = {
  completedJobs: number
  consideredJobs: number
}

export function rankAssignmentCandidates(
  job: Pick<RecommendationJob, 'location' | 'requiredSkills'>,
  employees: RecommendationEmployee[],
  historicalJobs: RecommendationJob[],
): RankedAssignmentCandidate[] {
  return employees
    .filter(isEligibleRecommendationEmployee)
    .map((employee) => scoreEmployee(job, employee, historicalJobs))
    .sort((firstCandidate, secondCandidate) => {
      return (
        secondCandidate.totalScore - firstCandidate.totalScore ||
        firstCandidate.employeeName.localeCompare(secondCandidate.employeeName)
      )
    })
    .slice(0, ASSIGNMENT_TOP_CANDIDATE_LIMIT)
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }))
}

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

function scoreEmployee(
  job: Pick<RecommendationJob, 'location' | 'requiredSkills'>,
  employee: RecommendationEmployee,
  historicalJobs: RecommendationJob[],
): RankedAssignmentCandidate {
  const skillScore = scoreSkillMatch(job.requiredSkills, employee.skills)
  const availabilityScore = scoreAvailability(employee)
  const workloadScore = scoreWorkload(
    getActiveWorkload(employee.id, historicalJobs),
  )
  const locationScore = scoreLocationRelevance(job.location)
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
    (matchedSkills.length / normalizedRequiredSkills.length) * 35,
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

function scoreLocationRelevance(jobLocation: string) {
  if (jobLocation.trim().length === 0) {
    return {
      score: 0,
      reasons: ['Insufficient data: job has no location note.'],
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
