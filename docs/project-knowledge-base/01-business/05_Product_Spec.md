# Workflow Product Specification

Version: 1.1
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Product Overview

Workflow is a two-application workforce operations platform.

It helps administrators and managers coordinate jobs from the Web Management Portal while employees complete assigned work from the Mobile Field Application.

Workflow should feel clean, calm, professional, and focused.

---

# 2. Applications

## Web Management Portal

Users:

- Administrator
- Manager

Primary sections:

- Dashboard
- Jobs
- Team
- Settings

Purpose:

- Manage jobs
- Manage team members
- Review assignment recommendations
- Monitor operations
- Use Decision Support
- Review proof and issues
- Access settings and audit logs according to role

## Mobile Field Application

User:

- Employee

Primary sections:

- Today's Jobs
- Assigned Jobs
- Notifications
- Quick Actions

Purpose:

- View assigned field work
- Open job details
- Update status
- Upload work proof
- Report issues
- Use Conversational AI and Knowledge Assistant where appropriate

The employee mobile dashboard remains focused on field execution.

---

# 3. Design Philosophy

Workflow should feel like:

- Linear
- Notion
- Arc
- Vercel
- Stripe Dashboard

Design principles:

- Minimal
- Fast
- Focused
- Typography-first
- Clear hierarchy
- Calm interface
- No visual clutter
- Contextual actions
- Consistent layouts

Avoid:

- Generic admin templates
- Heavy gradients
- Bright dashboards
- Unnecessary animations
- Too many navigation items

---

# 4. Web Dashboard

Purpose:

Provide administrators and managers with operational visibility.

Contents:

- Active Jobs
- Pending Assignment
- In Progress
- Completed Today
- Available Team Members
- Open Issues
- Recent Activity
- Quick Actions

Decision Support may surface dashboard insights and operational recommendations, but it does not replace dashboard content.

---

# 5. Jobs

Purpose:

Jobs are the operational hub of Workflow.

Job list displays:

- Search
- Filters
- Job table
- Create Job button

Each row displays:

- Title
- Priority
- Status
- Assigned worker
- Due date

Job details display:

- Job information
- Recommendation card
- Assignment
- Timeline
- Work proof
- Issues
- Activity

---

# 6. Team

Purpose:

Allow administrators and managers to view and manage operational users.

Team list displays:

- Name
- Role
- Availability
- Active Jobs
- Skills

Employees are stored in the shared `users` collection. There is no separate employees collection.

---

# 7. Settings

Settings are role-aware.

Admin may access:

- Organization settings
- User management
- Audit logs
- System preferences

Manager may access:

- Limited operational preferences

Employee does not access web settings.

---

# 8. Mobile Field Experience

The mobile application is focused on field execution.

Employee dashboard content:

- Today's Jobs
- Assigned Jobs
- Notifications
- Quick Actions

Job details include:

- Customer or location context
- Required work
- Status controls
- Proof upload
- Issue reporting
- Relevant instructions from Knowledge Assistant

---

# 9. AI Product Features

## AI Job Understanding

Managers can describe customer requests using natural language.

AI extracts suggested structured job fields for manager review.

## Intelligent Task Assignment

The system recommends suitable workers with a Best Match Score.

## Explainable AI

Every recommendation includes visible reasoning.

## Adaptive Learning

The MVP records accepted recommendations, overridden recommendations, and override reasons.

Future versions may add adaptive scoring.

## Decision Support

Decision Support provides dashboard insights, operational recommendations, and natural-language operational queries.

## Conversational AI

Conversational AI guides approved workflow actions.

AI Job Summary is part of this workflow and not a separate AI feature.

## Knowledge Assistant

Knowledge Assistant retrieves answers from:

- SOP
- User Guide
- FAQ
- Product Documentation
- Equipment Manuals

---

# 10. Common Components

The product should use reusable components, including:

- Sidebar
- Header
- Page Header
- Metric Card
- Data Table
- Status Badge
- Priority Badge
- Recommendation Card
- Timeline
- Proof Gallery
- Issue Card
- Dialog
- Search Input
- Filter Bar
- Empty State
- Loading Skeleton
- Toast Notification

---

# 11. Product Rules

- Managers always approve assignments.
- Recommendations are advisory only.
- Recommendation explanations must always be visible.
- Unauthorized actions must not appear in the UI.
- Employees should see only mobile field execution features.
- Important actions should be auditable.
- Error messages must be human-friendly.
- The MVP must remain Firebase Spark compatible.

---

# 12. Acceptance Criteria

The product is acceptable when:

- Web navigation supports Dashboard, Jobs, Team, and Settings.
- Mobile navigation supports Today's Jobs, Assigned Jobs, Notifications, and Quick Actions.
- Jobs act as the operational hub.
- Team management supports assignment readiness.
- Recommendations are explainable.
- Employees can complete assigned work from mobile.
- Decision Support and Knowledge Assistant remain scoped.
- The UI feels modern, minimal, and professional.
