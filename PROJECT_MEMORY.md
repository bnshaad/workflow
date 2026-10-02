# Workflow Project Memory

**Last Verified:** 2026-10-02  
**Verification Status:** Build (`npm run build`), Lint (`npm run lint`), and Functions Test Suite (30/30 tests) fully passing.

---

# PART I: STATIC INVARIANTS

These rules and architectural foundations are non-negotiable and remain constant across all phases. Codex and paired agents must treat this section as immutable constraints.

## 1. Project Identity & Governance

Workflow is an **Explainable AI Decision Support Platform for Field Operations** tailored for service businesses (starting with HVAC/electronics maintenance). The system comprises two applications:

- **Web Management Portal** (`apps/web-app`): Desktop-first portal for Admin and Manager users to oversee operations, triage jobs, smart-match technicians, review AI-drafted jobs, and analyze performance.
- **Mobile Field Application** (`apps/mobile-app`): Minimalist, zero-lag application for Employee (technician) users to track assigned work, execute lifecycle transitions, and report on-site blockers.

Workflow is strictly designed for implementation according to approved plans, not ad-hoc product decisions. Agents must never invent features, alter database architectures, or redesign approved layouts.

## 2. Source-of-Truth Hierarchy

When requirements or documentation conflict, always resolve them in this strict order:

1. `docs/project-knowledge-base/` (Business logic, architecture, database schemas, product specification)
2. `docs/design-assets/` (Design tokens, component styling, approved screen layouts)
3. Existing working source code in the repository

Never bypass higher-priority sources of truth.

## 3. Architectural Invariants & Tech Stack Boundaries

### Frontend
- **Web Portal**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui-style primitives, Lucide React.
- **Mobile Field App**: React Native 0.86.3, Expo SDK 57, Expo Router, TypeScript.
- **Theme**: Clean Light theme for web; Carbon & Zinc with Emerald accent (`#16a34a`) for mobile. Zero decorative gradients or unapproved animations.

### Backend & Cloud Infrastructure
- **Firebase Authentication**: User identity and session tokens.
- **Cloud Firestore**: Primary transactional and document database.
- **Firebase Storage**: Asset and file storage.
- **Cloud Functions for Firebase (v2, asia-south1)**: Deployed on the **Firebase Blaze plan** for trusted server-side mutations, Gemini AI callables, and atomic transactions.
- **Service Layer Pattern**: Client UI components never query Firestore or external services directly. All interactions flow through typed service modules in `apps/web-app/src/services/`.

### Prohibited Additions
Never introduce:
- Custom Node.js/Express/Flask backends outside Firebase Functions.
- State management libraries like Redux, Zustand, or MobX (use React hooks + lightweight context).
- Unapproved external AI APIs or client-side SDKs.
- Autonomous dispatch systems (human-in-the-loop oversight is strictly enforced).
- Automatic model retraining or online reinforcement learning.

## 4. Approved Collections & Tenant Isolation Rules

### Approved Top-Level Firestore Collections
Only the following 10 top-level collections are permitted:
1. `organizations` — Tenant metadata and settings.
2. `users` — User profiles, roles, availability, and skills.
3. `jobs` — Field jobs and work orders.
4. `recommendations` — Immutable audit records of smart-match scoring and manager decisions.
5. `incidents` — Field blocker and issue reports submitted by technicians or managers.
6. `notifications` — System notifications (currently deny-all in rules; deferred).
7. `auditLogs` — Tenant-isolated tamper-evident operational logs.
8. `jobActivities` — Chronological lifecycle transition records for jobs.
9. `actionProposals` — Structured, manager-confirmed proposals for sensitive actions.
10. `organizationConfigurations` — Scoped trade skills, job categories, and AHP weight profiles.

### Mandatory Document Constraints
Every business document in Firestore must include:
- `organizationId` (string) — Enforcing tenant boundary.
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `isActive` (boolean)

Tenant isolation is absolute. Security rules enforce that `request.auth.uid` has an active profile belonging to `resource.data.organizationId`.

## 5. Absolute Security & Secrets Rules

- **Zero API Keys in Client Code**: No API keys, secret tokens, or private keys may ever be stored in frontend source code, client environment variables (`VITE_*`), local storage, session storage, or git commits.
- **Secret Manager for AI**: Gemini AI integration runs strictly within Cloud Functions and accesses the API key via Google Cloud Secret Manager (`defineSecret('GEMINI_API_KEY')`).
- **Client Fallback Safety**: If Cloud Functions or external AI services are unavailable, the client utilizes an explicit local heuristic/pattern-matching stub (`jobUnderstandingService.ts`) tagged with `development-stub`.

