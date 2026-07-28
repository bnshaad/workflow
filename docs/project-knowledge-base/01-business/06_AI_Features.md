# Workflow AI Features

Version: 2.0
Status: Approved
Document Owner: Project Team
Last Updated: July 2026

---

# 1. Purpose

Workflow uses AI to support workforce operations as an **Explainable AI Decision Support Platform for Field Operations**.

AI features remain explainable, practical, human-controlled, and compatible with the Firebase Spark MVP architecture.

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

Purpose: Help managers convert customer requests into structured job drafts.

Inputs: Natural-language customer request.

Outputs: Suggested job title, description, service type, required skills, priority, location context.

Rules: Manager reviews and confirms before saving. AI does not create jobs automatically.

---

# 4. Decision Engine & Multi-Criteria Ranking

Purpose: Recommend the most suitable worker for a job through a 3-stage pipeline (Eligibility → Ranking → Explanation).

Ranking Architecture: **Decision Engine** supporting two benchmarked strategies:
1. **Weighted Strategy**: Baseline sum (skill, availability, workload, history).
2. **AHP-TOPSIS Strategy**:
   - Analytic Hierarchy Process (AHP) pairwise comparison matrix deriving criteria weights.
   - TOPSIS normalization, ideal best/worst calculation, and relative closeness ranking.
   - AHP Profiles tailored for job sub-types (e.g. "Emergency Repair", "Commercial Maintenance").

Outputs:
- Ranked candidates with score breakdown
- Derived **Confidence Score** (High / Medium / Low) with "Manual Review Recommended" threshold
- Explanation reasons (skill match, workload, history)

---

# 5. Explainable AI & Manager Oversight

Purpose: Make recommendation reasoning transparent and enforce human oversight.

Manager Actions:
- Accept top recommendation ("Accept Rahul")
- Override recommendation ("Choose someone else")
- Select structured override reason (Customer Request, Availability Conflict, Manager Preference, Other)

Every decision persists a **Unified Permanent Recommendation Record** in Firestore.

---

# 6. Evaluation Dashboard & Analytics

Purpose: Provide evidence-based AI quality, operational impact, and algorithm comparison metrics.

Metrics displayed:
- **AI Quality**: Recommendation acceptance %, override %, top override reasons, confidence distribution.
- **Operational Impact**: Avg assignment time, avg completion time, SLA compliance, reopened jobs.
- **Algorithm Benchmark**: Side-by-side comparison between Weighted Strategy and AHP-TOPSIS Strategy.
- **Explainability Survey**: 5-point Likert scale on clarity, trust, helpfulness.

---

# 7. Configuration Layer

Purpose: Org-scoped configuration of skills, job types, capability mappings, and AHP profiles in Firestore.

Configurability:
- Configurable job sub-types within Field Service (AC repair, plumbing, electrical).
- Configurable AHP weight tables / profiles.
- Forms remain static in UI; schema validation is dynamic at the data/validation layer.

---

# 8. Out of Scope

- Fully autonomous assignment without manager approval
- Automatic machine-learning weight retraining
- Grounded RAG Knowledge Assistant (parked for future work)
- Predictive workforce planning / forecasting
- Fully dynamic UI form generation
- Live GPS tracking / route optimization
