# Workflow Business Workflow

Version: 1.1
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Purpose

This document defines how Workflow supports operations across the Web Management Portal and Mobile Field Application.

It is the business reference for implementation, testing, and evaluation.

---

# 2. Platform Workflow Overview

```text
Organization Setup
↓
User Authentication
↓
User Profile + RBAC
↓
Web: Job Creation
↓
Web: AI Job Understanding
↓
Web: Assignment Recommendation
↓
Web: Manager Approval or Override
↓
Mobile: Employee Receives Assigned Job
↓
Mobile: Status Updates + Work Proof + Issue Reporting
↓
Web: Manager Verification
↓
Notifications + Audit Logs
↓
Dashboard Insights + Action Needed Alerts
```

---

# 3. Organization Setup

Actor:

- Administrator

Process:

1. Organization workspace is created.
2. Administrator account is associated with the organization.
3. A unique `organizationId` is assigned.
4. Default role rules are available.
5. The administrator can access the Web Management Portal.

Outcome:

The organization can manage jobs, team members, and settings according to permissions.

---

# 4. Authentication and Authorization

Actors:

- Administrator
- Manager
- Employee

Process:

1. User signs in through Firebase Authentication.
2. Firestore user profile is loaded.
3. `organizationId`, role, and active status are validated.
4. Permissions are applied.
5. User is routed to the correct application experience.

Application access:

- Administrator: Web Management Portal
- Manager: Web Management Portal
- Employee: Mobile Field Application

Outcome:

Users access only the data and functionality allowed by their role.

---

# 5. Team Management

Actors:

- Administrator
- Manager

Process:

1. Authorized user opens Team.
2. User profile information is maintained.
3. Skills, availability, workload, and status are stored in the `users` collection.
4. Updates are scoped to the current organization.

Outcome:

Team records support assignment recommendations and operational visibility.

---

# 6. Job Creation

Actor:

- Manager

Process:

1. Manager creates a job from the Web Management Portal.
2. Manager enters or confirms job details.
3. AI Job Understanding may extract structured fields from a natural-language customer request.
4. Manager reviews and confirms extracted fields.
5. Job is saved to Firestore.

Outcome:

The job is ready for assignment recommendation.

---

# 7. Intelligent Task Assignment

Actor:

- Manager

Process:

1. Manager requests assignment recommendations.
2. System evaluates eligible workers using:
   - Skills
   - Availability
   - Workload
   - Location relevance when data becomes available
   - Historical performance
3. System displays ranked recommendations.
4. Each recommendation includes a score and explanation.

Manager may:

- Accept the recommended employee.
- Choose another employee.
- Record a short override reason.

Suggested override reasons:

- Better local availability
- Customer requested this technician
- Manager preference
- Special experience required
- Other

Outcome:

The assignment remains human-approved and explainable.

Missing data must be shown transparently and must not be invented.

---

# 8. Mobile Job Execution

Actor:

- Employee

Process:

1. Employee opens the Mobile Field Application.
2. Employee views Today's Jobs and Assigned Jobs.
3. Employee opens Job Details.
4. Employee updates status.
5. Employee uploads work proof.
6. Employee reports issues when needed.
7. Employee uses Quick Actions for common field tasks.

Outcome:

Field execution is documented and visible to managers.

---

# 9. Work Proof and Issue Reporting

Actors:

- Employee
- Manager

Process:

1. Employee uploads work proof from the mobile application.
2. Employee reports job issues when required.
3. Manager reviews proof and issue records in the web portal.
4. Manager verifies completion or resolves issues.

Outcome:

Job completion is evidence-based and auditable.

---

# 10. Controlled Conversational Workflow Assistant

Status:

- Planned next phase

Actor:

- Manager

Purpose:

Support limited manager-safe workflow requests using natural language.

Examples:

- Show urgent unassigned jobs.
- Find available technicians.
- Summarize open jobs.
- Create a job draft.
- Open assignment review.

Rules:

- Write actions require manager confirmation.
- The assistant opens existing review or action flows rather than silently changing data.
- AI Job Summary belongs inside this workflow.
- The assistant is not a general-purpose autonomous chatbot.
- Gemini may support this assistant, but Gemini must not automatically create jobs, assign employees, update job status, or execute critical actions without manager confirmation.

---

# 11. Action Needed Alerts

Actors:

- Administrator
- Manager

Purpose:

Provide dashboard-level operational support through limited, actionable alerts.

Initial alerts may include:

- Urgent jobs still unassigned
- Overloaded technicians
- Overdue jobs
- Jobs with no matching skilled employee

Rules:

- Alerts remain non-intrusive.
- Alerts do not execute actions automatically.
- No notification system is required for these MVP dashboard alerts.

---

# 12. Grounded Knowledge Assistant

Status:

- Planned next phase

Actors:

- Administrator
- Manager
- Employee

Purpose:

Retrieve approved operational information from:

- SOPs
- AC/electronics service manuals
- Safety instructions
- Installation guides
- FAQs
- Customer visit checklists

Responses must cite or show trusted source references.

If no trusted answer exists, the assistant must clearly state that.

Web crawling, unrestricted document ingestion, and multi-agent retrieval are outside MVP scope.

---

# 13. Manager Recommendation Feedback

Status:

- Planned next phase

Workflow records feedback from assignment decisions:

- Accepted recommendation
- Overridden recommendation
- Override reason

Feedback is stored for evaluation and future insight generation.

The MVP does not automatically adjust model weights.

Feedback must not be described as automatic model retraining or automatic weight adjustment.

---

# 14. AI-Assisted Assignment Evaluation

Status:

- Planned next phase

Evaluation compares manual assignment baseline with AI-assisted assignment outcomes.

Metrics may include:

- Recommendations generated
- Accepted recommendations
- Acceptance rate
- Overrides
- Common override reasons
- Completion rate
- Assignment-to-start time
- Assignment-to-completion time
- Workload distribution

Metrics must be descriptive and based only on valid available data.

Do not claim statistical significance or prediction accuracy without sufficient evidence.

---

# 15. Explainable Hybrid MCDM Assignment Upgrade

Status:

- Planned next phase

The planned assignment upgrade is:

```text
Eligibility filtering
↓
Normalized criteria values
↓
AHP-derived weight profile
↓
TOPSIS candidate ranking
↓
Explanation generation
↓
Manager approval or override
```

AHP/TOPSIS is not currently implemented.

Managers use simple presets such as Balanced, Urgent Response, Best Expertise, or Fair Workload.

Managers must not configure technical weights or view mathematical matrices.

---

# 16. Notifications and Audit Logs

Notifications support operational awareness across both applications.

Audit logs record important actions such as:

- Login
- User updates
- Job creation
- Recommendation generation
- Assignment approval
- Assignment override
- Status updates
- Work proof upload
- Issue reporting
- Issue resolution

Outcome:

Workflow remains traceable and accountable.

---

# 17. Business Rules

- Every business record belongs to one organization.
- Every authenticated user has one Firestore profile.
- Administrators and managers use the web portal.
- Employees use the mobile field application.
- Managers approve assignments.
- Recommendations are advisory only.
- The system must never automatically assign employees.
- Important actions are auditable.
- Employee mobile dashboard content is limited to Today's Jobs, Assigned Jobs, Notifications, and Quick Actions.
- The architecture must remain Firebase Spark compatible.