## 6. Business Terminology & Translation Rules

Maintain strict consistency between UI language and internal database schemas:

| UI / Business Term | Internal Code / Database Entity |
| :--- | :--- |
| **Jobs** | `jobs` collection (legacy reference: `tasks`) |
| **Team / Technicians** | `users` collection with `role: 'employee'` |
| **Smart Match / Recommendation** | `recommendations` collection / `AssignmentRecommendationService` |
| **Blocker / Issue** | `incidents` collection / `incidentService` |
| **Activity Timeline** | `jobActivities` collection |
| **Proposals** | `actionProposals` collection |
| **Business / Org** | `organizations` collection / `organizationId` |

---

# PART II: CURRENT SYSTEM STATUS & ARCHITECTURE

## 7. Current Deployed Architecture & Runtime Boundaries

### Deployed Services
- **Web Management Portal**: Fully functional React Vite SPA deployed and operating against Firebase Auth, Firestore, and callable Cloud Functions.
- **Mobile Field App**: Standalone Expo application with local repository caching (60s TTL) and offline resilience.
- **Cloud Functions (`functions/src/index.ts`)**: Deployed to `asia-south1` on the Firebase Blaze plan:
  - `confirmCreateJobProposal`: Atomic, trusted confirmation and creation of jobs from approved action proposals.
  - `getWorkforceRecommendation`: Server-side execution of candidate ranking pipeline.
  - `getOperationsInsight`: Server-side operational metrics and telemetry summarization.
  - `classifyCoordinatorIntent`: Gemini 2.5/Flash-backed intent classifier using Secret Manager.
  - `draftJobFromRequest`: Gemini-backed natural language job drafting from customer emails/messages.
- **Security Rules (`firebase/firestore.rules`)**:
  - Live and enforced across all collections.
  - Tenant isolation and role-based permissions (`admin`, `manager`, `employee`).
  - Strict field validation on job status changes and assignment diffs.
  - `incidents` collection active: allows assigned technicians to create blockers and managers to read/resolve them.
  - `notifications` collection currently denies all reads/writes.

## 8. Implemented Features & Modules

### Web Management Portal (`apps/web-app`)
- **App Shell & Routing**: Protected routes for Admin and Manager roles. Desktop-first, non-collapsing layout with top header and unified sidebar.
- **Dashboard**: Daily operational command center featuring live metric cards, "Action Needed" alerts, active blocker banners, technician workload snapshot, and recent activity.
- **Overlay-First Job Workflows**:
  - `JobDetailsDrawer`: Slide-over inspector for job details, timeline history, blocker resolution, assigned worker card, and Smart Match recommendation/reassignment.
  - `CreateJobDrawer`: Universal slide-over drawer triggered from any page to create jobs manually or draft with AI.
- **Jobs Operations Workspace (`/jobs`)**: Filterable job roster supporting tabbed status filtering (`All`, `Open`, `Assigned`, `In Progress`, `Completed`), priority filters, technician search, and 1-click status transitions.
- **Full-Page Fallback Route (`/jobs/create`)**: Retained as a deep-link and full-screen alternative to `CreateJobDrawer` using `CreateJobPage.tsx`.
- **Team Roster (`/team`)**: Technician directory displaying certified trade skills, current availability pills, assigned active job counts, and service zones.
- **Analytics & Evaluation (`/analytics`)**: Dedicated 2-tab operational intelligence view:
  - *Manager KPIs*: Completion rates, first-time-fix metrics, and operational SLAs.
  - *Algorithm Benchmarks*: AI acceptance rate, override percentage, structured override reasons breakdown, and confidence distribution.
- **Settings (`/settings`)**: Organization profiles, service zone definitions, and multi-criteria AHP weight profile configurations.

### Mobile Field Application (`apps/mobile-app`)
- **Technology**: Expo SDK 57, React Native 0.86.3, React 19.
- **Navigation Shell**: 3-tab layout (`Jobs`, `History`, `Profile`).
- **Lifecycle Execution**: Technicians move assigned jobs through `Assigned` ➔ `In Progress` ➔ `Completed`.
- **Field Ergonomics**: 1-tap phone dialer (`tel:`) and native navigation intent (Apple/Google Maps).
- **Incident & Blocker Reporting**: On-site issue submission modal writing to `incidents` with reasons (`customer_unavailable`, `access_denied`, `missing_parts`, `safety_hazard`, `scope_mismatch`, `other`).
- **Quota Protection**: In-memory caching with 60s TTL and optimistic state updates preventing quota exhaustion.

