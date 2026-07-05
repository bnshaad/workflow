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

Workflow uses only these top-level collections:

```text
organizations
users
jobs
recommendations
incidents
notifications
auditLogs
jobActivities
```

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

Stores operational jobs.

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
| location | String | Optional |
| dueDate | Timestamp | Optional |
| assignedEmployeeIds | Array | Yes |
| recommendationId | String | Optional |
| assignment | Object | Optional |
| proof | Object | Optional |
| recommendationSummary | Object | Optional |
| incidentSummary | Object | Optional |
| timeline | Array | Optional |
| isActive | Boolean | Yes |
| createdBy | String | Yes |
| createdAt | Timestamp | Yes |
| updatedAt | Timestamp | Yes |

Embedded objects:

- Assignment
- Proof
- Recommendation Summary
- Incident Summary
- Job Activity references

Embedding these objects reduces reads for job details and list views.

Detailed job timeline events are stored in `jobActivities`.

---

# 9. Recommendations Collection

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
| recommendedUserId | String | Yes |
| recommendedUserName | String | Yes |
| score | Number | Yes |
| reasonBreakdown | Map | Yes |
| decision | String | Yes |
| overrideReason | String | Optional |
| selectedUserId | String | Optional |
| createdAt | Timestamp | Yes |
| updatedAt | Timestamp | Optional |

Decision values:

```text
pending
accepted
overridden
```

Manager Recommendation Feedback stores:

- Accepted recommendation
- Overridden recommendation
- Override reason

It does not automatically adjust machine-learning weights.

---

# 10. Incidents Collection

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

# 11. Notifications Collection

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

# 12. Audit Logs Collection

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
| userId | String | Yes |
| userRole | String | Yes |
| action | String | Yes |
| entityType | String | Yes |
| entityId | String | Yes |
| details | Map | Optional |
| timestamp | Timestamp | Yes |

---

# 13. Job Activities Collection

Collection:

```text
jobActivities
```

Purpose:

Stores job timeline events and field execution activity.

Fields:

| Field | Type | Required |
|-------|------|----------|
| id | String | Yes |
| organizationId | String | Yes |
| jobId | String | Yes |
| type | String | Yes |
| description | String | Yes |
| performedBy | String | Optional |
| metadata | Map | Optional |
| isActive | Boolean | Yes |
| createdAt | Timestamp | Yes |
| updatedAt | Timestamp | Yes |

Job activities support job detail timelines, dashboard recent activity, and evaluation metrics.

---

# 14. AI Data Model

The MVP reuses existing operational collections.

No additional AI top-level collections are required.

## AI Job Understanding

Suggested extracted fields may be stored on a task draft or task document when confirmed by the manager.

Optional task field:

- aiExtractedFields

## Intelligent Task Assignment and Explainable AI

Stored in:

- recommendations
- jobs.recommendationSummary

## Manager Recommendation Feedback

Stored in:

- recommendations.decision
- recommendations.overrideReason
- recommendations.selectedUserId

Feedback is stored for evaluation and future insight generation.

The MVP does not store or update ML weights.

Feedback must not be described as automatic model retraining or automatic weight adjustment.

## AI-Assisted Assignment Evaluation

Status:

- Planned next phase

Evaluation uses valid available data from:

- recommendations
- jobs
- users
- incidents
- auditLogs
- jobActivities

Planned descriptive metrics include recommendations generated, accepted recommendations, acceptance rate, overrides, common override reasons, completion rate, assignment-to-start time, assignment-to-completion time, and workload distribution.

Evaluation compares the manual assignment baseline with AI-assisted assignment outcomes.

Do not claim statistical significance or prediction accuracy without sufficient evidence.

## Decision Support Alerts and Feedback Insights

Uses existing operational data:

- jobs
- users
- recommendations
- incidents

No dedicated Decision Support Alerts collection is required for MVP.

## Controlled Conversational Workflow Assistant

Uses existing application services.

The Controlled Conversational Workflow Assistant is planned for limited manager-safe requests such as showing urgent unassigned jobs, finding available technicians, summarizing open jobs, creating a job draft, and opening assignment review.

It must confirm before any write action and open existing review or action flows rather than silently changing data.

It is not a general-purpose autonomous chatbot.

AI Job Summary is part of the controlled assistant workflow and may be stored as `jobActivities` or task notes only when confirmed by the user.

## Grounded Knowledge Assistant

The Grounded Knowledge Assistant retrieves from approved documentation:

- SOPs
- AC/electronics service manuals
- Safety instructions
- Installation guides
- FAQs
- Customer visit checklists

A Firestore knowledge collection is not required for the MVP.

Responses must cite or show trusted source references.

If no trusted answer exists, the assistant must clearly state that.

Web crawling, unrestricted document ingestion, and multi-agent retrieval are outside MVP scope.

## Gemini Boundary

Gemini is planned only for AI Job Understanding, the Controlled Conversational Workflow Assistant, and the Grounded RAG Knowledge Assistant.

Gemini is not the employee assignment engine.

Production Gemini integration must use a secure backend or trusted runtime path.

API keys must never be placed in frontend code, localStorage, sessionStorage, or commits.

---

# 15. Query Strategy

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

# 16. Security Strategy

Firestore Security Rules must enforce:

- Authenticated user
- Active user profile
- Matching organizationId
- Sufficient role permissions
- Employee access limited to own profile, assigned jobs, own notifications, own proof, and own issues

---

# 17. Firebase Spark Compatibility

The design remains Spark compatible by:

- Using only seven top-level collections
- Avoiding Cloud Functions as a requirement
- Avoiding custom backend services
- Embedding task-specific data
- Keeping reads low
- Reusing existing collections for AI data
- Avoiding unnecessary listeners

---

# 18. Future Enhancements

Future versions may add:

- Offline synchronization
- Push notifications
- Route optimization
- Advanced reporting
- Inventory
- ERP integration
- Automatic learning or automatic model-weight adjustment

These features are excluded from the MVP.
