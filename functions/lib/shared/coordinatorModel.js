import { OPERATIONS_INTENTS } from './operationsIntelligence.js';
export const MODEL_COORDINATOR_INTENTS = [
    ...OPERATIONS_INTENTS,
    'recommend_employee_for_job',
    'explain_recommendation',
    'compare_top_candidates',
    'prepare_job_draft',
    'unsupported',
];
export function isModelCoordinatorIntent(value) {
    return (typeof value === 'string' &&
        MODEL_COORDINATOR_INTENTS.includes(value));
}
//# sourceMappingURL=coordinatorModel.js.map