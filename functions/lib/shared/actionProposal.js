export const PROPOSAL_SOURCES = ['manual', 'coordinator', 'whatsapp'];
export const ACTION_PROPOSAL_STATUSES = [
    'prepared',
    'confirmed',
    'processing',
    'completed',
    'failed',
    'expired',
    'cancelled',
    'reconciliation_required',
];
export function hashProposalPayload(payload) {
    const serialized = stableSerialize(payload);
    let hash = 2_166_136_261;
    for (let index = 0; index < serialized.length; index += 1) {
        hash ^= serialized.charCodeAt(index);
        hash = Math.imul(hash, 16_777_619);
    }
    return `fnv1a-${(hash >>> 0).toString(16)}`;
}
export function isActionProposalStatus(value) {
    return (typeof value === 'string' &&
        ACTION_PROPOSAL_STATUSES.includes(value));
}
function stableSerialize(value) {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const record = value;
        return `{${Object.keys(record)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
}
//# sourceMappingURL=actionProposal.js.map