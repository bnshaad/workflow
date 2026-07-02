# User Roles & Permissions

Version: 1.1
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Purpose

This document defines the user roles, responsibilities, permissions, and access restrictions within the Workflow platform.

The platform follows a Role-Based Access Control (RBAC) model to ensure users can only access the features and data required for their responsibilities.

---

# 2. RBAC Principles

Workflow follows these principles:

- Least Privilege
- Organization-level data isolation
- Role-based feature access
- Human approval for assignment decisions
- Auditability of privileged actions

Every authenticated user:

- Belongs to exactly one organization.
- Has exactly one role.
- Can only access data within their organization.

---

# 3. User Roles

The MVP includes three roles:

1. Admin
2. Manager
3. Employee

---

# 4. Admin

## Purpose

The Admin manages the organization, users, and overall system configuration.

### Responsibilities

- Manage organization information
- Create and manage users
- Assign user roles
- View all employees
- View all tasks
- View dashboards
- View audit logs

### Permissions

- Manage organization settings
- Create users
- Edit users
- Deactivate users
- Reset user passwords (future)
- View reports
- View all operational data

### Restrictions

- Cannot execute employee tasks.
- Cannot upload work proof.
- Cannot update task progress.

---

# 5. Manager

## Purpose

The Manager is responsible for daily workforce operations.

### Responsibilities

- Manage employees
- Create tasks
- Assign work
- Review AI recommendations
- Approve or override recommendations
- Verify completed work
- Resolve incidents
- Monitor operations

### Permissions

- Create tasks
- Edit tasks
- Delete unassigned tasks
- Manage employee information
- Generate assignment recommendations
- Approve recommendations
- Override recommendations
- Verify work proof
- Close completed tasks
- View dashboards
- View incidents

### Restrictions

- Cannot modify organization settings.
- Cannot manage user roles.
- Cannot access another organization's data.

---

# 6. Employee

## Purpose

Employees perform assigned operational work.

### Responsibilities

- Complete assigned tasks
- Update task progress
- Upload work proof
- Report incidents

### Permissions

- View assigned tasks
- Update task status
- Upload proof
- Report incidents
- View own profile

### Restrictions

- Cannot create tasks.
- Cannot assign tasks.
- Cannot view other employees.
- Cannot access dashboards.
- Cannot access audit logs.
- Cannot manage users.

---

# 7. Permission Matrix

| Feature | Admin | Manager | Employee |
|---------|:-----:|:-------:|:--------:|
| Login | ✅ | ✅ | ✅ |
| View Dashboard | ✅ | ✅ | ❌ |
| Manage Organization | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Manage Employees | ✅ | ✅ | ❌ |
| View Employees | ✅ | ✅ | Self Only |
| Create Task | ❌ | ✅ | ❌ |
| Edit Task | ❌ | ✅ | ❌ |
| Delete Task | ❌ | ✅ | ❌ |
| View Tasks | ✅ | ✅ | Assigned Only |
| Generate AI Recommendation | ❌ | ✅ | ❌ |
| Approve Assignment | ❌ | ✅ | ❌ |
| Override Recommendation | ❌ | ✅ | ❌ |
| Update Task Status | ❌ | ❌ | ✅ |
| Upload Work Proof | ❌ | ❌ | ✅ |
| Verify Work Proof | ❌ | ✅ | ❌ |
| Report Incident | ❌ | ❌ | ✅ |
| Resolve Incident | ❌ | ✅ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ |

---

# 8. Data Visibility

## Admin

Can view every record within the organization.

---

## Manager

Can view all operational records within the organization.

---

## Employee

Can only access:

- Own profile
- Assigned tasks
- Own uploaded proof
- Own incidents

---

# 9. Security Rules

Every request must satisfy all of the following:

- User is authenticated.
- User belongs to the organization.
- User has sufficient role permissions.

Access is denied if any condition fails.

---

# 10. Audit Requirements

The following actions must generate audit logs:

- User creation
- User updates
- Employee creation
- Employee updates
- Task creation
- Task updates
- Assignment approval
- Assignment override
- Incident resolution

Each audit log shall contain:

- User ID
- User role
- Organization ID
- Timestamp
- Action
- Target entity

---

# 11. Implementation Notes

- Store the user's role in their user document.
- Protect application routes using this permission model.
- Enforce permissions through Firestore Security Rules.
- Hide unauthorized UI actions while also validating permissions on the backend.
- Every query must be filtered by organizationId.

---

# 12. Acceptance Criteria

- Admin can manage users and organization settings.
- Manager can manage employees and operational tasks.
- Employee can only access assigned work.
- Unauthorized actions are blocked.
- Organization data remains isolated.
- Privileged actions generate audit logs.