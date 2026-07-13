# Workflow System Architecture

Version: 1.1
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Purpose

This document defines the approved technical architecture for the Workflow MVP.

Workflow must remain simple, maintainable, secure, and compatible with Firebase Spark.

---

# 2. High-Level Architecture

Workflow consists of two client applications connected to shared Firebase services and a narrowly scoped trusted execution boundary for critical actions.

```text
Workflow Platform

Shared Firebase Backend
├── Firebase Authentication
├── Cloud Firestore
├── Firebase Storage
├── Cloud Functions (critical action execution only)
├── AI Services
└── Notification Services

          ┌───────────────────────┬────────────────────────┐
          ▼                       ▼
Web Management Portal      Mobile Field Application
Admin, Manager             Employee
```

Both applications use the same authenticated users, organization data, jobs, recommendations, notifications, audit logs, and storage assets.

---

# 3. Applications

## Web Management Portal

Users:

- Administrator
- Manager

Responsibilities:

- Authentication
- Dashboard
- Jobs
- Team
- Assignment recommendation review
- Explainable AI
- Decision Support
- Settings according to role
- Audit logs according to role

## Mobile Field Application

User:

- Employee

Responsibilities:

- Authentication
- Today's Jobs
- Assigned Jobs
- Job Details
- Status Updates
- Work Proof
- Issue Reporting
- Notifications
- Conversational AI
- Knowledge Assistant

---

# 4. Shared Services

Both applications share:

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- AI Services
- Notification Services

The browser clients use Firestore services for permitted data access. Critical coordinator actions use a Firebase callable function that authenticates the caller, reloads the canonical proposal, and executes the action through the Admin SDK. This is not a general custom backend or model runtime.

---

# 5. Technology Stack

Web:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- lucide-react

Mobile:

- Mobile client implementation will be selected during the Employee Mobile phase.
- It must use the same Firebase project and data model.

Backend platform:

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Functions for approved critical actions only

---

# 6. Authentication Architecture

Firebase Authentication handles:

- Login
- Logout
- Password reset
- Session persistence

Every authenticated Firebase user must have a Firestore user profile in `users/{uid}`.

The user profile stores:

- id
- organizationId
- email
- displayName
- role
- skills
- availability
- activeTaskCount
- performanceScore
- isActive
- createdAt
- updatedAt

Authentication alone is not enough. Authorization depends on the Firestore profile.

---

# 7. RBAC Architecture

The MVP supports:

- Admin
- Manager
- Employee

RBAC must be enforced through:

1. Route protection
2. UI visibility
3. Service-layer validation
4. Firestore Security Rules

Frontend checks improve user experience.

Firestore Security Rules provide real security.

---

# 8. Tenant Isolation

Workflow is multi-tenant.

Every business document must include:

```text
organizationId
```

Queries must filter by `organizationId` where applicable.

No organization may access another organization's data.

---

# 9. Service Layer Architecture

All Firebase operations must go through services.

UI components must not directly call Firestore.

Service files handle:

- Queries
- Writes
- Validation
- Tenant isolation checks
- Permission checks
- Audit log creation where applicable

---

# 10. AI Architecture

AI services are shared by the web and mobile applications.

Approved AI capabilities:

- AI Job Understanding
- Intelligent Task Assignment
- Explainable AI
- Adaptive Learning
- Decision Support
- Conversational AI
- Knowledge Assistant

Rules:

- AI Job Summary is part of Conversational AI.
- Decision Support is limited to dashboard insights, operational recommendations, and natural-language operational queries.
- Adaptive Learning stores manager feedback only in the MVP.
- Knowledge Assistant retrieves only from approved documentation.
- No automatic ML weight adjustment is included in the MVP.

---

# 11. Assignment Engine Architecture

The assignment engine is a rule-based TypeScript service for the MVP.

It evaluates:

- Skills
- Availability
- Workload
- Location relevance
- Priority
- Historical performance

It returns:

- Ranked recommendations
- Best Match Score
- Explanation

Managers approve or override recommendations.

---

# 12. Notification Architecture

Notifications are shared by web and mobile clients.

MVP notification types include:

- Job assigned
- Job updated
- Work proof uploaded
- Issue created
- Issue resolved

Push notifications may be added later if needed.

---

# 13. File Upload Architecture

Firebase Storage stores:

- Work proof images
- Optional issue attachments
- Optional PDF proof files

Firestore stores only metadata and links.

---

# 14. Security Architecture

Security requirements:

- Authenticated access only
- Active user profile required
- Tenant isolation by `organizationId`
- Role permission checks
- Firestore Security Rules before deployment

The MVP must never rely on UI checks alone.

---

# 15. Performance Architecture

The client data model remains read-efficient by:

