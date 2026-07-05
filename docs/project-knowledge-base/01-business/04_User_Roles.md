# User Roles & Permissions

Version: 1.2
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Purpose

This document defines Workflow roles, responsibilities, and access restrictions across the Web Management Portal and Mobile Field Application.

---

# 2. RBAC Principles

Workflow follows:

- Least privilege
- Organization-level data isolation
- Role-based feature access
- Human approval for assignment decisions
- Auditability of privileged actions

Every authenticated user:

- Belongs to exactly one organization.
- Has exactly one role.
- Has a Firestore user profile.
- Can only access data inside their organization.

---

# 3. Roles

The MVP includes three roles:

1. Admin
2. Manager
3. Employee

---

# 4. Admin

Application:

- Web Management Portal

Purpose:

Administrators manage the organization, users, settings, and audit visibility.

Permissions:

- View dashboard
- View and manage jobs
- View and manage team members
- Manage organization settings
- Manage users
- View audit logs
- View Action Needed alerts and feedback insights
- Use Grounded Knowledge Assistant

Restrictions:

- Does not execute field jobs.
- Does not upload work proof.
- Does not update job progress as an employee.

---

# 5. Manager

Application:

- Web Management Portal

Purpose:

Managers run daily operations.

Permissions:

- View dashboard
- Create and manage jobs
- Manage team information
- Generate assignment recommendations
- Approve assignments
- Override recommendations with a reason
- Verify work proof
- Resolve job issues
- View Action Needed alerts and feedback insights
- Use Grounded Knowledge Assistant

Restrictions:

- Cannot manage organization-level settings.
- Cannot manage user roles.
- Cannot view audit logs unless explicitly approved.
- Cannot access another organization's data.

---

# 6. Employee

Application:

- Mobile Field Application

Purpose:

Employees complete assigned field jobs.

Permissions:

- View Today's Jobs
- View Assigned Jobs
- View job details for assigned jobs
- Update job status
- Upload work proof
- Report issues
- View notifications
- Use Quick Actions
- Use Grounded Knowledge Assistant

Restrictions:

- Cannot create jobs.
- Cannot assign jobs.
- Cannot view team lists.
- Cannot access manager dashboards.
- Cannot access settings.
- Cannot view audit logs.

---

# 7. Permission Matrix

| Feature | Admin (Web) | Manager (Web) | Employee (Mobile) |
|---------|:-----------:|:-------------:|:-----------------:|
| Authentication | ✓ | ✓ | ✓ |
| Dashboard | ✓ | ✓ | Today's Jobs only |
| Jobs | ✓ | ✓ | Assigned Jobs only |
| Team | ✓ | ✓ | — |
| Settings | ✓ | Limited | — |
| Audit Logs | ✓ | — | — |
| AI Job Understanding | ✓ | ✓ | — |
| Intelligent Task Assignment | ✓ | ✓ | View assigned outcome only |
| Explainable AI | ✓ | ✓ | View assigned-job context only |
| Manager Recommendation Feedback | ✓ | ✓ | — |
| AI-Assisted Assignment Evaluation | ✓ | ✓ | — |
| Decision Support Alerts | ✓ | ✓ | — |
| Controlled Conversational Workflow Assistant | ✓ | ✓ | — |
| Grounded Knowledge Assistant | ✓ | ✓ | ✓ |
| Work Proof Upload | — | Review only | ✓ |
| Issue Reporting | — | Resolve only | ✓ |
| Notifications | ✓ | ✓ | ✓ |

---

# 8. Data Visibility

Admin:

- Can view organization-level operational data.
- Can manage users and settings.

Manager:

- Can view operational data needed to manage jobs and team members.
- Cannot manage organization ownership or user roles.

Employee:

- Can view own profile, assigned jobs, own notifications, own work proof, and own issues.

---

# 9. Security Requirements

Every request must satisfy:

- User is authenticated.
- User has an active Firestore profile.
- User belongs to the organization.
- User has sufficient role permissions.

Firestore Security Rules provide the real enforcement layer.

Frontend RBAC improves user experience but must not be the only security control.
