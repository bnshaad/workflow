# Workflow System Architecture
Version: 1.0  
Status: Approved  
Document Owner: Project Team  
Last Updated: July 2026
---
# 1. Purpose
This document defines the technical architecture of the Workflow MVP.
Workflow will be built as a modern SaaS-style web application using React, TypeScript, and Firebase. The architecture must remain simple, maintainable, secure, and suitable for an academic MVP while still following enterprise software principles.
---
# 2. Architecture Goals
The architecture must support:
- Secure authentication
- Role-based access control
- Organization-based tenant isolation
- Employee management
- Task management
- Explainable assignment recommendations
- Work proof uploads
- Incident reporting
- Audit logging
- Operational dashboards
- Clean and maintainable code structure
The system must avoid unnecessary backend complexity unless clearly required.
---
# 3. High-Level Architecture
```text
User
 ↓
React + TypeScript Web App
 ↓
Protected Routes + RBAC
 ↓
Service Layer
 ↓
Firebase
 ├── Firebase Authentication
 ├── Cloud Firestore
 └── Firebase Storage

Workflow follows a Firebase-first architecture.

No custom backend is required for the MVP.

⸻

4. Technology Stack

Frontend

* React
* TypeScript
* Vite
* React Router
* Tailwind CSS
* shadcn/ui
* lucide-react

Backend / Platform

* Firebase Authentication
* Cloud Firestore
* Firebase Storage

Hosting

Recommended:

* Vercel for frontend
* Firebase for backend services

Alternative:

* Firebase Hosting for frontend

⸻

5. Frontend Responsibilities

The frontend is responsible for:

* Rendering the user interface
* Managing authentication state
* Protecting routes
* Showing role-based navigation
* Calling Firebase service functions
* Displaying dashboards
* Running the rule-based assignment recommendation engine
* Showing recommendation explanations
* Handling form validation
* Showing loading, empty, and error states

Business logic must not be written directly inside UI components.

⸻

6. Firebase Responsibilities

Firebase is responsible for:

* User authentication
* Storing organization data
* Storing users and roles
* Storing employees
* Storing tasks
* Storing assignment recommendations
* Storing incidents
* Storing audit logs
* Storing proof uploads
* Enforcing database security rules

⸻

7. Authentication Architecture

Firebase Authentication will handle:

* Login
* Logout
* Password reset
* Session persistence

Each authenticated Firebase user must have a related user document in Firestore.

The Firestore user document stores:

* userId
* organizationId
* name
* email
* role
* status
* createdAt
* updatedAt

Authentication alone is not enough. Authorization depends on the Firestore user profile.

⸻

8. Role-Based Access Control

The MVP supports three roles:

* Admin
* Manager
* Employee

Role permissions are defined in:

04_User_Roles.md

RBAC must be enforced in four places:

1. Route protection
2. UI visibility
3. Service layer validation
4. Firestore Security Rules

Frontend checks improve user experience.

Firestore Security Rules provide real security.

⸻

9. Tenant Isolation

Workflow is a multi-organization system.

Every business document must include:

organizationId

Users can only access documents that belong to their own organization.

Every Firestore query must filter by organizationId where applicable.

Tenant isolation is mandatory for:

* Users
* Employees
* Tasks
* Assignments
* Recommendations
* Proof uploads
* Incidents
* Notifications
* Audit logs

No organization must be able to view or modify another organization’s data.

⸻

10. Recommended Frontend Folder Structure

web-app/src/
│
├── app/
│   ├── App.tsx
│   └── router.tsx
│
├── components/
│   ├── common/
│   ├── layout/
│   ├── dashboard/
│   ├── tasks/
│   ├── employees/
│   └── settings/
│
├── config/
│   └── firebase.ts
│
├── context/
│   └── AuthContext.tsx
│
├── hooks/
│   ├── useAuth.ts
│   └── useRole.ts
│
├── layouts/
│   ├── AppLayout.tsx
│   └── AuthLayout.tsx
│
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── TasksPage.tsx
│   ├── TaskDetailsPage.tsx
│   ├── EmployeesPage.tsx
│   ├── EmployeeDetailsPage.tsx
│   ├── SettingsPage.tsx
│   └── UnauthorizedPage.tsx
│
├── routes/
│   ├── ProtectedRoute.tsx
│   └── RoleRoute.tsx
│
├── services/
│   ├── authService.ts
│   ├── userService.ts
│   ├── organizationService.ts
│   ├── employeeService.ts
│   ├── taskService.ts
│   ├── assignmentService.ts
│   ├── recommendationService.ts
│   ├── incidentService.ts
│   ├── notificationService.ts
│   └── auditLogService.ts
│
├── types/
│   ├── user.ts
│   ├── organization.ts
│   ├── employee.ts
│   ├── task.ts
│   ├── assignment.ts
│   ├── recommendation.ts
│   ├── incident.ts
│   └── common.ts
│
└── utils/
    ├── dateUtils.ts
    ├── permissionUtils.ts
    └── scoreUtils.ts

⸻

11. Routing Architecture

Primary routes:

/login
/dashboard
/tasks
/tasks/:taskId
/employees
/employees/:employeeId
/settings
/unauthorized

Role-based access:

Admin

Can access:

* Dashboard
* Employees
* Settings
* Users
* Audit logs

Manager

Can access:

* Dashboard
* Tasks
* Employees
* Limited settings

Employee

Can access:

* Assigned tasks
* Task details for assigned tasks only

The MVP should keep routing simple.

⸻

12. Layout Architecture

The application uses two main layouts.

Auth Layout

Used for:

* Login
* Password reset

Structure:

Centered auth card
Minimal branding
Clean background

App Layout

Used after login.

Structure:

Sidebar
Top header
Main content area

Primary navigation:

Dashboard
Tasks
Employees
Settings

Unauthorized navigation items must be hidden.

⸻

13. Service Layer Architecture

All Firebase operations must go through service files.

UI components must not directly call Firestore.

Example:

Bad:
Task page directly queries Firestore.
Good:
Task page calls taskService.getTasks().

Service files are responsible for:

* Firestore queries
* Creating documents
* Updating documents
* Deleting or deactivating records
* Calling audit log service
* Returning typed data

This improves maintainability and keeps business logic separate from UI.

⸻

14. State Management

The MVP should use simple state management.

Use:

* React Context for authentication
* Local state for forms
* Custom hooks for reusable data fetching
* URL params for selected record IDs

Avoid:

* Redux
* Zustand
* Complex global stores

A larger state library should only be added if the project becomes difficult to manage.

⸻

15. Assignment Engine Architecture

The assignment engine is implemented as a rule-based TypeScript service.

Location:

services/recommendationService.ts

It must:

* Accept task details
* Retrieve eligible employees
* Calculate employee scores
* Rank employees
* Generate explanation text
* Store recommendation history
* Support manager approval
* Support manager override

The MVP must not use machine learning.

The recommendation engine must remain explainable and deterministic.

⸻

16. Audit Logging Architecture

Audit logging must be centralized.

Location:

services/auditLogService.ts

Important actions must create audit logs, including:

* User creation
* Employee creation
* Employee update
* Task creation
* Task update
* Recommendation generation
* Assignment approval
* Recommendation override
* Task status update
* Proof upload
* Incident creation
* Incident resolution

Each audit log must include:

* organizationId
* userId
* userRole
* action
* targetType
* targetId
* timestamp
* details

Audit logs should not be created manually in every component. They should be called through shared services.

⸻

17. Notification Architecture

MVP notifications are in-app only.

Notifications are created for:

* Task assignment
* Task status update
* Proof submission
* Incident update

Push notifications are excluded from the MVP.

Notifications must include:

* organizationId
* recipientUserId
* title
* message
* read status
* createdAt

⸻

18. File Upload Architecture

Firebase Storage is used for proof uploads and optional incident attachments.

Files must be linked to Firestore records.

Each upload must store:

* organizationId
* taskId or incidentId
* uploadedBy
* fileUrl
* fileName
* fileType
* uploadedAt

Employees can upload proof only for their assigned tasks.

Managers can view proof for tasks within their organization.

⸻

19. UI Architecture

The UI must follow:

05_Product_Spec.md

Main UI principles:

* Premium SaaS feel
* Minimal layout
* Clean typography
* Calm spacing
* Sidebar navigation
* Clear cards and tables
* Role-based UI
* Helpful empty states
* Simple loading states
* Clear error messages

Recommended UI stack:

* Tailwind CSS
* shadcn/ui
* lucide-react

⸻

20. Error Handling

User-facing errors must be simple and understandable.

Examples:

Unable to load tasks.
Permission denied.
Recommendation could not be generated.
Proof upload failed.

Do not expose technical Firebase errors directly to users.

Technical errors may be logged in the console during development.

⸻

21. Performance Considerations

The MVP should:

* Query only organization-specific data
* Avoid loading unnecessary records
* Use Firestore query limits where useful
* Use indexes for filtered task and employee queries
* Avoid unnecessary re-renders
* Keep dashboard queries lightweight

Large-scale optimization is not required for MVP, but careless querying should be avoided.

⸻

22. Security Architecture

Security must be applied at multiple levels.

Frontend

* Hide unauthorized navigation
* Protect routes
* Disable unauthorized actions

Service Layer

* Check organizationId
* Check role permissions
* Validate required fields

Firestore Rules

* Enforce authentication
* Enforce organizationId matching
* Enforce role-based access

Firestore Security Rules are mandatory before deployment.

⸻

23. Deployment Architecture

Recommended deployment:

Frontend: Vercel
Backend services: Firebase

Environment variables must be used for Firebase config.

Do not commit .env files to Git.

⸻

24. Environment Variables

Firebase config should be stored in:

web-app/.env.local

Example:

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

The app should read these values from environment variables.

⸻

25. Architecture Rules

The following rules are mandatory:

* Do not add Flask.
* Do not add a custom backend for MVP.
* Do not add unnecessary packages.
* Do not call Firestore directly from components.
* Do not remove tenant isolation.
* Do not bypass RBAC.
* Do not hard-code organization data.
* Do not implement out-of-scope features.
* Do not use machine learning for MVP assignment.
* Do not let Codex change architecture without approval.

⸻

26. Acceptance Criteria

The architecture is considered valid when:

* React app has a clean modular structure.
* Firebase configuration is centralized.
* Authentication state is managed globally.
* Routes are protected.
* Role-based access is enforced.
* Firebase calls are isolated inside services.
* All business records use organizationId.
* Assignment engine is separate from UI.
* Audit logging is centralized.
* UI follows the Product Spec.
* No unnecessary backend or package complexity is introduced.

AI services

Intelligent Assignment

Adaptive Learning

Explainable AI

Decision Support

Conversational AI

Knowledge Assistant