- Using few top-level collections
- Embedding small task-specific objects
- Avoiding unnecessary reads
- Limiting Cloud Functions to authenticated, proposal-bound critical writes
- Avoiding general custom backend complexity
- Keeping dashboard queries lightweight

---

# 16. Recommended Source Structure

Web source structure:

```text
web-app/src/
├── app/
├── components/
├── config/
├── contexts/
├── hooks/
├── layouts/
├── pages/
├── permissions/
├── routes/
├── services/
├── types/
└── utils/
```

Mobile source structure will be defined during Phase E, but it must follow the same principles:

- Service layer
- Strong typing
- Shared Firebase project
- Shared data contracts
- Role-aware UI

---

# 17. Roadmap

## Phase A: Foundation

- Project setup
- Layout
- Design system alignment
- Firebase configuration

## Phase B: Platform Security

- Authentication
- User Profiles
- RBAC
- Tenant Isolation
- Firestore Security Rules

## Phase C: Web Core

- Jobs
- Team
- Dashboard

## Phase D: Web AI

- AI Job Understanding
- Intelligent Task Assignment
- Explainable AI
- Adaptive Learning
- Decision Support

```text
WEB COMPLETE
```

## Phase E: Employee Mobile

- Authentication
- Assigned Jobs
- Job Details
- Status Updates
- Work Proof
- Issue Reporting

## Phase F: Mobile AI

- Conversational AI
- Knowledge Assistant

## Phase G: Platform Completion

- Notifications
- Audit Logs
- Performance
- Testing

---

# 18. Architecture Rules

- Do not add Flask.
- Do not add Express.
- Do not add a Node backend.
- Do not add unnecessary packages.
- Do not create unapproved Firestore collections.
- Do not call Firestore directly from components.
- Do not bypass tenant isolation.
- Do not bypass RBAC.
- Do not implement AI conversations outside approved Workflow use cases.
- Do not implement automatic ML weight adjustment in the MVP.

# 19. Trusted Proposal Execution and Model Boundary Update (2026-07-14)

The current repository contains a deterministic browser-side coordinator with fixed routes and no model calls or assistant UI. Its create-job proposal is persisted in `actionProposals` and must be confirmed by proposal ID. The `confirmCreateJobProposal` Firebase callable function validates Firebase Authentication, the active Firestore profile, manager or admin role, ownership, and organization before it reloads the stored payload and atomically claims execution.

The proposal lifecycle is `prepared`, `processing`, `completed`, `failed`, `expired`, `cancelled`, or `reconciliation_required`; `confirmed` is reserved for a future distinct acknowledgement stage. The proposal ID is also the deterministic job ID, so duplicate confirmation returns the existing result and concurrent requests cannot create a second job. Definite failures become `failed`; uncertain write outcomes become `reconciliation_required` for administrative follow-up.

The server-side Functions boundary also provides two narrow Gemini-assisted callables: `classifyCoordinatorIntent` and `draftJobFromRequest`. Browser clients never call Gemini directly. Both callables require Firebase Authentication plus a trusted active manager or admin profile, accept bounded text only, use timeouts and one bounded retry, validate structured JSON, and return only a classification or editable draft. Logs include operation, request length, and outcome metadata only; they do not retain prompts, personal data, raw provider errors, or hidden reasoning.

Deterministic routing is always first. Gemini classification runs only when no exact supported route matches, is limited to one classification call, and can select only `show_urgent_unassigned_jobs`, `show_open_jobs_summary`, `show_overloaded_employees`, `prepare_job_draft`, or `unsupported`. It cannot name a tool, grant authority, prepare a critical proposal, confirm a proposal, or execute a write. Structured drafts remain editable and must pass the existing proposal and trusted confirmation path before a job can exist.

`GEMINI_API_KEY` is declared through Firebase `defineSecret` and bound only to the two model callables. Do not add it to browser variables, `.env` files committed to source control, Firestore, logs, or test fixtures. Configure it only in a controlled development Firebase project with `firebase functions:secrets:set GEMINI_API_KEY`, then redeploy the affected Functions. No secret, live Gemini request, or deployment is present in this repository.

The controlled runtime check on 2026-07-14 used Node `20.20.2` and Firebase CLI `15.18.0`. It passed the Functions build and 13 unit tests, the Auth/Firestore/Functions emulator integration suite (7 checks, loading both model callables), and the web rule tests (15 checks), lint, and production build. The Firebase account available to that check exposed only the current `workflow-p` project, not a separately identified non-production project. Therefore no Secret was configured, no billing or quota was assessed, no deployment occurred, and no live Gemini request or log review occurred. A distinct approved development project is required before those steps.

Deploying Firebase Functions, using Cloud Secret Manager, and calling Gemini can require billing-enabled services even when usage remains within free quotas. This phase adds no Genkit, RAG, agent delegation, autonomous execution, or general-purpose server runtime. See `09_Multi_Agent_AI_Architecture.md`.
