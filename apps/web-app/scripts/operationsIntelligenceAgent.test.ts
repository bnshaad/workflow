import assert from 'node:assert/strict'
import test from 'node:test'
import { OperationsIntelligenceAgent } from '../src/services/coordinator/operationsIntelligenceAgent.ts'
import type { UserProfile } from '../src/types/user.ts'
import type { OperationsToolResult } from '../../../shared/operationsIntelligence.ts'

const profile = { id: 'manager-1' } as UserProfile
const result: OperationsToolResult = {
  generatedAt: '2026-07-15T12:00:00.000Z',
  intent: 'summarize_open_operations',
  isTruncated: false,
  sourceJobLimit: 200,
  attentionItems: [],
  counts: {
    assigned: 2,
    draft: 1,
    inProgress: 3,
    open: 4,
    overdue: 1,
    urgentUnassigned: 2,
  },
}

test('calls one trusted tool and summarizes only returned counts', async () => {
  let calls = 0
  const agent = new OperationsIntelligenceAgent({
    async getInsight() {
      calls += 1
      return result
    },
  })

  const insight = await agent.handle(
    profile,
    'summarize_open_operations',
  )

  assert.equal(calls, 1)
  assert.deepEqual(insight.data, result)
  assert.deepEqual(insight.summary, [
    'Current operations: 4 open, 2 assigned, 3 in progress, 2 urgent unassigned, and 1 overdue.',
  ])
  assert.doesNotMatch(insight.summary.join(' '), /predict|risk|overload/i)
})

test('rejects a mismatched tool intent instead of rewriting the result', async () => {
  const agent = new OperationsIntelligenceAgent({
    async getInsight() {
      return result
    },
  })

  await assert.rejects(
    agent.handle(profile, 'show_overdue_jobs'),
    /mismatched intent/,
  )
})
