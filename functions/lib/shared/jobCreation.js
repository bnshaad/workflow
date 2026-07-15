export const JOB_PRIORITY_VALUES = ['Low', 'Medium', 'High', 'Urgent'];
export const JOB_TITLE_MAX_LENGTH = 120;
export const JOB_DESCRIPTION_MAX_LENGTH = 2000;
export const JOB_CUSTOMER_NAME_MAX_LENGTH = 120;
export const JOB_PHONE_MAX_LENGTH = 40;
export const JOB_ADDRESS_MAX_LENGTH = 240;
export function isJobPriority(value) {
    return typeof value === 'string' && JOB_PRIORITY_VALUES.includes(value);
}
export function validateJobCreation(input) {
    const errors = [];
    validateRequiredText(input.organizationId, 'Organization is required.', errors);
    validateRequiredText(input.title, 'Job title is required.', errors);
    validateRequiredText(input.description, 'Job description is required.', errors);
    validateRequiredText(input.customerName, 'Customer name is required.', errors);
    validateRequiredText(input.customerPhone, 'Customer phone is required.', errors);
    validateRequiredText(input.serviceAddress, 'Service address is required.', errors);
    validateRequiredText(input.createdBy, 'Created by is required.', errors);
    validateMaxLength(input.title, JOB_TITLE_MAX_LENGTH, 'Job title', errors);
    validateMaxLength(input.description, JOB_DESCRIPTION_MAX_LENGTH, 'Job description', errors);
    validateMaxLength(input.customerName, JOB_CUSTOMER_NAME_MAX_LENGTH, 'Customer name', errors);
    validateMaxLength(input.customerPhone, JOB_PHONE_MAX_LENGTH, 'Customer phone', errors);
    validateMaxLength(input.serviceAddress, JOB_ADDRESS_MAX_LENGTH, 'Service address', errors);
    if (!isJobPriority(input.priority)) {
        errors.push('Job priority is invalid.');
    }
    if (!Array.isArray(input.requiredSkills)) {
        errors.push('Required skills must be provided.');
    }
    if (input.attachments && !Array.isArray(input.attachments)) {
        errors.push('Attachments must be a list.');
    }
    if (input.dueDate instanceof Date && Number.isNaN(input.dueDate.getTime())) {
        errors.push('Due date is invalid.');
    }
    return {
        errors,
        isValid: errors.length === 0,
    };
}
export function buildNewJobDocument(input) {
    const { payload } = input;
    return {
        aiRecommendation: null,
        assignedAt: null,
        assignedBy: null,
        assignedEmployeeIds: [],
        attachments: [],
        completedAt: null,
        completedBy: null,
        createdAt: input.createdAt,
        createdBy: input.createdBy,
        customerName: payload.customerName.trim(),
        customerPhone: payload.customerPhone.trim(),
        description: payload.description.trim(),
        dueDate: input.dueDate ? input.toTimestamp(input.dueDate) : null,
        id: input.id,
        isActive: true,
        issueCount: 0,
        location: payload.location.trim(),
        manualOverride: false,
        organizationId: input.organizationId,
        overrideReason: null,
        priority: payload.priority,
        requiredSkills: [...payload.requiredSkills],
        serviceAddress: payload.serviceAddress.trim(),
        startedAt: null,
        startedBy: null,
        status: 'draft',
        statusUpdatedAt: null,
        statusUpdatedBy: null,
        title: payload.title.trim(),
        updatedAt: input.createdAt,
        workProofCount: 0,
    };
}
function validateRequiredText(value, message, errors) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push(message);
    }
}
function validateMaxLength(value, maxLength, label, errors) {
    if (typeof value === 'string' && value.length > maxLength) {
        errors.push(`${label} must be ${maxLength} characters or fewer.`);
    }
}
//# sourceMappingURL=jobCreation.js.map