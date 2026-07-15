import assert from 'node:assert/strict'
import test from 'node:test'
import { messageForActionProposalCallableError } from '../src/services/actionProposals/actionProposalMessages.ts'

test('maps callable proposal states to safe client messages', () => {
  assert.equal(
    messageForActionProposalCallableError({ code: 'functions/deadline-exceeded' }),
    'This proposal has expired. Prepare a new job proposal to continue.',
  )
  assert.equal(
    messageForActionProposalCallableError({ code: 'functions/aborted' }),
    'This proposal is already being processed. Check its latest status before trying again.',
  )
  assert.equal(
    messageForActionProposalCallableError({ code: 'functions/failed-precondition' }),
    'This proposal cannot be confirmed and may require reconciliation. Check its latest status.',
  )
  assert.equal(
    messageForActionProposalCallableError({ code: 'functions/permission-denied' }),
    'You do not have permission to confirm this proposal.',
  )
})
