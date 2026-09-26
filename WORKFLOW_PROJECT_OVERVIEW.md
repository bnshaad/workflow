# Workflow Platform: Comprehensive Project Specification & System Overview

> **Project Title:** Workflow — Explainable AI Decision Support Platform for Field Operations  
> **Repository:** `bnshaad/workflow` (`/Users/binshad/projects/workflow-mvp`)  
> **Document Status:** Comprehensive System Reference  
> **Target Audience:** Engineering, Product, Research, and Operations Teams  
> **Current Version:** 2.0 (Post-Phase 5 Full Stack Implementation)

---

## Table of Contents

1. [Executive Summary: What We Are Building](#1-executive-summary-what-we-are-building)
2. [Detailed Concept & Design Philosophy](#2-detailed-concept--design-philosophy)
3. [Current Status: How Much We Built](#3-current-status-how-much-we-built)
4. [Technology Stack & Tooling](#4-technology-stack--tooling)
5. [Implementation Roadmap & Phases](#5-implementation-roadmap--phases)
6. [System & Software Architecture](#6-system--software-architecture)
7. [Comprehensive Features Deep Dive](#7-comprehensive-features-deep-dive)
8. [End-to-End Operational Lifecycle & Working](#8-end-to-end-operational-lifecycle--working)
9. [AI & Decision Support Engine (Technical Deep Dive)](#9-ai--decision-support-engine-technical-deep-dive)
10. [Defensive Architecture, Reliability & Failure Recovery](#10-defensive-architecture-reliability--failure-recovery)
11. [Summary & Future Horizon](#11-summary--future-horizon)

---

## 1. Executive Summary: What We Are Building

### 1.1 Core Mission & Identity
**Workflow** is an **Explainable AI Decision Support Platform for Field Operations**, specifically designed for small-to-mid-sized service trade businesses (HVAC/air conditioning repair, plumbing, electrical installations, and maintenance operations).

The platform bridges the operational disconnect between central office dispatchers and mobile field technicians by replacing ad-hoc, manual scheduling with **mathematically rigorous, multi-criteria workforce assignment recommendations**, paired with an **instant, distraction-free mobile field tool**.

### 1.2 Dual-Interface Operational Model
Workflow is built around two purpose-tailored, collaborative interfaces:

```
┌────────────────────────────────────────────────────────┐
│               MANAGEMENT WEB PORTAL                    │
│   (React + TypeScript + Vite + Tailwind + shadcn/ui)   │
│   Role: Business Owner, Service Manager, Dispatcher    │
│   • Operations command dashboard                       │
│   • WhatsApp/SMS AI customer job importer              │
│   • Multi-criteria worker recommendation engine        │
│   • 1-Click assignment, override reason capture        │
│   • Real-time technician roster & live workload        │
│   • Evidence-based operational & algorithm analytics   │
└──────────────────────────┬─────────────────────────────┘
                           │ Live Firestore Sync /
                           │ Cache-Bypassing Revalidation
┌──────────────────────────┴─────────────────────────────┐
│              MOBILE FIELD APPLICATION                  │
│       (Expo SDK 57 + React Native + Expo Router)       │
│       Role: Field Technician / Service Employee        │
│   • 0ms instant loading via 60s in-memory cache        │
│   • Active assigned jobs & 1-tap status progression    │
│   • On-site blocker / incident reporting               │
│   • 1-tap client calling & native GPS navigation       │
│   • Historical completed work archive & profile stats  │
└────────────────────────────────────────────────────────┘
```

### 1.3 The Industry Problem
Field service dispatching suffers from two opposing operational extremes:
1. **Ad-Hoc Manual Scheduling (The Status Quo):** Managers rely on memory, whiteboard notes, or chaotic WhatsApp group chats. This leads to unbalanced technician workloads (some technicians burn out with 5 active jobs while others sit idle), excessive transit times due to spatial mismatch, missed SLAs, and zero historical tracking of assignment quality.
2. **"Black Box" Autonomous AI Dispatch Systems:** Enterprise dispatch platforms attempt to completely automate assignments using opaque algorithms. When an autonomous system assigns a technician who lacks a specialized certification, has an unspoken customer conflict, or is dealing with vehicle trouble, dispatchers lose trust in the platform and abandon it.

### 1.4 The Workflow Solution
Workflow implements **Human-in-the-Loop Decision Support**:
- **The System Advises; The Human Decides:** The algorithm computes multi-criteria scores, normalizes trade-offs, and presents the single best-matched technician with transparent, natural-language explanation badges.
- **Explicit Override Tracking:** The manager can accept the recommendation with 1 click or override it by choosing an alternative worker. Overrides require a structured reason (e.g., *Customer Request*, *Availability Conflict*, *Manager Preference*), generating continuous organizational intelligence.
- **Bi-Directional Closed Loop:** When a technician is dispatched, their mobile app updates immediately. As they progress (`Assigned` ➔ `In Progress` ➔ `Completed`) or flag on-site blockers, the manager’s web portal reflects status changes in real time.

---

## 2. Detailed Concept & Design Philosophy

### 2.1 The Explainable AI Imperative
In operational workforce management, **explainability is not an afterthought—it is the prerequisite for adoption**. Managers will not click "Assign" if an algorithm simply outputs an arbitrary score of `92%` with no breakdown.

Workflow breaks candidate evaluation down into five distinct, auditable operational dimensions:
1. **Skill Match (Up to 35 pts):** Exact matching of required trade skills (e.g., *AC Repair*, *Compressor Overhaul*, *Leak Detection*) against certified technician profiles.
2. **Availability & Schedule (Up to 25 pts):** Real-time work status (Available, Busy, or On-Leave).
3. **Active Workload Balancing (Up to 20 pts):** Penalizing technicians who currently hold 2, 3, or 4+ concurrent assigned or in-progress jobs to avoid bottlenecks.
4. **Spatial Service Zone Relevance (Up to 15 pts):** Matching job location and service zones (*North Zone*, *South Zone*, *Downtown*, etc.) using an adjacency matrix to minimize transit time.
5. **Historical Completion Reliability (Up to 10 pts):** Verified past completion ratio on assigned tasks.

### 2.2 Mathematical Multi-Criteria Decision Making (MCDM)
Rather than relying on naive, static heuristics, Workflow incorporates **Analytic Hierarchy Process (AHP)** paired with **TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution)**:
- **AHP:** Derives dynamic criteria weights based on job context (e.g., an *Emergency Repair* job heavily weights immediate availability and proximity, whereas a *Commercial Maintenance* job heavily weights advanced trade certifications and historical performance).
- **TOPSIS:** Evaluates candidate technicians as geometric vectors in n-dimensional space, calculates Euclidean distances to both an **Ideal Best Candidate** and an **Ideal Worst Candidate**, and ranks workers based on relative closeness to the ideal solution ($C_i^* \in [0, 1]$).

### 2.3 Ergonomics of the Overlay-First UI
To minimize cognitive fatigue for dispatchers managing dozens of calls per day, the Web Portal avoids disorienting full-page route jumps. All primary creation, inspection, and dispatch workflows take place inside **Universal In-Place Slide-Over Drawers** (`JobDetailsDrawer` and `CreateJobDrawer`) that slide smoothly from the right, maintaining full context of the underlying dashboard or job table.

---

## 3. Current Status: How Much We Built

As of **September 2026**, **all 5 Core Roadmap Phases are fully implemented, end-to-end verified, and operational in the repository**.

```
Roadmap Completion: [========================================] 100% (5/5 Phases)
```

| Phase | Milestone Name | Status | Verified Deliverables |
|:---|:---|:---:|:---|
| **Phase 1** | **Operational Loop** | **COMPLETED** | Complete status lifecycle (`Open` ➔ `Assigned` ➔ `In Progress` ➔ `Completed`), employee status transitions, timestamps, mobile field app baseline. |
| **Phase 2** | **Decision Pipeline** | **COMPLETED** | 3-stage pipeline (`Eligibility Engine` ➔ `Decision Engine` ➔ `Explanation Engine`), Strategy Pattern supporting `Weighted Strategy` (`rule-based-v1`) and `AHP-TOPSIS Strategy` (`ahp-topsis-v1`). |
| **Phase 3** | **Human-in-the-Loop** | **COMPLETED** | 1-Click "Accept" / "Choose Other" override UI, structured override reason dropdown, derived confidence scores (`High`/`Medium`/`Low`), permanent recommendation records in `recommendations` collection. |
| **Phase 4** | **Evidence-Based Evaluation** | **COMPLETED** | Business-facing analytics dashboard (`AnalyticsPage`), AI acceptance rate %, override analytics, SLA compliance, side-by-side algorithm comparison (Weighted vs. AHP-TOPSIS), Likert survey. |
| **Phase 5** | **Configuration Layer** | **COMPLETED** | Org-scoped configuration documents in Firestore (`organizationConfigurations`), dynamic trade skill registries, service sub-types, configurable AHP pairwise comparison profiles. |

### 3.1 Verification & Quality Metrics

```bash
# Web Application Build & Typecheck
apps/web-app: npm run build
> tsc -b && vite build
✓ built in 237ms (Zero TypeScript or bundling errors)

# Mobile Field Application Typecheck
apps/mobile-app: npm run typecheck
> tsc --noEmit
✓ Exit code 0 (Zero type errors)

# Cloud Functions Unit Tests & Conformance Runner
functions: npm run test
✓ 29 of 29 unit tests passing (100% test pass rate)
```

### 3.2 Recent Critical Hardening & Synchronization Fixes
1. **Resilient Date Conversion (`toJsDate`):** Resolved the `job.dueDate.toDate is not a function` crash across web and mobile apps caused by JSON serialization in browser caches. Native Firestore `Timestamp`, serialized `{ seconds, nanoseconds }` objects, ISO strings, and JavaScript `Date` instances are parsed seamlessly.
2. **Spark-Quota-Friendly Smart Revalidation:** To avoid costly Firestore open snapshot listeners on the free Spark tier, the web app listens to window `focus` and `visibilitychange` events, as well as providing 1-click **Refresh** buttons, fetching fresh data with `bypassCache: true` whenever the manager switches back from checking mobile progress.
3. **Field Incident Management:** Enabled mobile employees to report on-site blockers (`customer_unavailable`, `access_denied`, `missing_parts`, etc.), which instantly surface as high-visibility Amber blocker alert banners in the manager's `JobDetailsDrawer` with a 1-click "Mark Resolved" action.

---

## 4. Technology Stack & Tooling

```
                             WORKFLOW TECH STACK
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌────────────────┐           ┌────────────────┐           ┌────────────────┐
│  WEB MANAGEMENT│           │  MOBILE FIELD  │           │   BACKEND &    │
│     PORTAL     │           │  APPLICATION   │           │ CLOUD SERVICES │
├────────────────┤           ├────────────────┤           ├────────────────┤
│ • React 18/19  │           │ • React Native │           │ • Firebase Auth│
│ • TypeScript   │           │ • Expo SDK 57  │           │ • Cloud        │
│ • Vite         │           │ • Expo Router  │           │   Firestore    │
│ • Tailwind CSS │           │ • Carbon/Zinc  │           │ • Firebase     │
│ • shadcn/ui    │           │   Design System│           │   Storage      │
│ • Lucide Icons │           │ • Safe Area    │           │ • Cloud        │
│ • In-Memory    │           │ • Native Map & │           │   Functions    │
│   Cache Layer  │           │   Phone Linking│           │ • Gemini 3.1   │
└────────────────┘           └────────────────┘           └────────────────┘
```

### 4.1 Frontend Web Portal (`apps/web-app`)
- **Core Framework:** [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/) in strict mode.
- **Build Tool:** [Vite](https://vitejs.dev/) for sub-second hot module replacement and optimized production builds.
- **Styling Architecture:** [Tailwind CSS](https://tailwindcss.com/) with a curated, desktop-first neutral palette (Slate/Zinc with Indigo & Emerald accents).
- **UI Components:** Reusable UI components inspired by [shadcn/ui](https://ui.shadcn.com/) (`Button`, `Dialog`, `Badge`, `DropdownMenu`, `Tabs`, `Table`, `Card`, `Drawer`).
- **Icons:** [Lucide React](https://lucide.dev/) for crisp, uniform iconography.
- **Data Fetching & Cache:** Custom service-layer caching (`cacheService.ts`) with configurable TTLs, JSON revivers, and cache-bypass overrides.

### 4.2 Mobile Field App (`apps/mobile-app`)
- **Core Framework:** [React Native](https://reactnative.dev/) (v0.86.3) via [Expo SDK 57](https://expo.dev/) (`~57.0.24`) with React 19.2.
- **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) (`~57.0.22`, file-based navigation with bottom tab layout).
- **Design System:** Bespoke "Carbon & Zinc" high-contrast theme (`#18181b` dark surfaces, `#fafafa` cards, `#16a34a` Emerald accent) engineered specifically for outdoor visibility and single-thumb ergonomics.
- **Device Capabilities:** Native phone calling (`Linking.openURL('tel:...')`) and native Apple Maps / Google Maps GPS routing (`geo:` / `maps:` URI schemes).
- **Performance:** In-memory 60s cache with optimistic updates in `FirestoreJobRepository`, delivering instant 0ms screen transitions.

### 4.3 Backend & Cloud Infrastructure (`firebase/`, `functions/`)
- **Identity & Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth) with email/password authentication and Firestore-backed user profiles enforcing Role-Based Access Control (RBAC).
- **Database:** [Cloud Firestore](https://firebase.google.com/docs/firestore) NoSQL document store with composite indexing (`firestore.indexes.json`) and tenant-isolated security rules (`firestore.rules`).
- **Serverless Compute:** [Firebase Cloud Functions](https://firebase.google.com/docs/functions) (Node.js 20, TypeScript) handling trusted server-side tasks (Operations Intelligence, Action Proposal execution, AI classification).
- **Generative AI Provider:** [Google Gemini 3.1 Flash Lite](https://ai.google.dev/) via server-side Google Gen AI SDK, protected behind Firebase Secrets (`GEMINI_API_KEY`) for WhatsApp customer text extraction and intent classification.
- **Development & Testing:** Firebase Local Emulator Suite (Emulators for Auth, Firestore, and Functions).

---

## 5. Implementation Roadmap & Phases

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    5-PHASE CORE IMPLEMENTATION ROADMAP                     │
└────────────────────────────────────────────────────────────────────────────┘
  Phase 1: Operational Loop ───────────────────────────────────► [COMPLETED]
  Phase 2: Decision Pipeline ──────────────────────────────────► [COMPLETED]
  Phase 3: Human-in-the-Loop & Recommendation Persistence ────► [COMPLETED]
  Phase 4: Evidence-Based Evaluation ─────────────────────────► [COMPLETED]
  Phase 5: Configuration Layer ───────────────────────────────► [COMPLETED]
```

### Phase 1 — Complete the Operational Loop
- **Objective:** Establish the minimal end-to-end operational lifecycle so real completion data flows through the system.
- **Deliverables:**
  - Standardized job status progression: `Open` ➔ `Assigned` ➔ `In Progress` ➔ `Completed` (with optional `reopen`).
  - Mobile field application foundation enabling assigned technicians to view jobs, start work, and complete work.
  - Automatic timestamp capture (`assignedAt`, `startedAt`, `completedAt`) unlocking true cycle-time analytics.

### Phase 2 — Formalize the Decision Pipeline
- **Objective:** Create a multi-stage, modular recommendation pipeline separating filtering, scoring, and explanation.
- **Deliverables:**
  - **Stage 1 (Eligibility Engine):** Hard-constraint candidate filtering (active user, role `employee`, `!onLeave`, tenant isolation).
  - **Stage 2 (Decision Engine Abstraction):** Strategy Pattern supporting multiple algorithmic backends.
  - **Strategy A (Weighted Strategy):** Baseline additive score model (`rule-based-v1`).
  - **Strategy B (AHP-TOPSIS Strategy):** Multi-Criteria Decision Making model deriving criteria weights via AHP pairwise matrices and ranking via TOPSIS Euclidean distance (`ahp-topsis-v1`).

### Phase 3 — Human-in-the-Loop & Recommendation Persistence
- **Objective:** Put dispatchers firmly in control while permanently recording decisions for system accountability.
- **Deliverables:**
  - Hero Card UI in `JobDetailsDrawer` featuring 1-click "Accept [Worker Name]" vs. "Choose Other".
  - Structured Override Reason dropdown (`Customer Request`, `Availability Conflict`, `Manager Preference`, `Other`).
  - Derived Confidence Scores (`High` $\ge 0.80$, `Medium` $0.60 - 0.79$, `Low` $< 0.60$) with an automatic "Manual Review Recommended" flag on low-confidence matches.
  - Permanent recommendation persistence in Firestore `recommendations` collection.

### Phase 4 — Evidence-Based Evaluation
- **Objective:** Provide non-technical dispatchers and academic evaluators with quantitative proof of system performance.
- **Deliverables:**
  - Standalone `AnalyticsPage` divided into two role-gated tabs:
    - **Manager Operational KPIs:** Match Acceptance %, Override %, SLA Compliance %, Average Dispatch & Completion times.
    - **Academic Research Benchmarks (Admin-Gated):** Side-by-side comparison of Weighted vs. AHP-TOPSIS algorithms, distribution curves, and 5-point Likert scale explainability surveys.

### Phase 5 — Configuration Layer
- **Objective:** Allow organizations to customize skills, service types, and algorithmic criteria weights without code modifications.
- **Deliverables:**
  - Org-scoped configuration documents in Firestore (`organizationConfigurations` collection).
  - Configurable trade skills (e.g., HVAC, Plumbing, Electrical).
  - Service sub-type AHP weight profiles (e.g., "Emergency Repair" prioritizing speed vs. "Commercial Maintenance" prioritizing certifications).

### Explicitly Parked / Future Out-of-Scope Horizons
To preserve MVP focus and maintain strict architectural stability, the following items are intentionally parked:
- *Autonomous Dispatch without Manager Oversight* (Strictly prohibited).
- *Automatic Dynamic ML Weight Retraining* (Deterministic models preserved).
- *Mobile Photo Work Proof Upload* (Deferred).
- *Customer-Facing Push Notifications* (Deferred).
- *Live GPS Route Navigation & Vehicle Telematics* (Deferred).

---

## 6. System & Software Architecture

### 6.1 System Architecture Diagram

```
                              ┌───────────────────────────────────┐
                              │       End Users / Clients         │
                              └─────────┬───────────────┬─────────┘
                                        │               │
                     Web Browser (HTTPS)│               │Mobile App (Expo)
                                        ▼               ▼
                        ┌───────────────────┐   ┌───────────────────┐
                        │  Web App Shell    │   │  Mobile Field App │
                        │  (Admin/Manager)  │   │    (Technician)   │
                        └─────────┬─────────┘   └─────────┬─────────┘
                                  │                       │
                                  ▼                       ▼
                        ┌───────────────────┐   ┌───────────────────┐
                        │   Web Services    │   │  Mobile Services  │
                        │ (jobs, recs, etc.)│   │ (useAssignedJobs) │
                        └─────────┬─────────┘   └─────────┬─────────┘
                                  │                       │
                                  └───────────┬───────────┘
                                              │
                                              ▼
                        ┌───────────────────────────────────────────┐
                        │         Firebase Security Boundary        │
                        │    (Auth Tokens, RBAC, Tenant Rules)      │
                        └─────────────┬───────────────┬─────────────┘
                                      │               │
                   Direct SDK Reads & │               │ Trusted Callables
                   Mutations (Rules)  │               │ (Functions)
                                      ▼               ▼
                        ┌───────────────────┐   ┌───────────────────┐
                        │  Cloud Firestore  │   │  Cloud Functions  │
                        │  (10 Collections) │   │  • AI Coordinator │
                        └───────────────────┘   │  • Action Proposal│
                                                │  • WhatsApp Parser│
                                                └─────────┬─────────┘
                                                          │
                                                          ▼
                                                ┌───────────────────┐
                                                │ Google Gemini API │
                                                │ (3.1 Flash Lite)  │
                                                └───────────────────┘
```

### 6.2 Multi-Tenant Data Isolation
Tenant isolation is strictly enforced at every level of the platform:
- Every business entity (jobs, users, recommendations, incidents, activities, audit logs, configurations) stores an immutable `organizationId`.
- The user's active profile in Firestore (`users/{uid}`) contains their verified `organizationId`.
- Cloud Firestore Security Rules (`firebase/firestore.rules`) validate that `request.auth != null` and require `resource.data.organizationId == request.auth.token.organizationId` (or matching verified user profile data). Cross-tenant data leakage is impossible at the database engine level.

### 6.3 Role-Based Access Control (RBAC) Matrix

| User Role | Target Client | Dashboard & Jobs | Create/Assign Jobs | Incident Resolution | Analytics & Benchmarks | Mobile Field View |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Admin** | Web Portal | Full Access | Full Access | Full Access | Full Access (Inc. Academic) | Blocked from Portal |
| **Manager** | Web Portal | Full Access | Full Access | Full Access | Manager KPIs Only | Blocked from Portal |
| **Employee** | Mobile App | Blocked | Blocked | Blocked | Blocked | Full Mobile Access |

### 6.4 Service Layer Architectural Pattern
UI components **never** communicate directly with Cloud Firestore or execute business scoring logic. All interactions flow through strongly typed, modular services located in `apps/web-app/src/services/`:
- `jobService.ts`: Job creation, lifecycle mutations, filtering, and assignment.
- `assignmentRecommendationService.ts`: Recommendation generation, decision tracking, and override capture.
- `incidentService.ts`: Field blocker query and resolution.
- `organizationConfigService.ts`: Org-scoped configuration documents.
- `actionProposalService.ts`: Immutable 2-phase commit proposals.
- `dashboardService.ts`: High-level operational metrics and attention feeds.
- `cacheService.ts`: Local session caching with custom date revivers.

### 6.5 Approved Cloud Firestore Collections

```
Cloud Firestore (Tenant-Isolated via organizationId)
├── organizations              # Business profiles & operational settings
├── users                      # Profiles, roles (admin/manager/employee), skills
├── jobs                       # Core work orders, requirements, status, assignments
├── recommendations            # Permanent records of AI suggestions & manager decisions
├── incidents                  # On-site blocker reports raised by field technicians
├── jobActivities              # Granular audit timeline events for each job
├── actionProposals            # 2-phase commit queue for AI-drafted job mutations
├── organizationConfigurations # Custom trade skills, sub-types, and AHP profiles
├── notifications              # System and user notification dispatch records
└── auditLogs                  # Security, auth, and operational audit trail
```

---

## 7. Comprehensive Features Deep Dive

### 7.1 Web Management Portal (`apps/web-app`)

#### 1. Operations Command Center (`/dashboard` or `/`)
- **Top Metric Strip:** Live counts for `Needs Assignment`, `Active Field Work`, and `Completed Today`.
- **Action Needed Feed:** Instant alert banners for overdue service calls and urgent unassigned jobs.
- **Technician Workload Snapshot:** Real-time distribution showing active job counts per technician to avoid bottlenecking.
- **Pending Assignments Queue:** High-priority open jobs awaiting dispatch with 1-click drawer inspection.
- **Smart Revalidation:** Auto-refreshes data when window regains focus, plus 1-click manual "Refresh" icon.

#### 2. Jobs Workspace (`/jobs`)
- **Unified Search Bar:** Instant filtering across job title, customer name, phone number, and service address.
- **Quick Status Tabs:** `All Jobs`, `Needs Assignment` (Open), `Active` (Assigned & In Progress), and `Completed`.
- **Secondary Filters Popover:** Filter by Priority (`Urgent`, `High`, `Medium`, `Low`), Trade Skill, and Creator.
- **Resolved Technician Badge:** Instantly see `Assigned to: Rahul Sharma` without opening detail views.

#### 3. Overlay Drawer 1: Job Details & AI Recommendation (`JobDetailsDrawer`)
- **Hero Card (Up Front):**
  - Displays top candidate's name (e.g., **Rahul Sharma**) and confidence pill (`High Match Confidence`).
  - Leading plain-English summary: *"Matches required trade skills (AC Repair) and is available immediately."*
  - **Primary Action:** `⚡ Assign Rahul Sharma` (1-Click).
  - **Secondary Action:** `Choose Other` (Opens structured override dropdown).
- **Progressive Disclosure (`Why this recommendation?`):**
  - Collapsed by default to prevent cognitive overload.
  - Expands to reveal exact numeric match score (e.g. `88% Match Score`) and specific criteria bullet points.
- **Active Blocker Banner:** If the mobile technician flagged an on-site incident, a prominent Amber banner appears with the blocker reason and a 1-click **"Mark Resolved"** action.
- **Activity Timeline:** Complete chronological history of creation, dispatch, mobile starts, and completions.

#### 4. Overlay Drawer 2: Job Creation & WhatsApp AI Importer (`CreateJobDrawer`)
- **AI Customer Request Importer:** A dedicated text box where managers can paste raw, unstructured customer messages from WhatsApp, SMS, or Email.
- **1-Click Auto-Fill:** Generates structured fields (Title, Description, Customer Name, Phone, Service Address, Priority, Trade Skills, Due Date).
- **Manual Form Controls:** Full manual entry and editing capabilities before saving.

#### 5. Team Roster Workspace (`/team`)
- **Staff Summary:** Total technicians, available staff count, and quick CSV export.
- **Technician Cards:** Shows live availability dot (🟢 `Available`, 🔵 `Busy`, 🟡 `On Leave`), active workload count (`0 Active`, `2 Active`), and certified skill pills.
- **Direct Scheduling:** 1-click **Schedule** button pre-configures a new job drawer for that technician.

#### 6. Reports & Intelligence Workspace (`/analytics`)
- **Manager Operational KPIs:**
  - AI Recommendation Acceptance Rate % vs. Override Rate %.
  - Top Override Reasons Breakdown chart.
  - SLA Compliance % and Average Dispatch Speed.
  - Average Job Completion Times.
- **Academic Research Benchmarks (Admin-Gated):**
  - Side-by-side comparison of `Weighted Strategy` vs. `AHP-TOPSIS Strategy`.
  - Recommendation latency and system performance benchmarks.
  - Interactive 5-point Likert explainability survey on trust, clarity, and helpfulness.

---

### 7.2 Mobile Field Application (`apps/mobile-app`)

#### 1. "Carbon & Zinc" Minimalist Ergonomics
Designed specifically for outdoor service environments:
- High contrast, dark neutral palette (`#18181b` canvas, `#fafafa` text).
- Single accent color: Refined Emerald (`#16a34a`) for active tasks and primary actions.
- Zero distracting animations or decorative gradients.

#### 2. Three-Tab Bottom Navigation
1. **Jobs Tab:**
   - Active work list with filter pills (`All`, `Assigned`, `In Progress`).
   - Pull-to-refresh for instant sync.
   - Status transitions with visual feedback:
     - Open job ➔ Tap **"Start Job"** (status moves to `in_progress`).
     - Active job ➔ Tap **"Complete Job"** (status moves to `completed` and moves to History).
2. **History Tab:**
   - Archive of all past completed jobs.
   - Summary strip showing daily completed counts and formatted completion dates.
3. **Profile Tab:**
   - Technician identity card, role, registered phone, and certified skills pills.
   - Lifetime completed jobs count and active job status.
   - Secure sign-out action.

#### 3. Field Ergonomics & Blocker Reporting
- **1-Tap Phone Calling:** Direct `tel:` link dials the customer immediately.
- **1-Tap Native GPS Navigation:** Opens Apple Maps or Google Maps with pre-filled service address coordinates.
- **On-Site Blocker / Incident Reporting:** Technicians can flag why a job cannot proceed by tapping **"Report Blocker"** and selecting:
  - `customer_unavailable`
  - `access_denied`
  - `missing_parts`
  - `safety_hazard`
  - `scope_mismatch`
  - `other`
  This instantly notifies the dispatcher in the web portal drawer.

---

## 8. End-to-End Operational Lifecycle & Working

The following sequence diagram and walkthrough trace a job from initial customer contact to completed archival:

```
[CUSTOMER]          [MANAGER WEB PORTAL]             [FIRESTORE]             [FIELD MOBILE APP]
    │                        │                            │                           │
    │ 1. WhatsApp Message    │                            │                           │
    │───────────────────────>│                            │                           │
    │                        │ 2. Paste & AI Auto-Fill    │                           │
    │                        │ 3. Save Job                │                           │
    │                        │───────────────────────────>│                           │
    │                        │                            │ (Status: 'open')          │
    │                        │ 4. Open Job Drawer         │                           │
    │                        │    • Runs Stage 1-3 AI     │                           │
    │                        │    • Displays "Rahul"      │                           │
    │                        │ 5. Tap "Assign Rahul"      │                           │
    │                        │───────────────────────────>│                           │
    │                        │                            │ (Status: 'assigned')      │
    │                        │                            │ (assignedEmployeeIds:[R]) │
    │                        │                            │                           │
    │                        │                            │ 6. Pull / Auto-Sync       │
    │                        │                            │──────────────────────────>│
    │                        │                            │                           │ 7. Tap "Start Job"
    │                        │                            │<──────────────────────────│
    │                        │                            │ (Status: 'in_progress')   │
    │                        │                            │                           │
    │                        │                            │ 8. (Optional) Report Blocker
    │                        │                            │<──────────────────────────│
    │                        │ 9. Blocker Alert Appears   │ (Incident created)        │
    │                        │    • Manager Resolves      │                           │
    │                        │───────────────────────────>│                           │
    │                        │                            │                           │ 10. Tap "Complete Job"
    │                        │                            │<──────────────────────────│
    │                        │                            │ (Status: 'completed')     │
    │                        │                            │ (completedAt: timestamp)  │
    │                        │ 11. Window Focus / Refresh │                           │
    │                        │<───────────────────────────│                           │
    │                        │ (Dashboard KPIs updated)   │                           │
```

### Step-by-Step Lifecycle Walkthrough:
1. **Intake & AI Drafting:** A customer messages *"My AC is leaking water in Downtown, please send someone today."* The dispatcher opens `CreateJobDrawer`, pastes the message into the AI Customer Request Importer, and clicks **Auto-Fill**. The system extracts the title, address, priority, and required trade skills (`AC Repair`).
2. **Job Persistence:** The manager verifies details and clicks **Create Job**. The job is written to `jobs` collection with status `open`.
3. **Recommendation Generation:** The manager opens `JobDetailsDrawer`. The 3-stage Decision Pipeline executes:
   - *Eligibility Engine:* Filters out technicians on leave or in other organizations.
   - *Decision Engine (AHP-TOPSIS):* Evaluates eligible technicians across Skills, Availability, Workload, Location Zone, and Performance.
   - *Explanation Engine:* Highlights Rahul Sharma with an 88% match score and High Confidence badge.
4. **Dispatch Decision:** The manager clicks **⚡ Assign Rahul Sharma**. A permanent record is written to `recommendations`, the job status transitions to `assigned`, and an audit event is logged.
5. **Mobile Notification & Start:** Rahul opens his mobile app. The job appears at the top of his **Jobs Tab**. Upon arriving on site, Rahul taps **Start Job**, transitioning status to `in_progress`.
6. **Blocker Management (Optional):** If the customer is not home, Rahul taps **Report Blocker** (`customer_unavailable`). An Amber alert immediately appears in the manager's drawer. The manager calls the customer, resolves the gate code issue, and clicks **Mark Resolved**.
7. **Job Completion & Sync:** Rahul finishes the repair and taps **Complete Job**. The job transitions to `completed` with a verified `completedAt` timestamp and moves to his **History Tab**.
8. **Automated KPI Sync:** When the manager returns to the Web Portal, the smart revalidation listener detects window focus, bypasses stale caches, and updates the dashboard metrics and SLA reports instantly.

---

## 9. AI & Decision Support Engine (Technical Deep Dive)

The core scientific innovation of Workflow is its **Explainable Decision Pipeline**, implemented across `shared/assignmentRecommendation.ts` and `apps/web-app/src/services/recommendations/assignmentRecommendationService.ts`.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   3-STAGE DECISION SUPPORT PIPELINE                    │
└────────────────────────────────────────────────────────────────────────┘

  [ Candidate Pool ] 
          │
          ▼
┌───────────────────────────────────┐
│   STAGE 1: ELIGIBILITY ENGINE     │  • Active profile check (isActive == true)
│       (Hard Constraints)          │  • Role check (role === 'employee')
└─────────────────┬─────────────────┘  • Leave status check (!onLeave)
                  │                    • Strict Tenant Isolation (organizationId)
                  ▼
┌───────────────────────────────────┐
│    STAGE 2: DECISION ENGINE       │  • Strategy Pattern Abstraction
│        (Ranking Engine)           │  • Strategy A: Weighted Sum (rule-based-v1)
└─────────────────┬─────────────────┘  • Strategy B: AHP-TOPSIS (ahp-topsis-v1)
                  │
                  ▼
┌───────────────────────────────────┐
│   STAGE 3: EXPLANATION ENGINE     │  • Grounded explanation badges
│        (Human Trust Layer)        │  • TOPSIS Confidence Score (High / Med / Low)
└─────────────────┬─────────────────┘  • "Manual Review Recommended" threshold
                  │
                  ▼
         [ Top 5 Ranked Recommendations with Rationale ]
```

### 9.1 Stage 1: Eligibility Engine (Hard Constraints)
Before mathematical scoring begins, candidates must pass binary feasibility filters (`isEligibleRecommendationEmployee`):
```typescript
export function isEligibleRecommendationEmployee(employee: RecommendationEmployee): boolean {
  const availability = employee.availability.toLowerCase();
  return (
    employee.role === 'employee' &&
    !employee.isUnavailable &&
    availability !== 'leave'
  );
}
```
Non-eligible workers are strictly excluded from the scoring matrix to avoid wasting computational cycles.

---

### 9.2 Stage 2: Decision Engine (Ranking Strategies)

#### Strategy 1: Weighted Additive Model (`rule-based-v1`)
The baseline strategy computes a linear sum across 5 operational criteria:
$$\text{Total Score} = S_{\text{skill}} + S_{\text{availability}} + S_{\text{workload}} + S_{\text{location}} + S_{\text{performance}}$$
- **Skill Match ($S_{\text{skill}}$):** Up to 35 points ($\frac{\text{matchedSkills}}{\text{requiredSkills}} \times 35$).
- **Availability ($S_{\text{availability}}$):** Available = 25 pts, Busy = 12 pts, Unknown = 0 pts.
- **Active Workload ($S_{\text{workload}}$):** 0 active jobs = 20 pts, 1 job = 16 pts, 2 jobs = 12 pts, 3 jobs = 8 pts, 4+ jobs = 4/0 pts.
- **Location Relevance ($S_{\text{location}}$):** Exact service zone match = 15 pts, Adjacent zone = 8 pts, Distant zone = 3 pts.
- **Historical Performance ($S_{\text{performance}}$):** Completion ratio $\times 10$ pts.

---

#### Strategy 2: AHP-TOPSIS Multi-Criteria Engine (`ahp-topsis-v1`)
This strategy combines two established operational research methodologies:

##### Step A: Analytic Hierarchy Process (AHP) Weight Derivation
Rather than hardcoding arbitrary weights, AHP constructs pairwise comparison matrices between criteria ($C_1, \dots, C_5$) using Saaty's 1–9 preference scale. Weights are dynamically selected based on the job's service sub-type profile:

| Profile Name | Skill Weight | Availability Weight | Workload Weight | Location Weight | Performance Weight | Operational Focus |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **Standard** | 0.35 | 0.25 | 0.15 | 0.15 | 0.10 | Balanced operations |
| **Emergency Repair** | 0.25 | **0.35** | 0.10 | **0.25** | 0.05 | Immediate speed & proximity |
| **Commercial Maint.** | **0.40** | 0.15 | 0.10 | 0.15 | **0.20** | Deep certification & history |

##### Step B: TOPSIS Vector Normalization & Ideal Solutions
1. **Raw Feature Vector:** Each candidate $i$ is represented as a normalized feature vector:
   $$\mathbf{x}_i = \left[ \frac{\text{skill}}{35}, \frac{\text{avail}}{25}, \frac{\text{workload}}{20}, \frac{\text{loc}}{15}, \frac{\text{perf}}{10} \right]$$
2. **Vector Normalization ($r_{ij}$):**
   $$r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^{m} x_{kj}^2}}$$
3. **Weighted Normalization ($v_{ij}$):**
   $$v_{ij} = r_{ij} \times w_j$$
4. **Ideal Best ($A^+$) and Ideal Worst ($A^-$) Solutions:**
   $$A^+ = \{ \max_i(v_{i1}), \max_i(v_{i2}), \dots, \max_i(v_{in}) \}$$
   $$A^- = \{ \min_i(v_{i1}), \min_i(v_{i2}), \dots, \min_i(v_{in}) \}$$
5. **Euclidean Distance & Relative Closeness ($C_i^*$):**
   $$S_i^+ = \sqrt{\sum_{j=1}^n (v_{ij} - v_j^+)^2}, \quad S_i^- = \sqrt{\sum_{j=1}^n (v_{ij} - v_j^-)^2}$$
   $$C_i^* = \frac{S_i^-}{S_i^+ + S_i^-} \quad (C_i^* \in [0, 1])$$
Candidates are ranked in descending order of their relative closeness score $C_i^*$.

---

### 9.3 Stage 3: Explanation Engine & Confidence Scoring
Every candidate recommendation is accompanied by an audit-ready confidence assessment:
- **High Confidence ($\ge 0.80$):** Emerald badge. Strong fit across all dimensions.
- **Medium Confidence ($0.60 - 0.79$):** Neutral/Blue badge. Solid candidate with minor trade-offs.
- **Low Confidence ($< 0.60$):** Amber alert badge. Automatically triggers a **"Manual Review Recommended"** UI alert, advising the dispatcher to verify availability or consider external contractors.

### 9.4 Spatial Service Zone & Adjacency Matrix
Workflow models urban dispatch geography through structured service zones and a bidirectional adjacency graph (`ZONE_ADJACENCY`):
```typescript
export const ZONE_ADJACENCY: Record<string, string[]> = {
  'Downtown':   ['North Zone', 'South Zone', 'East Zone', 'West Zone'],
  'North Zone': ['Downtown', 'East Zone', 'West Zone'],
  'South Zone': ['Downtown', 'East Zone', 'West Zone'],
  'East Zone':  ['Downtown', 'North Zone', 'South Zone'],
  'West Zone':  ['Downtown', 'North Zone', 'South Zone'],
};
```
Technicians located in an adjacent zone receive 8 points, while technicians in distant zones receive 3 points.

---

### 9.5 AI Customer Request Importer & Natural Language Processing
- Implemented in `apps/web-app/src/services/ai/jobUnderstandingService.ts` and supported by Cloud Functions.
- Powered by **Google Gemini 3.1 Flash Lite** using a server-side JSON schema parser.
- Extracts messy customer text into a structured draft contract (`JobDraft`):
  - `title`, `description`, `customerName`, `customerPhone`, `serviceAddress`, `priority`, `requiredSkills`, and normalized `dueDate`.
- **Fail-Safe Operation:** If parsing is ambiguous, fields default to `null` with explicit warning flags; the system never makes assumptions or writes directly to the database.

---

### 9.6 Multi-Agent Coordinator & Action Proposal Ledger
For complex operational queries and assisted dispatching, Workflow specifies a **Coordinator-and-Specialists** multi-agent architecture (`docs/project-knowledge-base/02-architecture/09_Multi_Agent_AI_Architecture.md`):

```
User Query / Command
       │
       ▼
┌───────────────────────────┐
│     AI Coordinator        │  • Deterministic regex routing first
│ (workflowCoordinator.ts)  │  • Gemini intent classifier fallback
└──────────────┬────────────┘
               │
       ┌───────┴────────────────────────┬────────────────────────┐
       ▼                                ▼                        ▼
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│   Job Intelligence Agent  │  │ Workforce Intelligence Agt│  │ Operations Intelligence   │
│ • WhatsApp draft parsing  │  │ • Runs AHP-TOPSIS engine  │  │ • Urgent unassigned jobs  │
│ • Field extraction        │  │ • Ranks candidates        │  │ • Workload distribution   │
└──────────────┬────────────┘  └───────────────────────────┘  └───────────────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────┐
│            Action Proposal Ledger (2-Phase Commit)        │
│          • Stores immutable proposal in actionProposals   │
│          • Requires explicit manager confirmation in UI   │
│          • Re-validates auth, tenant, and version         │
│          • Callable executes mutation once & logs audit   │
└───────────────────────────────────────────────────────────┘
```

**Zero Autonomous Mutation Rule:** AI agents are strictly prohibited from writing directly to `jobs` or updating assignments. Any write must take the form of an **Action Proposal** (`actionProposals` collection) that expires after 5 minutes and requires an explicit manager button click to execute.

---

## 10. Defensive Architecture, Reliability & Failure Recovery

### 10.1 Failure-Mode & Recovery Matrix

| Scenario | Trigger / Failure Point | User Experience | Self-Correction / Recovery Path |
|:---|:---|:---|:---|
| **AI Parsing Failure** | Pasted customer message is incomplete or gibberish | Amber alert: *"Partial request imported. Verify highlighted details."* | Populates valid fields; highlights missing required inputs in red for 1-click manual entry. |
| **No Eligible Technicians** | All workers are busy, on leave, or lack certifications | Amber card: *"⚠️ No Available Technician Found"* | Drawer displays manual assignment dropdown allowing manager to assign any staff member. |
| **Concurrent Dispatch Conflict** | Two managers assign the same job at the same instant | Error toast: *"This job was modified by another manager."* | Firestore atomic transaction aborts second write; drawer automatically revalidates fresh state. |
| **Network Loss in the Field** | Mobile technician enters a dead zone (basement/elevator) | UI indicates offline cache; actions queue locally | Optimistic UI updates ensure zero workflow interruption; actions sync once connectivity returns. |
| **Date Serialization Issue** | Browser `sessionStorage` deserializes plain JSON date objects | Handled transparently by `toJsDate()` | Universal date parser reconstructs genuine timestamps, preventing `.toDate()` runtime crashes. |

### 10.2 Absolute Secrets Protection & Spark Quota Safety
1. **Zero Frontend Secrets:** No Firebase Admin keys, service accounts, or Gemini API keys exist in client bundles or repositories. All AI operations occur via secured Firebase Cloud Functions.
2. **Quota-Conscious Polling:** Rather than maintaining hundreds of open, real-time Firestore WebSocket listeners (which rapidly exhaust Firebase Spark quotas), Workflow utilizes **smart revalidation on window focus** and explicit user refresh triggers.

---

## 11. Summary & Future Horizon

### 11.1 Project Summary
Workflow transforms field workforce operations from a chaotic, reactive guesswork model into a **transparent, auditable, and mathematically grounded operational discipline**. 

By combining:
- The **pragmatic simplicity of React & Expo**
- The **mathematical rigor of AHP-TOPSIS multi-criteria decision making**
- The **safety of Human-in-the-Loop oversight**
- The **clarity of progressive disclosure ergonomics**

Workflow proves that modern AI in field operations is most effective not when it attempts to replace human dispatchers, but when it empowers them with explainable, high-trust decision intelligence.

### 11.2 Future Horizon (Post-MVP)
- **Grounded Knowledge Assistant (RAG):** Grounding technician troubleshooting queries against verified equipment PDF repair manuals using vector embeddings.
- **Mobile Photo Work Proof:** Enabling field technicians to snap before/after photos with automatic timestamp and geolocation watermarks.
- **Predictive Scheduling & Travel Optimization:** Real-time traffic integration for dynamic travel time estimations.

---

*Document maintained by the Workflow Core Engineering Team. Cross-referenced against `PROJECT_MEMORY.md`, `IMPLEMENTATION_ROADMAP.md`, and `docs/project-knowledge-base/`.*
