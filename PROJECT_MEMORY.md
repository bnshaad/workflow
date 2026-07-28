# Workflow Project Memory

This document is the root project memory for Workflow. Keep it current when a phase is completed, but do not use it to invent product scope or replace the approved project knowledge base.

## 1. Project Identity

Workflow is a workforce operations MVP for service businesses. The product has two planned applications:

- Web Management Portal for Admin and Manager users.
- Mobile Field Application for Employee users.

The current repository implementation is focused on the React web portal in `apps/web-app`, with Firebase Authentication, Cloud Firestore, Firebase Storage service scaffolding, Tailwind CSS, shadcn-style primitives, and Lucide icons.

The approved source-of-truth order is:

1. `docs/project-knowledge-base/`
2. `docs/design-assets/`
3. Existing source code

Codex should implement approved phases and fixes only. Do not make product decisions, redesign the application into a new visual style, introduce unapproved architecture, or add speculative features.

## 2. Academic Core & Capstone Scope

Workflow is framed as an **Explainable AI Decision Support Platform for Field Operations** combining eligibility filtering, configurable multi-criteria decision making, human oversight, and evidence-based evaluation to improve workforce assignment decisions.

The project is structured into a 5-Phase Roadmap (All 5 Core Phases Implemented):

1. **Phase 1 — Operational Loop**: Complete minimal employee flow (`Assigned` → `In Progress` → `Completed` + optional `reopen` flag) to unlock real completion-time operational data across web portal and mobile app (`apps/mobile-app`).
2. **Phase 2 — Decision Pipeline**: 3-stage pipeline (`Eligibility Engine` → `Ranking` → `Explanation Engine`) and `Decision Engine` abstraction supporting both `Weighted Strategy` (`rule-based-v1`) and `AHP-TOPSIS Strategy` (`ahp-topsis-v1`).
3. **Phase 3 — Human-in-the-Loop**: Explicit recommendation acceptance/override UI ("Accept Rahul" / "Choose someone else"), structured override reasons dropdown, derived confidence scores (High/Med/Low), and unified permanent recommendation records in Firestore.
4. **Phase 4 — Evidence-Based Evaluation**: Business-facing evaluation dashboard (`AnalyticsPage`) measuring AI quality (acceptance %, override %, top reasons), operational impact (completion times, SLA compliance), manual assignment baseline metrics, and system performance.
5. **Phase 5 — Configuration Layer**: Org-scoped configuration documents in Firestore (`organizationConfigurations` collection) for skills, job types, capability mappings, and AHP weight profiles (e.g. "Emergency Repair" vs "Commercial Maintenance").

Explicitly Parked / Out of Scope: Mobile photo proof upload, issue/incident reporting, push notifications, Grounded RAG Knowledge Assistant, Predictive forecasting models, Automatic model retraining / reinforcement learning, Dynamic UI form rendering, Second vertical, Autonomous dispatch.


## 3. Frozen Architecture Decisions

Frozen architecture:

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui-style components, Lucide React.
- Backend services: Firebase Authentication, Cloud Firestore, Firebase Storage.
- No custom backend is required for the MVP.
- Firebase operations must go through service-layer modules under `apps/web-app/src/services`.
- Tenant isolation is based on `organizationId`.
- RBAC is based on active Firestore user profiles and roles: `admin`, `manager`, `employee`.
- Web portal access is for Admin and Manager users.
- Employees are blocked from the web management portal and belong to the mobile field app scope.

Do not add:

- Flask.
- Express.
- Node backend.
- Redux.
- Zustand.
- New database architecture.
- New top-level Firestore collections without approval.
- Unnecessary dependencies.
- External AI APIs in frontend code.
- API keys in frontend code, storage, localStorage, sessionStorage, or commits.

Approved top-level Firestore collections are:

- `organizations`
- `users`
- `jobs`
- `recommendations`
- `incidents`
- `notifications`
- `auditLogs`
- `jobActivities`
- `actionProposals`
- `organizationConfigurations`

## 4. Implemented Features

Current implemented web portal features in `apps/web-app`:

