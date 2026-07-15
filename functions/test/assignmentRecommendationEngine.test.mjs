import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ASSIGNMENT_ALGORITHM_VERSION,
  rankAssignmentCandidates,
} from '../lib/shared/assignmentRecommendation.js'

const job = {
  location: 'Kakkanad',
  requiredSkills: ['AC Repair'],
}

test('rule-based-v1 preserves deterministic ranking and grounded reasons', () => {
  const candidates = rankAssignmentCandidates(
    job,
    [
      employee('employee-a', 'Asha', 'available', ['AC Repair']),
      employee('employee-b', 'Basil', 'busy', ['AC Repair']),
      employee('employee-leave', 'Leena', 'leave', ['AC Repair']),
    ],
    [
      historicalJob('completed', ['employee-b'], {}),
      historicalJob('assigned', ['employee-b'], null),
    ],
  )

  assert.equal(ASSIGNMENT_ALGORITHM_VERSION, 'rule-based-v1')
  assert.deepEqual(
    candidates.map(({ employeeId, rank, totalScore }) => ({
      employeeId,
      rank,
      totalScore,
    })),
    [
      { employeeId: 'employee-a', rank: 1, totalScore: 80 },
      { employeeId: 'employee-b', rank: 2, totalScore: 73 },
    ],
  )
  assert.match(candidates[0].explanationReasons.join(' '), /Matched 1 of 1/)
  assert.match(candidates[0].explanationReasons.join(' '), /marked available/)
  assert.match(candidates[1].explanationReasons.join(' '), /light active workload/)
  assert.equal(
    candidates.every((candidate) => candidate.scoreBreakdown.locationRelevance === 0),
    true,
  )
})

test('tie-breaking is stable and no unavailable employee is ranked', () => {
  const candidates = rankAssignmentCandidates(
    { location: '', requiredSkills: [] },
    [
      employee('employee-z', 'Zara', 'available', []),
      employee('employee-a', 'Aarav', 'available', []),
      { ...employee('manager', 'Manager', 'available', []), role: 'manager' },
    ],
    [],
  )

  assert.deepEqual(
    candidates.map((candidate) => candidate.employeeId),
    ['employee-a', 'employee-z'],
  )
  assert.equal(candidates[0].totalScore, candidates[1].totalScore)
})

function employee(id, displayName, availability, skills) {
  return {
    availability,
    availabilityKnown: true,
    displayName,
    id,
    isUnavailable: availability === 'leave',
    role: 'employee',
    skills,
  }
}

function historicalJob(status, assignedEmployeeIds, completedAt) {
  return {
    assignedEmployeeIds,
    completedAt,
    location: '',
    requiredSkills: [],
    status,
  }
}
