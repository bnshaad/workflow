# Workflow Database Design

Version: 1.1
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Purpose

This document defines the Cloud Firestore data model for the Workflow MVP.

The database supports both applications:

- Web Management Portal
- Mobile Field Application

The design remains compatible with Firebase Spark by minimizing collections, reads, and backend complexity.

---

# 2. Database Principles

- Read optimization first
- One screen should require few reads
- Embed small task-specific data
- Keep independent entities in top-level collections
- Use soft deletion with `isActive`
- Enforce tenant isolation with `organizationId`
- Enforce RBAC through Firestore Security Rules
- Store files in Firebase Storage, not Firestore
- Avoid unnecessary collections

---

# 3. Approved Collections

The approved collection vocabulary is listed below. The current web application actively uses the bolded operational collections. `tasks` is superseded terminology and is not the active Firestore collection.

- `organizations`
- `users`
- `jobs`
- `jobActivities`
- `recommendations`
- `incidents`
- `notifications`
- `auditLogs`
- `actionProposals`

Do not create additional top-level collections without approval.

---

# 4. Application Data Sharing

Both applications use the same Firebase project.

Web Management Portal:

- Reads and writes organization operations data.
- Used by administrators and managers.

Mobile Field Application:

- Reads assigned jobs and mobile notifications.
- Writes status updates, work proof metadata, and issue reports.
- Used by employees.

All access is constrained by authentication, user profile, role, and `organizationId`.

---

# 5. Standard Business Fields

Every business document must include:

- id
- organizationId
- isActive
- createdAt
- updatedAt

Where applicable, documents should also include:

- createdBy
- updatedBy

Audit logs are append-only and should not be soft-deleted.

---

# 6. Organizations Collection

Collection:

```text
organizations
```

Purpose:

Stores tenant-level business information and lightweight cached dashboard values.

Fields:

| Field | Type | Required |
|-------|------|----------|
| id | String | Yes |
| name | String | Yes |
| email | String | Yes |
| phone | String | Optional |
| address | String | Optional |
| dashboardStats | Object | Yes |
| isActive | Boolean | Yes |
| createdAt | Timestamp | Yes |
| updatedAt | Timestamp | Yes |

`dashboardStats` may include:

- activeJobs
- completedJobs
- pendingAssignments
- availableTeamMembers
- openIssues

---

# 7. Users Collection

Collection:

```text
users
```

Purpose:

Stores every authenticated user profile.

Employees are users. There is no separate employees collection.

Document ID:

```text
Firebase Authentication UID
```

Fields:

| Field | Type | Required |
|-------|------|----------|
| id | String | Yes |
| organizationId | String | Yes |
| email | String | Yes |
| displayName | String | Yes |
| role | String | Yes |
| skills | Array | Yes |
| availability | String | Yes |
| activeTaskCount | Number | Yes |
| performanceScore | Number | Yes |
| isActive | Boolean | Yes |
| createdAt | Timestamp | Yes |
| updatedAt | Timestamp | Yes |

Roles:

```text
admin
manager
employee
```

Notes:

- Administrators and managers use the Web Management Portal.
- Employees use the Mobile Field Application.
- Skills and availability primarily support assignment decisions for employees.

---

# 8. Jobs Collection

Collection:

```text
jobs
```

Purpose:

Stores the primary operational entity. Older `tasks` and `assignedUserId` terminology is superseded by `jobs` and `assignedEmployeeIds`.

Fields:

| Field | Type | Required |
|-------|------|----------|
| id | String | Yes |
| organizationId | String | Yes |
| title | String | Yes |
| description | String | Yes |
| priority | String | Yes |
| status | String | Yes |
| requiredSkills | Array | Yes |
| assignedEmployeeIds | Array | Yes |
| assignedAt | Timestamp | Nullable |
| assignedBy | String | Nullable |
| location | String | Optional |
| dueDate | Timestamp | Optional |
| statusUpdatedAt | Timestamp | Nullable |
| statusUpdatedBy | String | Nullable |
| startedAt | Timestamp | Nullable |
| startedBy | String | Nullable |
| completedAt | Timestamp | Nullable |
| completedBy | String | Nullable |
| workProofCount | Number | Yes |
| issueCount | Number | Yes |
| aiRecommendation | Map | Nullable |
| manualOverride | Boolean | Yes |
| overrideReason | String | Nullable |
| isActive | Boolean | Yes |
| createdBy | String | Yes |
| createdAt | Timestamp | Yes |
| updatedAt | Timestamp | Yes |