- Protected app shell with Dashboard, Analytics, Jobs, Team, and Settings navigation.
- Admin/Manager-only web portal access through route permissions.
- Login and profile setup required flows.
- Dashboard with compact operational overview, Action Needed alerts, job status metrics, top workload snapshot, recent activity, and in-place `JobDetailsDrawer` / `CreateJobDrawer` popups.
- Analytics page split from Dashboard for operational performance and assignment evaluation.
- Jobs list with search, status, assignment, creator, and priority filtering.
- Modern Overlay-First Architecture: Universal in-place slide-over drawers (`JobDetailsDrawer` and `CreateJobDrawer`) for job creation, AI draft parsing, worker scoring, status changes, and dispatching triggered uniformly across Header, Sidebar, Dashboard, Jobs Page, and Team Page without page shifts.

- Everyday Manager English: UI translated to clear business terms ("Smart Match", "Assign Worker", "Assigned to: Rahul Sharma", "Reassign Technician", "Draft Job with AI").
- Low Cognitive Load & De-Cluttered Design: Unified single-bar search & quick filter tabs on Jobs page, 2-tab Reports separation (Manager KPIs vs Algorithm Benchmarks), streamlined technician roster cards, and detailed user interaction specification in [`docs/USER_INTERACTION_AND_PAGE_GUIDE.md`](file:///Users/binshad/projects/workflow-mvp/docs/USER_INTERACTION_AND_PAGE_GUIDE.md).

- Assigned Technician State Resolution: Assigned jobs display the resolved technician's name (e.g., `Assigned to: Rahul Sharma`) and a dedicated **Assigned Field Technician Card** with re-assignment controls, hiding raw unassigned scoring cards when work is already dispatched.
- Field Status Progression: Work status (`Assigned` ➔ `In Progress` ➔ `Completed`) is updated automatically via live Firestore snapshots as the assigned employee executes work on the mobile app, with guidance replacing manual manager status overwrites.
- Job Details decision screen and drawer with summary, 1-click assignment/re-assignment actions, job information, and activity timeline.


- Create Job form and drawer with manual entry and AI Customer Request Importer (paste WhatsApp/Email text to draft).
- Team page using active employee profile data from `users`.
- Settings page with role-limited operational/business settings visibility.
- Firestore-backed job creation, job listing, job details, assignment, reassignment, unassignment, status transitions, job activities, and audit logs.

- Decision Engine candidate ranking and recommendation generation supporting Weighted and AHP-TOPSIS strategies.
- Permanent recommendation records (`recommendations` collection) capturing manager decision feedback (Accept / Override) and structured override reasons.
- Action proposals (`actionProposals` collection): Persists structured, immutable job-creation proposals drafted by AI/Coordinator for Admin/Manager review and explicit 1-tap confirmation before any job write executes.
- Org-scoped configuration documents (`organizationConfigurations` collection): Defines skills, job sub-types, capability mappings, and AHP criteria weight matrices.
- Manual assignment baseline metrics for Analytics.
- Development demo seed utility for a demo organization, users, jobs, activities, and audit logs.

Current implemented mobile field app features in `apps/mobile-app`:

- Expo SDK 54, React Native 0.81, Expo Router v6 mobile application for Employee role users.
- Clean authentication flow (`(auth)/login`) with normalized Auth UIDs and fallback `displayName` support.
- Instant complete sign-out handling resetting auth state and replacing route to `/(auth)/login`.
- Today's & Assigned Jobs screen (`(tabs)/index`) with top branding header, safe area insets, segment filter tabs (`All`, `Assigned`, `In Progress`), and Pull-to-Refresh.
- Minimal-click action bar directly on list cards allowing field technicians to execute 1-tap status transitions (`Assigned` → `In Progress` → `Completed`) without mandatory detail screen navigation.
- Job Details screen (`job/[id]`) with custom back navigation header, priority/status cards, customer contact rows, service address, and required skills pills.
- Peer dependency resolution with `react-native-svg` and typed `Icon` component wrapper for `lucide-react-native`.

Deployed Cloud Firestore Security Rules (`firebase/firestore.rules`):

- Deployed and released live to production project (`workflow-p`).
- Updated `match /jobs/{jobId}` rule for list queries to enable employee assigned-job querying (`request.auth.uid in data.assignedEmployeeIds`) by removing unqueryable `data.assignedEmployeeIds is list` type guards on `resource.data`.

The worktree currently contains an uncommitted change to `apps/web-app/src/pages/CreateJobPage.tsx`; treat it as existing work unless the user asks to inspect or modify it.

## 5. Current Assignment Engine

The current assignment engine is implemented across `shared/assignmentRecommendation.ts` (3-stage Decision Pipeline contracts and scoring logic) and `apps/web-app/src/services/recommendations/assignmentRecommendationService.ts` (recommendation persistence, manager decision feedback, and decision metrics).

Current status:

- Implemented as `DecisionEngine` supporting both `Weighted Strategy` (`rule-based-v1`) and `AHP-TOPSIS Strategy` (`ahp-topsis-v1`).
- Stage 1 (Eligibility Engine): Hard-constraint filtering (`isEligibleRecommendationEmployee`) checking active employee profile, leave status, and tenant isolation.
- Stage 2 (Decision Engine): Strategy pattern ranking using either fixed criteria weights (`Weighted Strategy`) or AHP pairwise criteria matrices with TOPSIS vector normalization & ideal closeness calculation (`AHP-TOPSIS Strategy`).
- Stage 3 (Explanation Engine): Scoring breakdown, explanation badges, and derived TOPSIS Confidence Scores (High / Medium / Low) with a "Manual Review Recommended" threshold alert for low-confidence recommendations.
- Human-in-the-loop: Manager accepts ("Accept Rahul") or overrides ("Choose someone else") recommendations with structured override reasons (`Customer Request`, `Availability Conflict`, `Manager Preference`, `Other`).
- Stores unified permanent recommendation decision records in `recommendations` collection.
- Supports job sub-type AHP profiles (e.g. "Emergency Repair", "Commercial Maintenance", "Standard") with pairwise criteria comparison weight derivation.
- Writes audit logs for recommendation generation and manager decisions.
- Does not assign employees automatically (strict human control maintained).
- Does not update weights or retrain models using ML (deterministic decision support system).

Current scoring factors:

- Skill match: up to 35 points.
- Availability: up to 25 points.
- Active workload: up to 20 points.
- Location relevance: currently 0 points because employee service area/location history data is not available.
- Historical completion performance: up to 10 points based on available historical assigned jobs.

Candidate ranking:

- Reads the open job.
- Reads active employee users in the same organization.
- Reads recent historical jobs.
- Filters out unavailable/leave employees.
- Ranks candidates by score, with name as a deterministic tie-breaker.
- Limits stored candidates to the top 5.

Manual assignment and reassignment live in `apps/web-app/src/services/jobs/jobService.ts`.

Current assignment behavior:

- Only Admin/Manager can assign through web services.
- Only open jobs can be initially assigned.
- Assignment moves a job from `open` to `assigned`.
- Assigned jobs can be reassigned while still assigned.
- Unassigning all employees moves an assigned job back to `open`.
- Employee status flow supports assigned to in progress to completed for assigned employees.

## 6. AI Job Understanding Status

AI Job Understanding is implemented as a development-only stub in `apps/web-app/src/services/ai/jobUnderstandingService.ts`.

Current status:

- Admin/Manager users can generate a draft suggestion from a natural-language customer request.
- The draft can suggest title, description, service type, required skills, priority, customer name, customer phone, service address, and location.
- The source is explicitly `development-stub`.
- Managers remain responsible for reviewing and editing every field before job creation.
- The service does not create jobs automatically.
- The service does not call Gemini or any external AI provider.
- There is no approved secure production AI integration in the current Firebase Spark architecture.

Future Gemini integration is allowed only through an approved secure backend or trusted runtime path. Do not place Gemini or other AI API keys in frontend code.

## 7. Demo Data and Firebase Setup

Firebase files are in `firebase/`:

- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`

The demo dataset utility is documented in `apps/web-app/docs/demo-dataset-seeding.md` and implemented under `apps/web-app/scripts`.

Current demo seed behavior:

- Development-only.
- Does not run automatically.
- Seeds demo organization `Workflow Demo Services` with organization ID `demo-org-001`.
- Seeds Firestore profiles for 1 admin, 2 managers, and 10 active employees.
- Seeds 32 AC/electronics service jobs across statuses.
- Seeds job activities for status, assignment, start, and completion events.
- Seeds matching audit logs.
- Does not create Firebase Authentication users.

Safety gates include:

- `WORKFLOW_DEMO_SEED_ENABLED=true`
- `WORKFLOW_FIREBASE_ENV=development`
- `NODE_ENV` must not be `production`
- Project ID must not look production-like.
- Project ID must not be listed in `WORKFLOW_PRODUCTION_FIREBASE_PROJECT_IDS`.
- Explicit confirmation flags are required.

Do not weaken demo seed safety checks.

## 8. Current UI Principles

The current portal is intended to feel like a compact workforce operations tool, not a presentation site.

Current UI principles:

- Preserve the existing Workflow visual identity.
- Desktop-first, light theme, minimal animation.
- Keep Manager/Admin workflows efficient and scannable.
- The app shell should own document scrolling: fixed shell, stable sidebar/header, main content scroll only.
- Avoid double scrollbars and avoid unnecessary nested scrolling.
- Keep page actions visible near headings or sticky action areas where already implemented.
- Keep cards compact and use simple bordered rows for dense operational lists.
- Reuse shared components such as `Sidebar`, `Header`, `PageHeader`, `MetricCard`, `DataTable`, `StatusBadge`, `Timeline`, `SuggestedWorkerCard`, `EmptyState`-style states, dialogs, and form controls.
- Do not add fake controls that appear functional without behavior.
- Preserve accessible labels, visible focus states, and keyboard reachability.

Recent portal UI direction:

- Dashboard is now the daily operations command center.
- Analytics owns detailed operational/evaluation metrics.
- Job Details is the central manager decision screen.
- Jobs is the main list/filter operations workspace.
- Create Job should remain compact, editable, and manager-controlled.

## 9. Core Implementation & Deferred Scope

The 5 core roadmap phases are fully implemented:

- Phase 1: Operational Loop (`Assigned` → `In Progress` → `Completed` flow in `apps/web-app` and `apps/mobile-app`).
- Phase 2: Decision Pipeline (`Eligibility Engine` + `Weighted Strategy` & `AHP-TOPSIS Strategy`).
- Phase 3: Human-in-the-Loop (Accept/Override UI, override reasons, derived TOPSIS confidence score, permanent recommendation records).
- Phase 4: Evidence-Based Evaluation (`AnalyticsPage` metrics, AI quality, operational impact, manual assignment baselines).
- Phase 5: Configuration Layer (`organizationConfigurations` collection for skills, job sub-types, AHP weight profiles).

Deferred future work (parked or deferred until approved):

- Mobile employee field app extended scope: Photo proof upload, issue/incident reporting, push notifications.
- Grounded RAG Knowledge Assistant.
- Controlled Conversational Workflow Assistant.
- Notifications implementation.
- Testing and documentation hardening.

## 10. Deferred / Out-of-Scope Integrations

Deferred future integrations and capabilities include:

- Production Gemini integration through a secure approved runtime.
- Controlled Conversational Workflow Assistant.
- Grounded RAG Knowledge Assistant with trusted sources and citations.
- Mobile work proof upload and review.
- Issue reporting and resolution (`incidents`).
- Operational push notifications.

Explicitly out of scope:

- Fully autonomous assignment without manager approval.
- Automatic machine-learning training or model retraining.
- Reinforcement learning.
- Predictive workforce forecasting models.
- Fully dynamic UI form generation.
- Payroll, Inventory, or ERP integrations.
- Live GPS tracking or route optimization.

## 11. Known Limitations / Important Warnings

Important warnings:

- Never describe the current assignment engine as autonomous AI or machine learning.
- Never state that feedback automatically improves the model; current and planned feedback is descriptive/evaluation data only.
- Never automatically assign employees from recommendations.
- Never add frontend AI API keys.
- Never bypass service-layer access for Firebase operations.
- Never bypass tenant isolation or RBAC.
- Never create new top-level Firestore collections without approval.
- Never treat older `tasks` / `assignedUserId` terminology as current implementation terminology; current business implementation uses `jobs` and `assignedEmployeeIds`.
- Some knowledge-base wording still mentions future AI/evaluation features as MVP scope. Verify source code and commit history before claiming a feature is implemented.
- `jobService.updateJob` currently exists in the interface but throws not implemented; do not claim general job editing is complete unless that changes.
- `incidents` and `notifications` Firestore rules currently deny reads/writes; do not claim those product areas are implemented unless rules and services are updated in an approved phase.
- Analytics reuses dashboard/evaluation service data; do not duplicate Firestore query logic in pages.
- The demo seed utility does not create Firebase Auth users.

## 12. Development and Git Rules

Development rules:

- Read `AGENTS.md` before starting implementation.
- Follow approved knowledge-base and design assets before existing code if they conflict.
- Use `rg` for searching when practical.
- Keep changes scoped to the requested phase.
- Do not introduce new dependencies without explicit approval.
- Do not create debug files, temporary files, backup files, or duplicate documentation.
- Do not edit generated output such as `dist` unless explicitly required.
- Do not touch `.env.local` or secrets.
- Use service-layer modules for Firebase behavior.
- Prefer reusable components and existing design primitives.
- Preserve user or previous-agent work in the git worktree.

Git rules:

- Review `git status` before and after work.
- Do not revert unrelated changes.
- Do not commit automatically unless the user asks.
- When implementation is requested, run `npm run lint` and `npm run build` from `apps/web-app` unless the task is documentation-only or the user says otherwise.
- Report any pre-existing worktree changes separately from changes made in the current task.

## 13. Mandatory Checks Before Any New Phase

Before any new Workflow phase:

1. Read the user's current request and attached files.
2. Read `AGENTS.md`.
3. Check `git status --short`.
4. Inspect recent `git log --oneline`.
5. Read the relevant `docs/project-knowledge-base/` documents for the phase.
6. Inspect the relevant implementation files before editing.
7. Confirm the phase does not change Firestore queries, rules, RBAC, tenant checks, service behavior, data models, AI logic, or dependencies unless explicitly requested.
8. Keep employee mobile work separate from Manager/Admin portal work unless the phase is mobile-specific.
9. Preserve advisory-only assignment boundaries.
10. After implementation, run required checks and report changed files, behavior, and manual tests still needed.

For UI phases, also verify:

- No double vertical scrollbars.
- No horizontal scrolling unless unavoidable.
- No overlapping controls or clipped text.
- Responsive desktop/tablet/mobile behavior.
- Accessible labels and visible focus states.
- Existing routes and actions still work.

## 14. Current Repository Notes

Repository root: `/Users/binshad/projects/workflow-mvp`

Important directories:

- `apps/web-app/` - current React web portal.
- `apps/web-app/src/pages/` - page components.
- `apps/web-app/src/routes/` - protected route configuration.
- `apps/web-app/src/layouts/` - application shell.
- `apps/web-app/src/components/` - shared UI components.
- `apps/web-app/src/services/` - Firebase and domain service layer.
- `apps/web-app/src/permissions/` - frontend permission helpers.
- `apps/web-app/src/types/` - shared TypeScript models.
- `apps/web-app/src/validators/` - validation helpers.
- `apps/web-app/scripts/` - development scripts, including demo seed utility.
- `apps/web-app/docs/` - app-local operational docs.
- `docs/project-knowledge-base/` - approved business, architecture, and development documents.
- `docs/design-assets/` - approved design assets and screens.
- `firebase/` - Firestore rules and indexes.

Current routes include:

- `/dashboard`
- `/analytics`
- `/jobs`
- `/jobs/create`
- `/jobs/:jobId`
- `/team`
- `/settings`
- `/login`
- `/profile-setup-required`
- `/unauthorized`

Current package scripts in `apps/web-app/package.json`:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`
- `npm run seed:demo`

Current notable service & domain modules:

- `shared/assignmentRecommendation.ts` - Shared 3-stage Decision Pipeline (Eligibility Engine, Weighted Strategy, AHP-TOPSIS Strategy, TOPSIS confidence scoring).
- `shared/operationsIntelligence.ts` & `shared/workforceIntelligence.ts` - Read-only operations & workforce intelligence contracts.
- `shared/actionProposal.ts` & `shared/jobCreation.ts` - Action proposal & AI draft schemas.
- `shared/configuration.ts` - Scoped organization configuration interfaces.
- `services/recommendations/assignmentRecommendationService.ts` - Recommendation generation, manager acceptance/override decision tracking, permanent recommendation records.
- `services/actionProposals/actionProposalService.ts` - Action proposal persistence, tenant reads, and callable execution boundaries.
- `services/coordinator/workflowCoordinator.ts` - Multi-agent coordinator router, tool execution, and telemetry.
- `services/config/organizationConfigService.ts` - Org-scoped configuration documents in Firestore (`organizationConfigurations`).
- `services/jobs/jobService.ts` - Job lifecycle, assignment, and activity tracking.
- `services/ai/jobUnderstandingService.ts` - Natural-language job drafting callable service.
- `services/dashboard/index.ts` - Dashboard operational overview & attention metrics.
- `services/evaluation/index.ts` - Baseline manual assignment & operational evaluation metrics.
- `services/user/index.ts` - User profile service.
- `services/auth/index.ts` - Firebase Authentication service.
- `services/storage/index.ts` - Storage service.

Keep this document synchronized after completed phases, but always verify against current code and git history before relying on it for implementation claims.