### Field Blocker & Incident Workflow (End-to-End Implemented)
1. **Technician Report**: Technician reports an on-site issue from the mobile app (or manager logs on web). An active record is created in `incidents`.
2. **Dashboard & Drawer Alert**: An urgent amber blocker banner appears in `JobDetailsDrawer` and Dashboard "Action Needed".
3. **Manager Resolution**: Manager either guides resolution on-site, reassigns the job using Smart Match, or resolves the blocker via the 1-click "Mark Blocker Resolved" action in `JobDetailsDrawer`.

## 9. Current Assignment Engine & Scoring Math

The Assignment Engine follows an explainable 3-stage Decision Pipeline defined in `shared/assignmentRecommendation.ts` and managed via `assignmentRecommendationService.ts`:

### Stage 1: Eligibility Engine (Hard Constraints)
Filters candidates out prior to scoring:
- Must have role `employee`.
- Must have `isActive: true`.
- Must not be flagged as unavailable or on `leave`.
- Must belong to the same `organizationId`.

### Stage 2: Decision Engine (Multi-Criteria Scoring)
Supports two selectable strategies:
- **Strategy A: Weighted Sum (`rule-based-v1`)**: Deterministic criteria summation.
- **Strategy B: AHP-TOPSIS (`ahp-topsis-v1`)**: Analytic Hierarchy Process for weight derivation combined with TOPSIS Euclidean distance vector ranking against Ideal Best ($A^+$) and Ideal Worst ($A^-$).

#### Scoring Criteria & Weights (Exact Total = 100 Points)
| Criterion | Max Points | Evaluation Logic |
| :--- | :--- | :--- |
| **Trade Skill Match** | **30 pts** | Exact match of job's required skills against technician's certified skills ($matched / required \times 30$). |
| **Schedule Availability** | **25 pts** | Available = 25 pts; Busy = 12 pts; Leave/Unknown = 0 pts. |
| **Active Workload** | **20 pts** | 0 active jobs = 20 pts; 1 job = 16 pts; 2 jobs = 12 pts; 3 jobs = 8 pts; 4+ jobs = 0-4 pts. |
| **Spatial / Zone Match** | **15 pts** | Exact service zone match = 15 pts; Adjacent zone = 8 pts; Distant zone = 3 pts; Keyword fallback = 4-12 pts. |
| **Historical Performance** | **10 pts** | Ratio of completed vs assigned historical jobs ($completed / considered \times 10$). |
| **TOTAL** | **100 pts** | Fully normalized to $[0, 1]$ without overflow. |

### Stage 3: Explanation Engine & Human Oversight
- Generates natural-language reason tags explaining why a candidate was ranked.
- Computes relative closeness ($C_i^*$) and derives confidence buckets:
  - **High**: $\ge 0.70$
  - **Medium**: $0.45 - 0.69$
  - **Low / Manual Review Required**: $< 0.45$
- **Human-in-the-Loop**: Recommendations are purely advisory. Managers must explicitly click "Accept" or choose an alternative technician with a mandatory structured override reason. Records are permanently stored in `recommendations`.

## 10. AI & Coordinator Service Status

- **Workflow Coordinator (`workflowCoordinator.ts`)**: Implemented multi-agent orchestrator managing intent classification, tool routing, action proposal preparation, and operational telemetry.
- **Action Proposals (`actionProposals`)**: Durable, immutable records drafted by the coordinator or WhatsApp intake for critical actions (e.g., job creation). Requires explicit manager confirmation before server-side execution.
- **Natural Language Job Importer**:
  - *Production Path*: `draftJobFromRequest` Cloud Function powered by Gemini with secret-managed keys.
  - *Fallback/Offline Path*: Local pattern-matching heuristic parser in `jobUnderstandingService.ts` (`source: 'development-stub'`).
