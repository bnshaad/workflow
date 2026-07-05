# Workflow AI Features

Version: 1.1
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Purpose

Workflow uses AI to support workforce operations while keeping users in control.

AI features must remain explainable, practical, and compatible with the Firebase Spark MVP architecture.

---

# 2. AI Principles

- Human-in-the-loop
- Explainable
- Transparent
- Privacy-aware
- Role-aware
- Grounded in Workflow data or approved documentation
- No fully autonomous operational decisions
- No automatic ML training or weight adjustment in the MVP

---

# 3. AI Job Understanding

Status:

- Planned next phase

Purpose:

Help managers convert customer requests into structured job drafts.

Inputs:

- Natural-language customer request

Outputs:

- Suggested job title
- Suggested description
- Service type
- Required skills
- Priority
- Location or customer context when available

Rules:

- Manager reviews and confirms before saving.
- AI does not create jobs automatically.
- AI produces editable structured drafts only.
- Production Gemini integration must use a secure backend or trusted runtime path.
- API keys must never be placed in frontend code, localStorage, sessionStorage, or commits.

Gemini may support AI Job Understanding, but Gemini is not the employee assignment engine.

---

# 4. Intelligent Task Assignment

Status:

- Implemented baseline

Purpose:

Recommend the most suitable worker for a job.

Inputs:

- Skills
- Availability
- Workload
- Location relevance
- Job priority
- Previous performance

Outputs:

- Ranked workers
- Best Match Score
- Suggested Worker
- Recommendation explanation

Rules:

- Manager approves or overrides.
- Recommendations are advisory.
- The current implementation baseline is deterministic, rule-based, explainable, and human-in-the-loop.
- The system must never automatically assign employees.
- Managers remain responsible for final assignment decisions.
- Missing data must be shown transparently and must not be invented.

---

# 5. Explainable AI

Status:

- Implemented baseline

Purpose:

Make recommendation reasoning visible.

Example reasons:

- Required skill matched
- Worker is available
- Low current workload
- Relevant location
- Strong completion history

Managers must always understand why a worker is recommended.

---

# 6. Manager Recommendation Feedback

Status:

- Planned next phase

Purpose:

Record manager feedback for future analysis.

The manager recommendation decision flow is:

- Accept recommended employee.
- Choose another employee.
- Record a short override reason when overriding.

Suggested override reasons:

- Better local availability
- Customer requested this technician
- Manager preference
- Special experience required
- Other

Feedback is stored for evaluation and future insight generation.

This must not be described as automatic model retraining or automatic weight adjustment.

---

# 7. AI-Assisted Assignment Evaluation

Status:

- Planned next phase

Purpose:

Evaluate AI-assisted assignment outcomes against a manual assignment baseline.

Planned metrics:

- Recommendations generated
- Accepted recommendations
- Acceptance rate
- Overrides
- Common override reasons
- Completion rate
- Assignment-to-start time
- Assignment-to-completion time
- Workload distribution

Rules:

- Metrics are descriptive and based only on valid available data.
- Do not claim statistical significance or prediction accuracy without sufficient evidence.

---

# 8. Explainable Hybrid MCDM Assignment Model

Status:

- Planned next phase

Purpose:

Upgrade assignment ranking while preserving explainability and manager control.

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

Manager-facing presets may include:

- Balanced
- Urgent Response
- Best Expertise
- Fair Workload

Each preset maps to a predefined internal weight profile.

Managers must not configure technical weights or view mathematical matrices.

---

# 9. Decision Support Alerts

Purpose:

Help administrators and managers understand operations.

Decision Support Alerts provide:

- Dashboard insights
- Action Needed operational alerts
- Feedback insights

Examples:

- Urgent jobs awaiting assignment
- Workers with high workload
- Overloaded technicians
- Overdue jobs
- Jobs with no matching skilled employee

Rules:

- Alerts must remain limited, actionable, and non-intrusive.
- No notification system is required for these MVP dashboard alerts.
- Decision Support Alerts do not execute actions automatically.

---

# 10. Feedback Insights

Status:

- Planned next phase

Purpose:

Surface descriptive patterns from manager recommendation feedback.

Initial insights:

- Recommendation acceptance rate
- Common override reason
- Recurring location mismatch
- Availability-related overrides

This remains insight-only.

No automatic adaptation, automatic retraining, or autonomous weight changes are included in the MVP.

---

# 11. Controlled Conversational Workflow Assistant

Status:

- Planned next phase

Purpose:

Support limited manager-safe workflow requests.

Examples:

- Show urgent unassigned jobs
- Find available technicians
- Summarize open jobs
- Create a job draft
- Open assignment review

Rules:

- Confirm before any write action.
- Open existing review or action flows rather than silently changing data.
- Do not automatically create jobs, assign employees, update job status, or execute critical actions without manager confirmation.
- This is not a general-purpose autonomous chatbot.

Gemini may support the controlled assistant, but only inside these approved boundaries.

---

# 12. Grounded Knowledge Assistant

Status:

- Planned next phase

Purpose:

Retrieve trusted operational information through grounded RAG.

Initial knowledge sources:

- SOPs
- AC/electronics service manuals
- Safety instructions
- Installation guides
- FAQs
- Customer visit checklists

Rules:

- Responses must cite or show trusted source references.
- If no trusted answer exists, the assistant must clearly state that.
- Web crawling, unrestricted document ingestion, and multi-agent retrieval are outside MVP scope.

Gemini may support the grounded knowledge assistant, but it must stay grounded in trusted sources.

---

# 13. Gemini Integration Boundaries

Status:

- Planned next phase

Gemini is planned only for:

- AI Job Understanding
- Controlled Conversational Workflow Assistant
- Grounded RAG Knowledge Assistant

Gemini is not the employee assignment engine.

Gemini must not automatically create jobs, assign employees, update job status, or execute critical actions without manager confirmation.

Production Gemini integration must use a secure backend or trusted runtime path.

API keys must never be placed in frontend code, localStorage, sessionStorage, or commits.

---

# 14. Out of Scope

The MVP excludes:

- General-purpose chat
- Autonomous assignment
- Automatic machine-learning weight adjustment
- Predictive workforce planning
- AI forecasting dashboards
- Unsupported external knowledge retrieval
- Web crawling
- Unrestricted document ingestion
- Multi-agent retrieval
