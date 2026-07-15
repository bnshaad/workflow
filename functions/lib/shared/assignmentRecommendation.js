export const ASSIGNMENT_ALGORITHM_VERSION = 'rule-based-v1';
export const ASSIGNMENT_TOP_CANDIDATE_LIMIT = 5;
export function rankAssignmentCandidates(job, employees, historicalJobs) {
    return employees
        .filter(isEligibleRecommendationEmployee)
        .map((employee) => scoreEmployee(job, employee, historicalJobs))
        .sort((firstCandidate, secondCandidate) => {
        return (secondCandidate.totalScore - firstCandidate.totalScore ||
            firstCandidate.employeeName.localeCompare(secondCandidate.employeeName));
    })
        .slice(0, ASSIGNMENT_TOP_CANDIDATE_LIMIT)
        .map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
    }));
}
export function isEligibleRecommendationEmployee(employee) {
    const availability = employee.availability.toLowerCase();
    return (employee.role === 'employee' &&
        !employee.isUnavailable &&
        availability !== 'leave');
}
function scoreEmployee(job, employee, historicalJobs) {
    const skillScore = scoreSkillMatch(job.requiredSkills, employee.skills);
    const availabilityScore = scoreAvailability(employee);
    const workloadScore = scoreWorkload(getActiveWorkload(employee.id, historicalJobs));
    const locationScore = scoreLocationRelevance(job.location);
    const performanceScore = scoreHistoricalPerformance(getHistoricalPerformance(employee.id, historicalJobs));
    const scoreBreakdown = {
        availability: availabilityScore.score,
        locationRelevance: locationScore.score,
        performance: performanceScore.score,
        skillMatch: skillScore.score,
        workload: workloadScore.score,
    };
    const totalScore = scoreBreakdown.skillMatch +
        scoreBreakdown.availability +
        scoreBreakdown.workload +
        scoreBreakdown.locationRelevance +
        scoreBreakdown.performance;
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
    };
}
function scoreSkillMatch(requiredSkills, employeeSkills) {
    const normalizedRequiredSkills = normalizeList(requiredSkills);
    const normalizedEmployeeSkills = normalizeList(employeeSkills);
    if (normalizedRequiredSkills.length === 0) {
        return {
            score: 0,
            reasons: ['Insufficient data: job has no required skills.'],
        };
    }
    if (normalizedEmployeeSkills.length === 0) {
        return {
            score: 0,
            reasons: ['No employee skills are available for matching.'],
        };
    }
    const matchedSkills = normalizedRequiredSkills.filter((requiredSkill) => normalizedEmployeeSkills.includes(requiredSkill));
    const score = Math.round((matchedSkills.length / normalizedRequiredSkills.length) * 35);
    return {
        score,
        reasons: matchedSkills.length > 0
            ? [
                `Matched ${matchedSkills.length} of ${normalizedRequiredSkills.length} required skill(s).`,
            ]
            : ['No required skills matched.'],
    };
}
function scoreAvailability(employee) {
    if (!employee.availabilityKnown) {
        return {
            score: 0,
            reasons: ['Insufficient availability data for scoring.'],
        };
    }
    const normalizedAvailability = employee.availability.toLowerCase();
    if (normalizedAvailability === 'available') {
        return {
            score: 25,
            reasons: ['Employee is marked available.'],
        };
    }
    if (normalizedAvailability === 'busy') {
        return {
            score: 12,
            reasons: ['Employee is marked busy, so availability is reduced.'],
        };
    }
    return {
        score: 0,
        reasons: ['Insufficient availability data for scoring.'],
    };
}
function scoreWorkload(activeTaskCount) {
    if (!Number.isFinite(activeTaskCount)) {
        return {
            score: 0,
            reasons: ['Insufficient workload data for scoring.'],
        };
    }
    if (activeTaskCount <= 0) {
        return {
            score: 20,
            reasons: ['Employee has no active assigned jobs.'],
        };
    }
    if (activeTaskCount === 1) {
        return {
            score: 16,
            reasons: ['Employee has a light active workload.'],
        };
    }
    if (activeTaskCount === 2) {
        return {
            score: 12,
            reasons: ['Employee has a moderate active workload.'],
        };
    }
    if (activeTaskCount === 3) {
        return {
            score: 8,
            reasons: ['Employee has a high active workload.'],
        };
    }
    return {
        score: activeTaskCount === 4 ? 4 : 0,
        reasons: ['Employee has a very high active workload.'],
    };
}
function scoreLocationRelevance(jobLocation) {
    if (jobLocation.trim().length === 0) {
        return {
            score: 0,
            reasons: ['Insufficient data: job has no location note.'],
        };
    }
    return {
        score: 0,
        reasons: [
            'Insufficient data: employee service area or location history is not available.',
        ],
    };
}
function scoreHistoricalPerformance(performance) {
    if (performance.consideredJobs === 0) {
        return {
            score: 0,
            reasons: [
                'Insufficient historical completion data for performance scoring.',
            ],
        };
    }
    const score = Math.round((performance.completedJobs / performance.consideredJobs) * 10);
    return {
        score,
        reasons: [
            `Completed ${performance.completedJobs} of ${performance.consideredJobs} historical assigned job(s).`,
        ],
    };
}
function getHistoricalPerformance(employeeId, historicalJobs) {
    const consideredJobs = historicalJobs.filter((job) => {
        return (job.assignedEmployeeIds.includes(employeeId) &&
            (job.status === 'completed' || job.status === 'cancelled'));
    });
    const completedJobs = consideredJobs.filter((job) => {
        return job.status === 'completed' && job.completedAt !== null;
    });
    return {
        completedJobs: completedJobs.length,
        consideredJobs: consideredJobs.length,
    };
}
function getActiveWorkload(employeeId, historicalJobs) {
    return historicalJobs.filter((job) => {
        return (job.assignedEmployeeIds.includes(employeeId) &&
            (job.status === 'assigned' || job.status === 'in_progress'));
    }).length;
}
function normalizeList(values) {
    return Array.from(new Set(values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)));
}
//# sourceMappingURL=assignmentRecommendation.js.map