- **WhatsApp Request Intake Demo Phase**:
  - *Simulation Transport*: High-fidelity dual-mode virtual smartphone simulator (`WhatsAppPhoneSimulator`) and standalone cross-device route (`/demo/whatsapp`). Emulates authentic WhatsApp Business chat client with real-time audio cues (Web Audio API), double checkmarks, message delivery states, dynamic island notch, and live bot typing indicator. Includes realistic presets (HVAC cooling failure, urgent pipe leak, electrical outage) or custom natural language messaging.
  - *Dual-Device / Cross-Device Testing*: Standalone route with instant QR code scanning (`QRCodeModal`) allowing real smartphone cameras to load the client and stream messages directly into the manager portal in real time.
  - *Multi-Tenant Routing*: Each simulated message is strictly bound to the authenticated manager's tenant organization (`caller.organizationId`).
  - *Extraction & Normalization*: Cloud Function `simulateWhatsAppMessage` runs Gemini 2.5 structured extraction with strict fallback heuristic parsing. Extracts title, description, customer contact, service address, priority, and required skills filtered against tenant's `availableSkills`.
  - *Atomic Confirm & Assign*: Managers review the request in `WhatsAppReviewDrawer` with real-time Smart Match candidate scoring (AHP/TOPSIS). With one click ("Create Job & Assign [Technician]"), the server function `confirmCreateJobProposal` executes an atomic multi-collection write: creates job directly in `assigned` status, records `jobActivities` (`employees_assigned`), writes `recommendations` audit record with complete criteria breakdown, appends simulated customer dispatch notification, and advances WhatsApp thread state to `confirmed`.
  - *Human-in-the-Loop Clarification*: Managers can trigger custom clarification questions to the customer (`sendWhatsAppClarification`), updating thread history while preserving proposal review state.
  - *UI Surfaces*: Single unified launcher on `JobsPage` (`/jobs?tab=whatsapp`) with status filters (`pending_review`, `confirmed`, `rejected`, `spam`), intelligent alert banner on `DashboardPage`, and standalone presentation showcase at `/demo/whatsapp`.
- **Conversational Workflow Assistant UI**: The chat interface frontend is deferred. The underlying coordinator engine, tools, and telemetry are implemented and active.

## 11. Current Directory Structure & Service Modules

All paths are relative to workspace root (`.`):

```
.
├── apps/
│   ├── web-app/                  # React Vite management portal
│   │   ├── src/
│   │   │   ├── components/       # Reusable UI primitives, slide-overs, and WhatsApp drawers/panels
│   │   │   │   └── whatsapp/     # WhatsAppPhoneSimulator, WhatsAppReviewDrawer, RequestsTab, QRCodeModal, whatsappScenarios
│   │   │   ├── layouts/          # Application shell (AppLayout, Sidebar, Header)
│   │   │   ├── pages/            # Page controllers (Dashboard, Jobs, Analytics, Team, Settings, WhatsAppStandaloneSimulatorPage)
│   │   │   ├── routes/           # Protected route tree (AppRoutes.tsx)
│   │   │   ├── services/         # Typed domain services (auth, jobs, recommendations, coordinator, whatsapp)
│   │   │   │   └── whatsapp/     # whatsappDemoService.ts
│   │   │   └── types/            # TypeScript interfaces (including whatsapp.ts)
│   │   └── package.json
│   └── mobile-app/               # Expo React Native field application
│       ├── app/                  # Expo Router file-based screens
│       ├── src/                  # Mobile components, hooks, and repositories
│       └── package.json
├── functions/                    # Cloud Functions for Firebase (Blaze plan)
│   ├── src/
│   │   ├── actionProposals/      # Trusted proposal execution handlers (confirmCreateJobProposal)
│   │   ├── model/                # Gemini model provider and callables
│   │   ├── operations/           # Operations intelligence callables
│   │   ├── whatsapp/             # WhatsApp intake handlers (simulate, reject, clarify, list)
│   │   └── workforce/            # Workforce recommendation callables
│   └── test/                     # Unit and integration test suite (30 tests)
├── shared/                       # Shared contracts and algorithm math
│   ├── actionProposal.ts
│   ├── assignmentRecommendation.ts
│   ├── coordinatorModel.ts
│   ├── operationsIntelligence.ts
│   ├── whatsappIntake.ts         # WhatsApp shared schemas, payloads, and enums
│   └── workforceIntelligence.ts
├── firebase/
│   ├── firestore.rules           # Security rules enforcing RBAC and tenant isolation
│   └── firestore.indexes.json    # Composite query indexes
└── docs/
    ├── project-knowledge-base/   # Authoritative business and technical specs
    └── design-assets/            # Approved design system and screen specs
```

## 12. Known Limitations & Deferred Roadmap

### Current Limitations
- General job editing (`jobService.updateJob`) throws not implemented; job changes occur through status transitions, assignment actions, and incident resolutions.
- Notifications collection rules deny reads/writes; in-app notification inbox is deferred.
- Seed utility creates Firestore data only; it does not provision Firebase Auth credentials.

### Deferred Scope (Parked Until Approved)
- Conversational chat UI for the Workflow Assistant (backend coordinator is ready).
- In-app notification center and push notification delivery.
- Mobile photo work-proof upload and review pipeline.
- Grounded RAG Knowledge Assistant with vector document retrieval.
- Autonomous dispatch without human approval.
- Predictive workforce forecasting models.
