import { logger } from 'firebase-functions';
import { randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { requireTrustedManager } from '../auth/requireTrustedManager.js';
import { createModelCoordinatorService, toPublicModelError, } from './modelCoordinatorService.js';
import { GEMINI_MODEL, ModelProviderError, } from './modelProvider.js';
const MAX_REQUEST_LENGTH = 2_000;
const MAX_REQUEST_BYTES = 4_096;
export function createModelCallableHandlers(provider) {
    const service = createService(provider);
    return {
        async classifyCoordinatorIntent(request) {
            const correlationId = readCorrelationId(request);
            await requireTrustedManager(request);
            const input = readClassificationInput(request.data);
            const startedAt = Date.now();
            try {
                const result = await service.classifyIntent(input);
                logger.info('model_intent_classification', {
                    confidence: result.confidence,
                    correlationId,
                    durationMs: Date.now() - startedAt,
                    intent: result.intent,
                    modelName: GEMINI_MODEL,
                    requestLength: input.message.length,
                    status: 'succeeded',
                });
                return result;
            }
            catch (error) {
                logModelFailure(correlationId, 'intent_classification', input.message.length, error, startedAt);
                throw asHttpsError(error);
            }
        },
        async draftJobFromRequest(request) {
            const correlationId = readCorrelationId(request);
            await requireTrustedManager(request);
            const customerRequest = readCustomerRequest(request.data);
            const startedAt = Date.now();
            try {
                const result = await service.draftJob(customerRequest);
                logger.info('model_job_draft', {
                    correlationId,
                    durationMs: Date.now() - startedAt,
                    modelName: GEMINI_MODEL,
                    requestLength: customerRequest.length,
                    status: 'succeeded',
                    warningCount: result.warnings.length,
                });
                return result;
            }
            catch (error) {
                logModelFailure(correlationId, 'job_draft', customerRequest.length, error, startedAt);
                throw asHttpsError(error);
            }
        },
    };
}
function createService(provider) {
    return createModelCoordinatorService(provider);
}
function readClassificationInput(value) {
    assertBoundedPayload(value);
    if (!value || typeof value !== 'object') {
        throw new HttpsError('invalid-argument', 'A request is required.');
    }
    const data = value;
    return {
        message: readBoundedString(data.message, 'message'),
        uiContext: typeof data.uiContext === 'string' && data.uiContext.length <= 32
            ? data.uiContext
            : 'unknown',
    };
}
function readCustomerRequest(value) {
    assertBoundedPayload(value);
    if (!value || typeof value !== 'object') {
        throw new HttpsError('invalid-argument', 'A customer request is required.');
    }
    return readBoundedString(value.customerRequest, 'customer request');
}
function readBoundedString(value, label) {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_REQUEST_LENGTH) {
        throw new HttpsError('invalid-argument', `A valid ${label} is required.`);
    }
    return value.trim();
}
function assertBoundedPayload(value) {
    try {
        if (JSON.stringify(value).length > MAX_REQUEST_BYTES) {
            throw new HttpsError('invalid-argument', 'The request is too large.');
        }
    }
    catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('invalid-argument', 'The request is invalid.');
    }
}
function asHttpsError(error) {
    const publicError = toPublicModelError(error);
    return new HttpsError(publicError.code, publicError.message);
}
function logModelFailure(correlationId, operation, requestLength, error, startedAt) {
    const diagnostics = error instanceof ModelProviderError ? error.diagnostics : undefined;
    logger.warn('model_request_failed', {
        correlationId,
        durationMs: Date.now() - startedAt,
        errorCategory: normalizedErrorCategory(error),
        errorCode: diagnostics?.code ?? 'unknown_failure',
        finishReason: diagnostics?.finishReason,
        httpStatus: diagnostics?.httpStatus,
        modelName: diagnostics?.modelName ?? GEMINI_MODEL,
        operation,
        requestLength,
        responseLength: diagnostics?.responseLength,
        status: 'failed',
        validationFields: diagnostics?.validationFields,
    });
}
function normalizedErrorCategory(error) {
    if (!(error instanceof ModelProviderError)) {
        return 'temporary_failure';
    }
    if (error.diagnostics.code === 'model_not_found' ||
        error.diagnostics.code === 'schema_or_request_rejected') {
        return error.diagnostics.code;
    }
    return error.kind;
}
function readCorrelationId(request) {
    const value = request.rawRequest.get('x-correlation-id');
    return typeof value === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(value)
        ? value
        : randomUUID();
}
//# sourceMappingURL=modelCallables.js.map