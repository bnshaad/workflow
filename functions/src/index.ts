import { getApps, initializeApp } from 'firebase-admin/app'
import { defineSecret } from 'firebase-functions/params'
import { onCall } from 'firebase-functions/v2/https'
import { confirmCreateJobProposal as confirmCreateJobProposalHandler } from './actionProposals/confirmCreateJobProposal.js'
import { createModelCallableHandlers } from './model/modelCallables.js'
import { createGeminiModelProvider } from './model/modelProvider.js'

if (getApps().length === 0) {
  initializeApp()
}

export const confirmCreateJobProposal = onCall(
  {
    region: 'asia-south1',
  },
  confirmCreateJobProposalHandler,
)

const geminiApiKey = defineSecret('GEMINI_API_KEY')

function modelHandlers() {
  return createModelCallableHandlers(createGeminiModelProvider(geminiApiKey.value()))
}

export const classifyCoordinatorIntent = onCall(
  {
    region: 'asia-south1',
    secrets: [geminiApiKey],
    timeoutSeconds: 12,
  },
  (request) => modelHandlers().classifyCoordinatorIntent(request),
)

export const draftJobFromRequest = onCall(
  {
    region: 'asia-south1',
    secrets: [geminiApiKey],
    timeoutSeconds: 12,
  },
  (request) => modelHandlers().draftJobFromRequest(request),
)
