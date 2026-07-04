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
Dashboard Insights + Decision Support
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
   - Location relevance
   - Job priority
   - Historical performance
3. System displays ranked recommendations.
4. Each recommendation includes a score and explanation.

Manager may:

- Accept the recommendation.
- Override the recommendation.
- Record an override reason.

Outcome:

The assignment remains human-approved and explainable.

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

# 10. Conversational AI Workflow

Actors:

- Manager
- Employee

Purpose:

Guide approved workflow actions using natural language.

Examples:

- Create a job draft.
- Update job status.
- Report an issue.
- Summarize a completed job.

Rules:

- Critical actions require user confirmation.
- AI Job Summary belongs inside this workflow.
- Conversational AI stays within approved Workflow actions.

---

# 11. Decision Support

Actors:

- Administrator
- Manager

Purpose:

Provide operational support through:

- Dashboard insights
- Operational recommendations
- Natural-language operational queries

Decision Support does not execute actions automatically.

---

# 12. Knowledge Assistant

Actors:

- Administrator
- Manager
- Employee

Purpose:

Retrieve approved operational information from:

- SOP
- User Guide
- FAQ
- Product Documentation
- Equipment Manuals

The assistant must not answer from unsupported general knowledge when an approved source is required.

---

# 13. Adaptive Learning

The MVP records feedback from assignment decisions:

- Accepted recommendation
- Overridden recommendation
- Override reason

The MVP does not automatically adjust model weights.

Future versions may implement adaptive scoring after enough validated feedback exists.

---

# 14. Notifications and Audit Logs

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

# 15. Business Rules

- Every business record belongs to one organization.
- Every authenticated user has one Firestore profile.
- Administrators and managers use the web portal.
- Employees use the mobile field application.
- Managers approve assignments.
- Recommendations are advisory only.
- Important actions are auditable.
- Employee mobile dashboard content is limited to Today's Jobs, Assigned Jobs, Notifications, and Quick Actions.
- The architecture must remain Firebase Spark compatible.
