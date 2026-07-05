# Workflow MVP Scope

Version: 1.1
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Purpose

This document defines the approved Workflow MVP scope.

The MVP must demonstrate a complete, secure, explainable, and realistic workforce operations workflow across two applications:

- Web Management Portal for administrators and managers
- Mobile Field Application for employees

Any feature not explicitly listed here is out of scope unless approved.

---

# 2. MVP Objectives

The MVP demonstrates:

- Firebase Authentication
- Firestore user profiles
- Role-based access control
- Tenant isolation
- Firestore Security Rules
- Web job management
- Web team management
- Web operational dashboard
- Employee mobile assigned-job workflow
- Job status updates
- Work proof upload
- Issue reporting
- Notifications
- Audit logs
- Explainable AI-assisted assignment
- Manager accept / override recommendation feedback
- AI-assisted assignment evaluation
- Controlled Conversational Workflow Assistant
- Grounded RAG Knowledge Assistant
- Action Needed operational alerts

---

# 3. Applications In Scope

## 3.1 Web Management Portal

Users:

- Administrator
- Manager

Includes:

- Authentication
- Dashboard
- Jobs
- Team
- Assignment recommendation review
- Explainable AI
- Action Needed alerts
- Feedback insights
- Settings according to role
- Audit logs according to role

## 3.2 Mobile Field Application

User:

- Employee

Includes:

- Authentication
- Today's Jobs
- Assigned Jobs
- Job Details
- Status Updates
- Work Proof
- Issue Reporting
- Notifications
- Controlled Conversational Workflow Assistant
- Grounded Knowledge Assistant

---

# 4. Shared Platform Services

Both applications use the same backend services:

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- AI Services
- Notification Services

No custom backend is required for the MVP.

---

# 5. AI Capabilities In Scope

## AI Job Understanding

Managers can describe customer requests in natural language. The AI extracts structured job information such as service type, required skills, priority, title, and description.

Managers review and confirm extracted information before job creation.

## Intelligent Task Assignment

The implemented assignment baseline recommends suitable workers using deterministic rule-based weighted scoring.

Score factors are skills, availability, workload, location relevance when data becomes available, and historical performance.

The system must never automatically assign employees.

Managers remain responsible for final assignment decisions.

Missing data must be shown transparently and must not be invented.

## Explainable AI

Every recommendation must include transparent reasons and a score.

## Manager Recommendation Feedback

The planned next phase stores:

- Accepted recommendation
- Overridden recommendation
- Override reason

Feedback is stored for evaluation and future insight generation.

The MVP does not automatically adjust model weights.

## AI-Assisted Assignment Evaluation

The planned next phase evaluates AI-assisted assignment outcomes against a manual assignment baseline using descriptive metrics such as acceptance rate, overrides, completion rate, assignment-to-start time, assignment-to-completion time, and workload distribution.

Metrics must use only valid available data.

## Explainable Hybrid MCDM Assignment Model

The Explainable Hybrid MCDM Assignment Model is a planned next phase.

It uses eligibility filtering, normalized criteria values, an AHP-derived weight profile, TOPSIS candidate ranking, explanation generation, and manager approval or override.

AHP/TOPSIS is not currently implemented.

## Controlled Conversational Workflow Assistant

The planned assistant supports limited manager-safe requests and must confirm before any write action.

It is not a general-purpose autonomous chatbot.

AI Job Summary belongs inside this workflow and is not a standalone feature.

## Grounded RAG Knowledge Assistant

The planned knowledge assistant retrieves answers only from trusted sources such as:

- SOPs
- AC/electronics service manuals
- Safety instructions
- Installation guides
- FAQs
- Customer visit checklists

Responses must cite or show trusted source references.

If no trusted answer exists, the assistant must clearly state that.

## Decision Support Alerts

Action Needed alerts may include urgent jobs still unassigned, overloaded technicians, overdue jobs, and jobs with no matching skilled employee.

Alerts must remain limited, actionable, and non-intrusive.

No notification system is required for these MVP dashboard alerts.

---

# 6. Employee Mobile Scope

The employee mobile experience is intentionally simple.

It includes:

- Today's Jobs
- Assigned Jobs
- Notifications
- Quick Actions
- Job Details
- Status Updates
- Work Proof Upload
- Issue Reporting

It remains focused on field execution.

---

# 7. Out of Scope

The following are excluded from the MVP:

- Custom backend server
- Cloud Functions requirement
- Automatic assignment without manager approval
- AI conversations outside approved Workflow use cases
- Machine-learning training
- Automatic ML weight adjustment
- Automatic model retraining
- Autonomous weight changes
- Predictive workforce forecasting
- Advanced reporting dashboards
- Payroll
- Inventory
- ERP integrations
- Live GPS tracking
- Offline synchronization
- Internal chat, voice calls, or video calls

---

# 8. Roadmap

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
- Manager Accept / Override Recommendation Feedback
- AI-Assisted Assignment Evaluation
- Explainable Hybrid MCDM Assignment Upgrade
- Secure Gemini Job Understanding Integration
- Decision Support Alerts
- Feedback Insights

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

- Controlled Conversational Workflow Assistant
- Grounded RAG Knowledge Assistant

## Phase G: Platform Completion

- Notifications
- Audit Logs
- Performance
- Testing

---

# 9. Success Criteria

The MVP is complete when:

- Web administrators and managers can manage core operations.
- Mobile employees can execute assigned work.
- Authentication, profiles, RBAC, tenant isolation, and security rules are enforced.
- Assignment recommendations are explainable.
- Manager approvals and overrides are recorded.
- Work proof and issues are captured.
- Notifications and audit logs support operational traceability.
- The architecture remains compatible with Firebase Spark.