Job lifecycle activity is stored as separate append-only `jobActivities` documents rather than as an embedded timeline.

---

# 9. Job Activities Collection

Collection:

```text
jobActivities
```

Purpose:

Stores append-only job lifecycle events. Implemented event types include status changes, assignment, reassignment, unassignment, employee start, and employee completion.

Fields include `id`, `organizationId`, `jobId`, `type`, `fromStatus`, `toStatus`, optional employee fields, `description`, `createdBy`, `isActive`, `createdAt`, and `updatedAt`.

---

# 10. Recommendations Collection

Collection:

```text
recommendations
```

Purpose:

Stores recommendation history, explanations, and manager feedback.

Fields:

| Field | Type | Required |
|-------|------|----------|
| id | String | Yes |
| organizationId | String | Yes |
| jobId | String | Yes |
| candidates | Array | Yes |
| algorithmVersion | String | Yes |
| assignmentMode | String | Yes |
| status | String | Yes |
| decision | String | Nullable |
| overrideReason | String | Optional |
| recommendedEmployeeId | String | Optional |
| selectedEmployeeId | String | Optional |
| recommendationCriteriaSnapshot | Map | Optional |
| recommendationScoreSnapshot | Number | Optional |
| generatedAt | Timestamp | Yes |
| generatedBy | String | Yes |
| decidedAt | Timestamp | Optional |
| decidedBy | String | Optional |
| createdAt | Timestamp | Yes |
| updatedAt | Timestamp | Optional |

Decision values:

```text
generated
accepted
overridden
```

Adaptive Learning in the MVP stores:

- Accepted recommendation
- Overridden recommendation
- Override reason

It does not automatically adjust machine-learning weights.

---

# 11. Incidents Collection

Collection:

```text
incidents
```

Purpose:

Stores job-related issues reported from the mobile application and resolved from the web portal.

Fields:

| Field | Type | Required |
|-------|------|----------|
| id | String | Yes |
| organizationId | String | Yes |
| jobId | String | Yes |
| reportedBy | String | Yes |
| title | String | Yes |
| description | String | Yes |
| priority | String | Yes |
| status | String | Yes |
| attachmentUrl | String | Optional |
| isActive | Boolean | Yes |
| createdAt | Timestamp | Yes |
| updatedAt | Timestamp | Yes |

---

# 12. Notifications Collection

Collection:

```text
notifications
```

Purpose:

Stores notification records shared by web and mobile clients.

Fields:

| Field | Type | Required |
|-------|------|----------|
| id | String | Yes |
| organizationId | String | Yes |
| recipientUserId | String | Yes |
| title | String | Yes |
| message | String | Yes |
| type | String | Yes |
| read | Boolean | Yes |
| createdAt | Timestamp | Yes |

---

# 13. Audit Logs Collection

Collection:

```text
auditLogs
```

Purpose:

Stores important system events.

Audit logs are append-only.

Fields:

| Field | Type | Required |
|-------|------|----------|
| id | String | Yes |
| organizationId | String | Yes |
| actorId | String | Yes |
| action | String | Yes |
| entityType | String | Yes |
| entityId | String | Yes |
| metadata | Map | Optional |
| createdAt | Timestamp | Yes |
| updatedAt | Timestamp | Yes |
| isActive | Boolean | Yes |

---

# 14. Action Proposals Collection

Collection:

```text
actionProposals
```

Purpose:

Stores durable, user-visible, confirmation-bound proposals for critical coordinator actions. It is not an audit-log substitute and it does not store model conversations, hidden reasoning, tokens, or secrets.

