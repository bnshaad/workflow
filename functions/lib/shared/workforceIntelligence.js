export const WORKFORCE_INTENTS = [
    'recommend_employee_for_job',
    'explain_recommendation',
    'compare_top_candidates',
];
export function isWorkforceIntent(value) {
    return (typeof value === 'string' &&
        WORKFORCE_INTENTS.includes(value));
}
//# sourceMappingURL=workforceIntelligence.js.map