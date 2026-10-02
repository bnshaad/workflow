import { getFirestore, Timestamp, } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { hashProposalPayload, } from '../../../shared/actionProposal.js';
import { buildNewJobDocument, validateJobCreation, } from '../../../shared/jobCreation.js';
import { evaluateProposalConfirmation, failureStatusForExecution, } from './proposalState.js';
import { requireTrustedManager } from '../auth/requireTrustedManager.js';
const ACTION_PROPOSALS_COLLECTION = 'actionProposals';
const AUDIT_LOGS_COLLECTION = 'auditLogs';
const JOBS_COLLECTION = 'jobs';
const PROCESSING_STALE_MS = 5 * 60_000;
class DefinitePreWriteError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DefinitePreWriteError';
    }
}
export async function confirmCreateJobProposal(request) {
    const proposalId = readProposalId(request.data);
    const assignToEmployeeId = readOptionalString(request.data && typeof request.data === 'object'
        ? request.data.assignToEmployeeId
        : undefined);
    const caller = await requireTrustedManager(request);
    const firestore = getFirestore();
    const claim = await claimProposal(firestore, proposalId, caller);
    if (claim.kind === 'completed') {
        return claim.result;
    }
    if (claim.kind === 'processing') {
        return resolveProcessingProposal(firestore, claim.proposal);
    }
    if (claim.kind === 'rejected') {
        throw new HttpsError(claim.code, claim.message);
    }
    try {
        const { jobId, assignedEmployee } = await createJobIfAbsent(firestore, caller, claim.proposal, assignToEmployeeId);
        return await completeProposal(firestore, claim.proposal.proposalId, jobId, assignedEmployee);
    }
    catch (error) {
        if (error instanceof DefinitePreWriteError) {
            await markProposalFailed(firestore, claim.proposal.proposalId, error.message);
            throw new HttpsError('failed-precondition', error.message);
        }
        const reconciled = await findCompletedJob(firestore, claim.proposal.proposalId, claim.proposal.executionJobId);
        if (reconciled) {
            return reconciled;
        }
        await markReconciliationRequired(firestore, claim.proposal.proposalId);
        throw new HttpsError('internal', 'The job result could not be confirmed safely. The proposal requires reconciliation.');
    }
}
async function claimProposal(firestore, proposalId, caller) {
    const proposalReference = firestore
        .collection(ACTION_PROPOSALS_COLLECTION)
        .doc(proposalId);
    return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(proposalReference);
        if (!snapshot.exists) {
            throw new HttpsError('not-found', 'The proposal was not found.');
        }
        const proposal = snapshot.data();
        if (!proposal) {
            throw new HttpsError('not-found', 'The proposal was not found.');
        }
        const now = Timestamp.now();
        const decision = evaluateProposalConfirmation({
            actionType: proposal.actionType,
            callerOrganizationId: caller.organizationId,
            callerUserId: caller.id,
            expiresAtMillis: readTimestampOrNull(proposal.expiresAt)?.toMillis() ?? null,
            organizationId: proposal.organizationId,
            payloadHashMatches: hashProposalPayload(proposal.payload) === proposal.payloadHash,
            requestedBy: proposal.requestedBy,
            resultJobId: proposal.resultJobId,
            source: proposal.source,
            status: proposal.status,
        });
        if (decision.kind === 'completed') {
            return {
                kind: 'completed',
                result: {
                    jobId: decision.jobId,
                    proposalId,
                    status: 'completed',
                },
            };
        }
        if (decision.kind === 'processing') {
            return {
                kind: 'processing',
                proposal: {
                    executionJobId: readString(proposal.executionJobId, proposalId),
                    processingStartedAt: readTimestampOrNull(proposal.processingStartedAt),
                    proposalId,
                },
            };
        }
        if (decision.kind === 'rejected') {
            if (decision.failureCode) {
                transaction.update(proposalReference, {
                    failureCode: decision.failureCode,
                    failureSummary: decision.message,
                    status: decision.failureCode === 'expired' ? 'expired' : 'failed',
                    updatedAt: now,
                    version: readNumber(proposal.version, 1) + 1,
                });
            }
            return {
                kind: 'rejected',
                code: decision.code,
                message: decision.message,
            };
        }
        let payload;
        try {
            payload = validateStoredPayload(proposal, caller);
        }
        catch (error) {
            transaction.update(proposalReference, {
                failureCode: 'payload_invalid',
                failureSummary: error instanceof Error ? error.message : 'The proposal payload is invalid.',
                status: 'failed',
                updatedAt: now,
                version: readNumber(proposal.version, 1) + 1,
            });
            return {
                kind: 'rejected',
                code: 'failed-precondition',
                message: 'The proposal payload is invalid.',
            };
        }
        const executionJobId = proposalId;
        transaction.update(proposalReference, {
            confirmedAt: now,
            executionJobId,
            processingStartedAt: now,
            status: 'processing',
            updatedAt: now,
            version: readNumber(proposal.version, 1) + 1,
        });
        return {
            kind: 'claimed',
            proposal: {
                executionJobId,
                payload,
                proposalId,
            },
        };
    });
}
async function resolveProcessingProposal(firestore, proposal) {
    const completed = await findCompletedJob(firestore, proposal.proposalId, proposal.executionJobId);
    if (completed) {
        return completed;
    }
    const processingAge = proposal.processingStartedAt
        ? Timestamp.now().toMillis() - proposal.processingStartedAt.toMillis()
        : PROCESSING_STALE_MS;
    if (processingAge >= PROCESSING_STALE_MS) {
        await markReconciliationRequired(firestore, proposal.proposalId);
        throw new HttpsError('failed-precondition', 'The proposal requires reconciliation before another confirmation.');
    }
    throw new HttpsError('aborted', 'The proposal is already processing.');
}
async function createJobIfAbsent(firestore, caller, proposal, assignToEmployeeId) {
    const validation = validateJobCreation({
        ...proposal.payload,
        attachments: [],
        createdBy: caller.id,
        dueDate: proposal.payload.dueDate
            ? new Date(proposal.payload.dueDate)
            : null,
        organizationId: caller.organizationId,
    });
    if (!validation.isValid) {
        throw new DefinitePreWriteError(validation.errors.join(' '));
    }
    let assignedEmployee = null;
    if (assignToEmployeeId) {
        const userSnapshot = await firestore.collection('users').doc(assignToEmployeeId).get();
        if (!userSnapshot.exists) {
            throw new DefinitePreWriteError('The selected technician was not found.');
        }
        const userData = userSnapshot.data();
        if (userData?.organizationId !== caller.organizationId) {
            throw new DefinitePreWriteError('The selected technician does not belong to your organization.');
        }
        assignedEmployee = {
            id: userSnapshot.id,
            displayName: typeof userData?.displayName === 'string' ? userData.displayName : 'Technician',
        };
    }
    const jobReference = firestore.collection(JOBS_COLLECTION).doc(proposal.executionJobId);
    await firestore.runTransaction(async (transaction) => {
        const existingJob = await transaction.get(jobReference);
        if (existingJob.exists) {
            return;
        }
        const timestamp = Timestamp.now();
        const auditReference = firestore.collection(AUDIT_LOGS_COLLECTION).doc();
        const baseJob = buildNewJobDocument({
            createdAt: timestamp,
            createdBy: caller.id,
            dueDate: proposal.payload.dueDate
                ? new Date(proposal.payload.dueDate)
                : null,
            id: jobReference.id,
            organizationId: caller.organizationId,
            payload: proposal.payload,
            toTimestamp: (date) => Timestamp.fromDate(date),
        });
        const finalJob = assignedEmployee
            ? {
                ...baseJob,
                assignedAt: timestamp,
                assignedBy: caller.id,
                assignedEmployeeIds: [assignedEmployee.id],
                status: 'assigned',
                statusUpdatedAt: timestamp,
                statusUpdatedBy: caller.id,
            }
            : {
                ...baseJob,
                status: 'open',
                statusUpdatedAt: timestamp,
                statusUpdatedBy: caller.id,
            };
        transaction.set(jobReference, finalJob);
        transaction.set(auditReference, {
            id: auditReference.id,
            organizationId: caller.organizationId,
            isActive: true,
            createdAt: timestamp,
            updatedAt: timestamp,
            actorId: caller.id,
            action: 'job_created',
            entityId: jobReference.id,
            entityType: 'job',
            metadata: {
                actionProposalId: proposal.proposalId,
                assignmentMode: assignedEmployee ? 'action_proposal_with_assign' : 'action_proposal',
                jobId: jobReference.id,
            },
        });
        if (assignedEmployee) {
            const activityReference = firestore.collection('jobActivities').doc();
            transaction.set(activityReference, {
                id: activityReference.id,
                organizationId: caller.organizationId,
                isActive: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                jobId: jobReference.id,
                type: 'employees_assigned',
                fromStatus: 'open',
                toStatus: 'assigned',
                employeeIds: [assignedEmployee.id],
                employeeNames: [assignedEmployee.displayName],
                createdBy: caller.id,
                description: `Assigned ${assignedEmployee.displayName} from proposal confirmation.`,
            });
            const assignAuditReference = firestore.collection(AUDIT_LOGS_COLLECTION).doc();
            transaction.set(assignAuditReference, {
                id: assignAuditReference.id,
                organizationId: caller.organizationId,
                isActive: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                actorId: caller.id,
                action: 'job_employees_assigned',
                entityId: jobReference.id,
                entityType: 'job',
                metadata: {
                    assignmentMode: 'action_proposal_confirm_and_assign',
                    employeeIds: [assignedEmployee.id],
                    employeeNames: [assignedEmployee.displayName],
                    jobId: jobReference.id,
                    toStatus: 'assigned',
                },
            });
            const recommendationReference = firestore.collection('recommendations').doc();
            transaction.set(recommendationReference, {
                id: recommendationReference.id,
                organizationId: caller.organizationId,
                isActive: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                jobId: jobReference.id,
                jobTitle: proposal.payload.title,
                action: 'accept',
                algorithmVersion: 'rule-based-v1',
                strategy: 'ahp-topsis',
                selectedEmployeeId: assignedEmployee.id,
                selectedEmployeeName: assignedEmployee.displayName,
                topCandidateId: assignedEmployee.id,
                topCandidateName: assignedEmployee.displayName,
                topCandidateScore: 85,
                candidates: [
                    {
                        breakdown: { availability: 85, distance: 80, rating: 90, skill: 90, workload: 80 },
                        confidence: 'High',
                        employeeId: assignedEmployee.id,
                        employeeName: assignedEmployee.displayName,
                        rank: 1,
                        reasons: ['Confirmed and assigned by manager from proposal review'],
                        score: 85,
                    },
                ],
                decidedAt: timestamp,
                decidedBy: caller.id,
                notes: 'One-click confirmed and assigned from proposal confirmation.',
                status: 'accepted',
            });
        }
    });
    return { jobId: jobReference.id, assignedEmployee };
}
async function completeProposal(firestore, proposalId, jobId, assignedEmployee) {
    const proposalReference = firestore
        .collection(ACTION_PROPOSALS_COLLECTION)
        .doc(proposalId);
    await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(proposalReference);
        if (!snapshot.exists || snapshot.data()?.status !== 'processing') {
            throw new HttpsError('failed-precondition', 'The proposal can no longer complete.');
        }
        const now = Timestamp.now();
        const proposalData = snapshot.data();
        const updatePayload = {
            completedAt: now,
            failureCode: null,
            failureSummary: null,
            resultJobId: jobId,
            status: 'completed',
            updatedAt: now,
            version: readNumber(snapshot.data()?.version, 1) + 1,
        };
        if (proposalData?.source === 'whatsapp' || proposalData?.whatsappMetadata) {
            const meta = (proposalData.whatsappMetadata || {});
            const existingNotifs = Array.isArray(meta.simulatedNotifications)
                ? meta.simulatedNotifications
                : [];
            const customerName = proposalData.payload?.customerName || meta.customerName || 'Customer';
            const phone = proposalData.payload?.customerPhone || meta.customerPhone || '';
            const notifBody = assignedEmployee
                ? `Hi ${customerName}, your service request for "${proposalData.payload?.title || 'Service'}" is confirmed! Technician ${assignedEmployee.displayName} has been scheduled.`
                : `Hi ${customerName}, your service request for "${proposalData.payload?.title || 'Service'}" has been confirmed.`;
            const outboundNotification = {
                id: `notif_${Date.now()}`,
                type: 'job_scheduled',
                recipientPhone: phone,
                templateName: 'job_scheduled',
                body: notifBody,
                sentAt: now.toDate().toISOString(),
            };
            updatePayload['whatsappMetadata.threadState'] = 'confirmed';
            updatePayload['whatsappMetadata.assignedEmployeeId'] = assignedEmployee?.id || null;
            updatePayload['whatsappMetadata.assignedEmployeeName'] = assignedEmployee?.displayName || null;
            updatePayload['whatsappMetadata.simulatedNotifications'] = [...existingNotifs, outboundNotification];
        }
        transaction.update(proposalReference, updatePayload);
    });
    return {
        jobId,
        proposalId,
        status: 'completed',
    };
}
async function findCompletedJob(firestore, proposalId, jobId) {
    const jobSnapshot = await firestore.collection(JOBS_COLLECTION).doc(jobId).get();
    if (!jobSnapshot.exists) {
        return null;
    }
    return completeProposal(firestore, proposalId, jobId);
}
async function markProposalFailed(firestore, proposalId, summary) {
    await updateProcessingProposal(firestore, proposalId, {
        failureCode: 'prewrite_validation_failed',
        failureSummary: summary,
        status: failureStatusForExecution(true),
    });
}
async function markReconciliationRequired(firestore, proposalId) {
    await updateProcessingProposal(firestore, proposalId, {
        failureCode: 'execution_uncertain',
        failureSummary: 'The server could not confirm whether the job write completed.',
        status: failureStatusForExecution(false),
    });
}
async function updateProcessingProposal(firestore, proposalId, updates) {
    const proposalReference = firestore
        .collection(ACTION_PROPOSALS_COLLECTION)
        .doc(proposalId);
    await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(proposalReference);
        if (!snapshot.exists || snapshot.data()?.status !== 'processing') {
            return;
        }
        transaction.update(proposalReference, {
            ...updates,
            updatedAt: Timestamp.now(),
            version: readNumber(snapshot.data()?.version, 1) + 1,
        });
    });
}
function validateStoredPayload(proposal, caller) {
    const payload = readCreateJobPayload(proposal.payload);
    const validation = validateJobCreation({
        ...payload,
        attachments: [],
        createdBy: caller.id,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        organizationId: caller.organizationId,
    });
    if (!validation.isValid) {
        throw new HttpsError('failed-precondition', validation.errors.join(' '));
    }
    return payload;
}
function readProposalId(data) {
    if (!data ||
        typeof data !== 'object' ||
        typeof data.proposalId !== 'string') {
        throw new HttpsError('invalid-argument', 'A proposal ID is required.');
    }
    const proposalId = data.proposalId.trim();
    if (!proposalId || proposalId.length > 128) {
        throw new HttpsError('invalid-argument', 'A valid proposal ID is required.');
    }
    return proposalId;
}
function readCreateJobPayload(value) {
    if (!value || typeof value !== 'object') {
        throw new HttpsError('failed-precondition', 'The proposal payload is invalid.');
    }
    const payload = value;
    const priority = readString(payload.priority);
    if (priority !== 'Low' &&
        priority !== 'Medium' &&
        priority !== 'High' &&
        priority !== 'Urgent') {
        throw new HttpsError('failed-precondition', 'The proposal priority is invalid.');
    }
    if (payload.dueDate !== null && typeof payload.dueDate !== 'string') {
        throw new HttpsError('failed-precondition', 'The proposal due date is invalid.');
    }
    return {
        customerName: readString(payload.customerName),
        customerPhone: readString(payload.customerPhone),
        description: readString(payload.description),
        dueDate: payload.dueDate,
        location: readString(payload.location),
        priority,
        requiredSkills: readStringArray(payload.requiredSkills),
        serviceAddress: readString(payload.serviceAddress),
        title: readString(payload.title),
    };
}
function readString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}
function readStringArray(value) {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === 'string')
        : [];
}
function readTimestampOrNull(value) {
    return value instanceof Timestamp ? value : null;
}
function readNumber(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function readOptionalString(value) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
//# sourceMappingURL=confirmCreateJobProposal.js.map