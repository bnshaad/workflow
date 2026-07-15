# Workflow Assignment Engine

Version: 1.0
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Purpose

This document defines the MVP assignment engine.

The engine recommends suitable workers for jobs while keeping managers responsible for final assignment decisions.

---

# 2. Scope

The MVP assignment engine is rule-based and explainable.

It does not use machine-learning training, automatic model updates, or autonomous assignment.

---

# 3. Inputs

The approved engine may eventually evaluate the inputs below. Section 11 defines the smaller subset currently scored by `rule-based-v1`:

- Required skills
- Worker skills
- Worker availability
- Current workload
- Job priority
- Location relevance
- Previous performance

All inputs must come from approved Workflow data in Firestore.

---

# 4. Outputs

The engine returns:

- Ranked worker recommendations
- Best Match Score
- Suggested Worker
- Explanation reasons

Each recommendation must be understandable to a manager.

---

# 5. Manager Decision

Managers may:

- Accept the recommendation.
- Override the recommendation.
- Select a different worker.
- Record an override reason.

The system must never automatically finalize assignments without manager approval.

---

# 6. Stored Recommendation Data

Recommendation history is stored in the `recommendations` collection.

The MVP stores:

- Recommended worker
- Score
- Reason breakdown
- Decision
- Accepted recommendation
- Overridden recommendation
- Override reason
- Selected worker when overridden

---

# 7. Adaptive Learning Boundary

Adaptive Learning in the MVP means storing feedback for later analysis.

The MVP does not automatically adjust scoring weights.

Future versions may implement adaptive scoring after enough validated data exists.

---

# 8. Explainability Requirements

Approved explanation categories may eventually include:

- Skill match
- Availability
- Low workload
- Location relevance
- Strong previous performance

Explanations must be shown before manager approval.

---

# 9. Service Layer

The assignment engine should be implemented as a service-layer module.

UI components must not contain scoring logic.

The service should:

- Retrieve eligible workers through approved services.
- Calculate scores.
- Generate explanations.
- Store recommendation history.
- Support manager decision recording.

---

# 10. Out of Scope

The MVP excludes:

- Automatic assignment
- Machine-learning training
- Automatic scoring weight adjustment
- Route optimization
- Shift planning
- External optimization engines

# 11. Verified `rule-based-v1` Implementation

The authoritative scoring function is shared by the existing recommendation service and the trusted read-only Workforce Intelligence callable. It ranks active employee candidates who are not on leave, sorts by total score and then employee name, and returns at most five candidates.

Current score contributions are:

- Skill match: up to 35 points
- Availability: up to 25 points
- Active assigned or in-progress workload: up to 20 points
- Historical completion ratio: up to 10 points
- Location relevance: 0 points until verified employee service-area or location-history data exists

The current employee `performanceScore` field is not used by `rule-based-v1`; historical performance is derived from the latest 100 tenant jobs. Job priority is also not currently scored. These fields must not be described as active criteria until the engine changes through an approved phase.

The `getWorkforceRecommendation` callable is read-only. It authenticates the caller, reloads an active manager or admin profile, derives `organizationId` from that trusted profile, requires an active open job in the same tenant, loads tenant-scoped eligible employees and bounded job history, and invokes the shared engine. It does not persist a recommendation, create a proposal, or assign, reassign, or unassign an employee.
