export const MODEL_COORDINATOR_INTENTS = [
    'show_urgent_unassigned_jobs',
    'show_open_jobs_summary',
    'show_overloaded_employees',
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