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

The engine may evaluate:

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

# 10. Out of Scope

The MVP excludes:

- Automatic assignment
- Machine-learning training
- Automatic scoring weight adjustment
- Route optimization
- Shift planning
- External optimization engines
