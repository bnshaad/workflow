# Workflow MVP Scope

Version: 1.1
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Purpose

This document defines the approved Workflow MVP scope.

Workflow is framed as an **Explainable AI Decision Support Platform for Field Operations** that combines eligibility filtering, configurable multi-criteria decision making, human oversight, and evidence-based evaluation to improve workforce assignment decisions.

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
- Conversational AI for guided workflow actions
- Knowledge Assistant grounded in approved documentation

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
- Decision Support
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
- Conversational AI
- Knowledge Assistant

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

The assignment engine recommends suitable workers using skills, availability, workload, location relevance, priority, and historical performance data.

## Explainable AI

Every recommendation must include transparent reasons and a score.

## Adaptive Learning

The MVP stores:

- Accepted recommendation
- Overridden recommendation
- Override reason

The MVP does not automatically adjust model weights. Future versions may implement adaptive scoring.

## Decision Support

Decision Support provides:

- Dashboard insights
- Operational recommendations
- Natural-language operational queries

## Conversational AI

Conversational AI guides users through approved workflow actions such as creating jobs, updating status, reporting issues, completing jobs, or summarizing completed work.

AI Job Summary belongs inside this workflow and is not a standalone feature.

## Knowledge Assistant

Knowledge Assistant retrieves answers only from:

- SOP
- User Guide
- FAQ
- Product Documentation
- Equipment Manuals

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

# 10. Multi-Agent MVP Scope Update (2026-07-13)

In scope:

- One efficient coordinator
- Job Intelligence, Workforce Intelligence, Operations Insight, and Knowledge specialists introduced incrementally
- Typed, allowlisted read tools
- Structured proposed actions for critical writes
- Explicit confirmation and audit records
- Step, call, and cost limits

Out of scope:

- Autonomous write execution
- Unrestricted agent loops
- Automatic model retraining or assignment-weight changes
- Broad general-purpose agents

---

# 11. Approved Capstone Build Plan & Phased Roadmap (July 2026)

The project is executed according to the approved 5-phase roadmap for an **Explainable AI Decision Support Platform for Field Operations**:

### Phase 1 — Complete the Operational Loop
- Minimal employee app flow (status transitions + timestamps only: `Assigned` → `In Progress` → `Completed` with optional `reopen` flag).
- End-to-end operational job lifecycle unlocking real completion-time metrics.

### Phase 2 — Formalize the Decision Pipeline
- **Eligibility Engine**: Explicit filtering stage before ranking (skills, availability, leave, hard constraints).
- **Decision Engine Abstraction**: Architecture pattern behind a common interface supporting multiple strategies:
  - `Weighted Strategy`: Existing baseline refactored into strategy pattern.
  - `AHP-TOPSIS Strategy`: Pairwise comparison matrix for criteria weight derivation + TOPSIS normalization & relative closeness ranking.

### Phase 3 — Human-in-the-Loop & Recommendation Persistence
- Structured recommendation acceptance/override UI ("Accept Rahul" / "Choose someone else").
- Structured override reasons (customer request, availability conflict, manager preference, other).
- Derived Confidence Score (High/Medium/Low score buckets + manual review recommendation threshold).
- Unified Permanent Recommendation Record schema stored in Firestore powering feedback, analytics, evaluation, auditing, and explainability.

### Phase 4 — Evidence-Based Evaluation
- **AI Quality Metrics**: Acceptance %, Override %, Top override reasons, Confidence distribution.
- **Operational Impact Metrics**: Avg assignment time, Avg completion time, SLA compliance, Reopened jobs.
- **Algorithm Comparison**: Direct comparative evaluation between Weighted Strategy and AHP-TOPSIS Strategy (Acceptance %, Avg completion time, Override %).
- **Explainability Survey**: 5-point Likert scale on clarity, helpfulness, and trust.
- **System Performance Metrics**: Latency, API response time, Dashboard load time.

### Phase 5 — Configuration Layer
- Org-scoped configuration documents in Firestore (skills, job types, capability mappings, AHP profiles e.g. "Emergency Repair", "Commercial Maintenance", validation rules).
- Field Service sub-types (AC repair vs plumbing vs electrical) with tailored skills & criteria weights.
- Static UI form rendering with dynamic schema validation at data/validation layer.

### Explicitly Parked Items
- Full Employee Mobile App (photo proof upload, issue reporting, notifications) beyond Phase 1 minimal flow.
- Grounded RAG Knowledge Assistant.
- Prediction & Forecasting Dashboard.
- Automatic Model Retraining / Dynamic Weight Learning.
- Fully Dynamic Form Generation.
- Second Industry Vertical.
- Autonomous Dispatch.


