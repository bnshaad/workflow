# Workflow Implementation Roadmap

Project Framing: **Explainable AI Decision Support Platform for Field Operations**
Combines eligibility filtering, configurable multi-criteria decision making, human oversight, and evidence-based evaluation to improve workforce assignment decisions.

## 5-Phase Implementation Plan

### Phase 1 — Complete the Operational Loop
- [x] Web Management Portal Foundation & Job Lifecycle (`Open` → `Assigned` → `In Progress` → `Completed`)
- [x] Minimal Employee Flow (status transitions + timestamps: `Assigned` → `In Progress` → `Completed` + optional `reopen` flag)
- [x] End-to-End Operational Lifecycle validation (unlocks real completion-time data for evaluation)

### Phase 2 — Formalize the Decision Pipeline
- [x] Formal Eligibility Engine (explicit filtering stage before ranking: skills, availability, leave, hard constraints)
- [x] Decision Engine Abstraction (`Decision Engine` interface supporting multiple strategies)
- [x] Weighted Strategy (`rule-based-v1` baseline refactored into strategy)
- [x] AHP-TOPSIS Strategy (AHP pairwise comparison matrix for weight derivation + TOPSIS ideal best/worst ranking)

### Phase 3 — Human-in-the-Loop & Recommendation Persistence
- [x] Recommendation Acceptance / Override UI Action ("Accept" / "Choose someone else")
- [x] Structured Override Reasons dropdown (customer request, availability conflict, manager preference, other)
- [x] Confidence Score calculation (High / Medium / Low score bucket + manual review recommendation threshold)
- [x] Unified Permanent Recommendation Record schema persistence (powering feedback, analytics, evaluation, auditing, and explainability)

### Phase 4 — Evidence-Based Evaluation
- [x] AI Quality Metrics (Acceptance %, Override %, Top override reasons, Confidence distribution)
- [x] Operational Impact Metrics (Avg assignment time, Avg completion time, SLA compliance, Reopened jobs count)
- [x] Algorithm Comparison (Weighted vs AHP-TOPSIS side-by-side performance: Acceptance %, Avg Completion, Override %)
- [x] Explainability Evaluation Survey (5-point Likert scale on clarity, trust, helpfulness)
- [x] System Performance Metrics (Recommendation latency, API response time, Dashboard load time)

### Phase 5 — Configuration Layer
- [x] Org-scoped configuration documents in Firestore (`organizationConfigurations` collection: skills, job types, capability mappings, AHP profiles e.g. "Emergency Repair", "Commercial Maintenance")
- [x] Job sub-types within Field Service (AC repair vs plumbing vs electrical vs handyman) with different required skills and criteria weight profiles
- [x] Data & Validation layer configurability (Static forms rendering with dynamic schema validation)

---

## Explicitly Parked / Out of Scope
- Full Employee Mobile App (photo proof upload, issue reporting, notifications - deferred until Phase 1 minimal flow is complete)
- Grounded RAG Knowledge Assistant
- Prediction & Forecasting Dashboard
- Automatic Model Retraining / Reinforcement Learning
- Fully Dynamic Form Generation (forms remain static; configuration is at data/validation layer)
- Second Industry Vertical (proven deeply via Field Service sub-types)
- Autonomous Dispatch without Manager Oversight