The first supported action is `create_job`. Client rules allow the requesting active manager or admin to create and read only their own tenant-scoped `prepared` proposals. Clients cannot update or delete proposals. The trusted callable function owns execution-state transitions.

Required fields include `id`, `proposalId`, `actionType`, `organizationId`, `requestedBy`, `payload`, `payloadHash`, `summary`, `warnings`, `status`, `idempotencyKey`, `version`, `isActive`, `createdAt`, `updatedAt`, `expiresAt`, `confirmedAt`, `processingStartedAt`, `completedAt`, `resultJobId`, `failureCode`, and `failureSummary`.

Lifecycle:

```text
prepared -> processing -> completed
                    -> failed
                    -> reconciliation_required
prepared -> expired
prepared -> cancelled
```

`proposalId` is the deterministic create-job ID. A completed proposal returns its existing `resultJobId`; the server refuses client updates, altered payloads, cross-tenant access, and concurrent execution.

---

# 15. AI Data Model

The MVP reuses existing operational collections.

No additional model-output or conversational top-level collections are required. `actionProposals` is a critical-action workflow collection, not an AI memory store.

## AI Job Understanding

The current development stub returns an editable draft to the Create Job screen. It does not persist AI extraction output before the manager creates the job.

## Intelligent Job Assignment and Explainable AI

Stored in:

- recommendations
- jobs.aiRecommendation

## Adaptive Learning

Stored in:

- recommendations.decision
- recommendations.overrideReason
- recommendations.selectedEmployeeId

The MVP does not store or update ML weights.

## Decision Support

Uses existing operational data:

- jobs
- users
- recommendations
- incidents

No dedicated Decision Support collection is required for MVP.

## Conversational AI

Uses existing application services.

No conversational summary persistence is implemented.

## Knowledge Assistant

Retrieves from approved documentation:

- SOP
- User Guide
- FAQ
- Product Documentation
- Equipment Manuals

A Firestore knowledge collection is not required for the MVP.

---

# 16. Query Strategy

Dashboard:

- Organization dashboardStats
- Recent jobs
- Recent notifications

Jobs:

- `organizationId == currentOrganization`
- `isActive == true`

Team:

- `organizationId == currentOrganization`
- `role in [admin, manager, employee]`
- `isActive == true`

Employee mobile assigned jobs:

- `organizationId == currentOrganization`
- `assignedEmployeeIds array-contains currentUser`
- `isActive == true`

Notifications:

- `recipientUserId == currentUser`
- limit recent results

---

# 17. Security Strategy

Firestore Security Rules must enforce:

- Authenticated user
- Active user profile
- Matching organizationId
- Sufficient role permissions
- Employee access limited to own profile, assigned jobs, own notifications, own proof, and own issues

---

# 18. Firebase Deployment and Cost Boundary

The Firestore data model remains lightweight by:

- Using the approved top-level collection vocabulary
- Limiting Cloud Functions to authenticated, idempotent critical-action execution
- Avoiding general custom backend services
- Keeping job activity in bounded tenant-scoped reads
- Keeping reads low
- Reusing existing collections for AI data
- Avoiding unnecessary listeners

Deploying the `functions/` package may require a billing-enabled Firebase project, even if function usage stays within free quotas. This is a deployment prerequisite to verify against the target Firebase project, not an assumption that the project has billing enabled.

---

# 19. Future Enhancements

Future versions may add:

- Adaptive scoring
- Offline synchronization
- Push notifications
- Route optimization
- Advanced reporting
- Inventory
- ERP integration

These features are excluded from the MVP.

# 20. Verified Implementation Note (2026-07-13)

The active operational collections are `users`, `jobs`, `jobActivities`, `recommendations`, `auditLogs`, and `actionProposals`; `organizations` remains the approved tenant collection. `incidents` and `notifications` are approved but their rules currently deny access. No knowledge-document collection or model-conversation collection is implemented.

Create-job proposals are durable, tenant-scoped records. They are not business actions until the manager explicitly confirms the displayed, unexpired proposal and the trusted callable completes the write. The repository does not persist hidden model reasoning.
