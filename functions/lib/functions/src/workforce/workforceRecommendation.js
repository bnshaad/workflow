import { getFirestore, } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { ASSIGNMENT_ALGORITHM_VERSION, isEligibleRecommendationEmployee, rankAssignmentCandidates, } from '../../../shared/assignmentRecommendation.js';
import { requireTrustedManager } from '../auth/requireTrustedManager.js';
const HISTORICAL_JOB_LIMIT = 100;
const JOBS_COLLECTION = 'jobs';
const USERS_COLLECTION = 'users';
export async function getWorkforceRecommendation(request) {
    const caller = await requireTrustedManager(request);
    const jobId = readJobId(request.data);
    return createWorkforceRecommendationService(getFirestore()).recommendForJob(caller, jobId);
}
export function createWorkforceRecommendationService(firestore) {
    return {
        async recommendForJob(caller, jobId) {
            const jobSnapshot = await firestore
                .collection(JOBS_COLLECTION)
                .doc(jobId)
                .get();
            if (!jobSnapshot.exists) {
                throw new HttpsError('not-found', 'The job was not found.');
            }
            const jobData = jobSnapshot.data();
            if (!jobData ||
                jobData.organizationId !== caller.organizationId ||
                jobData.isActive !== true ||
                jobData.status !== 'open') {
                throw new HttpsError('not-found', 'The job was not found.');
            }
            const [employeeSnapshot, historicalJobSnapshot] = await Promise.all([
                firestore
                    .collection(USERS_COLLECTION)
                    .where('organizationId', '==', caller.organizationId)
                    .where('isActive', '==', true)
                    .where('role', '==', 'employee')
                    .select('availability', 'displayName', 'role', 'skills')
                    .get(),
                firestore
                    .collection(JOBS_COLLECTION)
                    .where('organizationId', '==', caller.organizationId)
                    .where('isActive', '==', true)
                    .orderBy('createdAt', 'desc')
                    .limit(HISTORICAL_JOB_LIMIT)
                    .select('assignedEmployeeIds', 'completedAt', 'createdAt', 'location', 'requiredSkills', 'status')
                    .get(),
            ]);
            const job = mapRecommendationJob(jobData);
            const employees = employeeSnapshot.docs
                .map((snapshot) => mapRecommendationEmployee(snapshot.id, snapshot.data()))
                .filter(isEligibleRecommendationEmployee);
            const historicalJobs = historicalJobSnapshot.docs.map((snapshot) => mapRecommendationJob(snapshot.data()));
            const candidates = rankAssignmentCandidates(job, employees, historicalJobs).map((candidate) => ({
                employeeId: candidate.employeeId,
                employeeName: candidate.employeeName,
                rank: candidate.rank,
                reasons: candidate.explanationReasons,
                score: candidate.totalScore,
                scoreBreakdown: candidate.scoreBreakdown,
                warnings: candidate.explanationReasons.filter(isDataWarning),
            }));
            return {
                candidates,
                engineVersion: ASSIGNMENT_ALGORITHM_VERSION,
                generatedAt: new Date().toISOString(),
                jobId,
            };
        },
    };
}
function readJobId(value) {
    if (!value || typeof value !== 'object') {
        throw new HttpsError('invalid-argument', 'A job ID is required.');
    }
    const jobId = value.jobId;
    if (typeof jobId !== 'string' ||
        jobId.trim().length === 0 ||
        jobId.length > 128) {
        throw new HttpsError('invalid-argument', 'A valid job ID is required.');
    }
    return jobId.trim();
}
function mapRecommendationEmployee(id, data) {
    const availability = readAvailability(data.availability);
    return {
        availability: availability.value,
        availabilityKnown: availability.known,
        displayName: readString(data.displayName, 'Workflow employee'),
        id,
        isUnavailable: availability.value === 'leave',
        role: data.role === 'employee' ? 'employee' : 'manager',
        skills: readStringArray(data.skills),
    };
}
function mapRecommendationJob(data) {
    return {
        assignedEmployeeIds: readStringArray(data.assignedEmployeeIds),
        completedAt: data.completedAt ?? null,
        location: readString(data.location),
        requiredSkills: readStringArray(data.requiredSkills),
        status: readString(data.status),
    };
}
function readAvailability(value) {
    if (typeof value !== 'string') {
        return { known: false, value: 'available' };
    }
    const normalized = value.toLowerCase();
    return normalized === 'available' || normalized === 'busy' || normalized === 'leave'
        ? { known: true, value: normalized }
        : { known: false, value: 'available' };
}
function readString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}
function readStringArray(value) {
    return Array.isArray(value)
        ? value.filter((item) => typeof item === 'string')
        : [];
}
function isDataWarning(reason) {
    return reason.startsWith('Insufficient') || reason.startsWith('No employee');
}
//# sourceMappingURL=workforceRecommendation.js.map