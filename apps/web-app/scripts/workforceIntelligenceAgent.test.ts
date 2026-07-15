import assert from 'node:assert/strict'
import test from 'node:test'
import { WorkforceIntelligenceAgent } from '../src/services/coordinator/workforceIntelligenceAgent.ts'
import type { UserProfile } from '../src/types/user.ts'
import type { WorkforceRecommendationResult } from '../../../shared/workforceIntelligence.ts'

const profile = {
  id: 'manager-1',
} as UserProfile

const recommendation: WorkforceRecommendationResult = {
  candidates: [
    {
      employeeId: 'employee-1',
      employeeName: 'Rahul',
      rank: 1,
      reasons: [
        'Matched 1 of 1 required skill(s).',
        'Employee has no active assigned jobs.',
      ],
      score: 80,
      scoreBreakdown: {
        availability: 25,
        locationRelevance: 0,
        performance: 0,
        skillMatch: 35,
        workload: 20,
      },
      warnings: [
        'Insufficient data: employee service area or location history is not available.',
      ],
    },
    {
      employeeId: 'employee-2',
      employeeName: 'Arjun',
      rank: 2,
      reasons: ['Employee has a moderate active workload.'],
      score: 72,
      scoreBreakdown: {
        availability: 25,
        locationRelevance: 0,
        performance: 0,
        skillMatch: 35,
        workload: 12,
      },
      warnings: [],
    },
  ],
  engineVersion: 'rule-based-v1',
  generatedAt: '2026-07-15T00:00:00.000Z',
  jobId: 'job-1',
}

test('explains the top candidate using returned engine facts only', async () => {
  let calls = 0
  const agent = new WorkforceIntelligenceAgent({
    async getRecommendation() {
      calls += 1
      return recommendation
    },
  })

  const result = await agent.handle(
    profile,
    'explain_recommendation',
    'job-1',
  )

  assert.equal(calls, 1)
  assert.deepEqual(result.candidates, recommendation.candidates)
  assert.deepEqual(result.summary, [
    'Rahul is ranked #1 with score 80.',
    ...recommendation.candidates[0].reasons,
  ])
  assert.doesNotMatch(result.summary.join(' '), /distance|gps|predict/i)
})

test('compares only the returned top candidates without changing scores', async () => {
  const agent = new WorkforceIntelligenceAgent({
    async getRecommendation() {
      return recommendation
    },
  })

  const result = await agent.handle(
    profile,
    'compare_top_candidates',
    'job-1',
  )

  assert.equal(result.summary.length, 2)
  assert.match(result.summary[0], /Rahul.*score 80.*Matched 1 of 1/)
  assert.match(result.summary[1], /Arjun.*score 72.*moderate active workload/)
  assert.deepEqual(
    result.candidates.map((candidate) => candidate.score),
    [80, 72],
  )
})

test('reports no eligible candidates without inventing missing criteria', async () => {
  const agent = new WorkforceIntelligenceAgent({
    async getRecommendation() {
      return { ...recommendation, candidates: [] }
    },
  })

  const result = await agent.handle(
    profile,
    'recommend_employee_for_job',
    'job-1',
  )

  assert.deepEqual(result.summary, [
    'No eligible employees were found by the deterministic engine.',
  ])
})
