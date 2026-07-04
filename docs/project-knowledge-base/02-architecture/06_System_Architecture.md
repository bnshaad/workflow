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

Workflow consists of two client applications connected to shared Firebase and AI services.

```text
Workflow Platform

Shared Firebase Backend
├── Firebase Authentication
├── Cloud Firestore
├── Firebase Storage
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

No custom backend is required for the MVP.

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

The architecture remains Firebase Spark compatible by:

- Using few top-level collections
- Embedding small task-specific objects
- Avoiding unnecessary reads
- Avoiding Cloud Functions as a requirement
- Avoiding custom backend complexity
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
