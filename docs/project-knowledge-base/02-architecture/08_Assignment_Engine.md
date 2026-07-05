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

# 2. Current Implementation Baseline

Status:

- Implemented

The current assignment engine baseline is deterministic, rule-based, weighted scoring, and explainable.

It is human-in-the-loop.

It does not use machine-learning training, automatic model updates, or autonomous assignment.

The system must never automatically assign employees.

Managers remain responsible for final assignment decisions.

---

# 3. Inputs

The engine may evaluate:

- Required skills
- Worker skills
- Worker availability
- Current workload
- Job priority
- Location relevance when data becomes available
- Previous performance

All inputs must come from approved Workflow data in Firestore.

Missing data must be shown transparently and must not be invented.

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

- Select a different worker.
- Record an override reason.

The system must never automatically finalize assignments without manager approval.

The manager decision flow is:

1. Accept recommended employee.
2. Choose another employee.
3. Record a short override reason when overriding.

Suggested override reasons:

- Better local availability
- Customer requested this technician
- Manager preference
- Special experience required
- Other

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
- Feedback for evaluation and future insight generation

---

# 7. Feedback and Learning Boundary

Feedback in the MVP means storing manager decisions for later analysis.

The MVP does not automatically adjust scoring weights.

Do not describe feedback as automatic model retraining or automatic weight adjustment.

---

# 8. Explainability Requirements

Every recommendation must include reasons such as:

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

# 10. Planned Upgrade: Explainable Hybrid MCDM Assignment Model

Status:

- Planned next phase

The planned upgrade is named the Explainable Hybrid MCDM Assignment Model.

Architecture:

```text
Eligibility filtering
↓
Normalized criteria values
↓
AHP-derived weight profile
↓
TOPSIS candidate ranking
↓
Explanation generation
↓
Manager approval or override
```

AHP/TOPSIS is a future enhancement and is not currently implemented.

Future manager-facing assignment presets may include:

- Balanced
- Urgent Response
- Best Expertise
- Fair Workload

Each preset maps to a predefined internal weight profile.

The manager must not configure technical weights or view mathematical matrices.

---

# 11. AI-Assisted Assignment Evaluation

Status:

- Planned next phase

Evaluation compares the manual assignment baseline with AI-assisted assignment outcomes.

Planned descriptive metrics:

- Recommendations generated
- Accepted recommendations
- Acceptance rate
- Overrides
- Common override reasons
- Completion rate
- Assignment-to-start time
- Assignment-to-completion time
- Workload distribution

Metrics must be descriptive and based only on valid available data.

Do not claim statistical significance or prediction accuracy without sufficient evidence.

---

# 12. Out of Scope

The MVP excludes:

- Automatic assignment
- Machine-learning training
- Automatic scoring weight adjustment
- Route optimization
- Shift planning
- External optimization engines
