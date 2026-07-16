import { getApps, initializeApp } from 'firebase-admin/app';
import { defineSecret } from 'firebase-functions/params';
import { onCall } from 'firebase-functions/v2/https';
import { confirmCreateJobProposal as confirmCreateJobProposalHandler } from './actionProposals/confirmCreateJobProposal.js';
import { createModelCallableHandlers } from './model/modelCallables.js';
import { createGeminiModelProvider } from './model/modelProvider.js';
import { shouldReadGeminiSecret } from './model/modelRuntimeConfiguration.js';
import { getOperationsInsight as getOperationsInsightHandler } from './operations/operationsIntelligence.js';
import { getWorkforceRecommendation as getWorkforceRecommendationHandler } from './workforce/workforceRecommendation.js';
if (getApps().length === 0) {
    initializeApp();
}
export const confirmCreateJobProposal = onCall({
    region: 'asia-south1',
}, confirmCreateJobProposalHandler);
export const getWorkforceRecommendation = onCall({
    region: 'asia-south1',
    timeoutSeconds: 10,
}, getWorkforceRecommendationHandler);
export const getOperationsInsight = onCall({
    region: 'asia-south1',
    timeoutSeconds: 10,
}, getOperationsInsightHandler);
const geminiApiKey = defineSecret('GEMINI_API_KEY');
function modelHandlers() {
    return createModelCallableHandlers(createGeminiModelProvider(readGeminiApiKey()));
}
function readGeminiApiKey() {
    if (!shouldReadGeminiSecret(process.env)) {
        return undefined;
    }
    return geminiApiKey.value();
}
export const classifyCoordinatorIntent = onCall({
    region: 'asia-south1',
    secrets: [geminiApiKey],
    timeoutSeconds: 12,
}, (request) => modelHandlers().classifyCoordinatorIntent(request));
export const draftJobFromRequest = onCall({
    region: 'asia-south1',
    secrets: [geminiApiKey],
    timeoutSeconds: 12,
}, (request) => modelHandlers().draftJobFromRequest(request));
//# sourceMappingURL=index.js.map