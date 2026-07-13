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

## 2. Academic Core

Workflow's academic and evaluation thread is explainable, human-in-the-loop workforce assignment.

The current assignment recommendation baseline is deterministic, rule-based, weighted scoring. It is described as AI-assisted or explainable assignment support in the UI and documentation, but it is not an autonomous model, not external AI, and not machine learning.

The current academic/evaluation baseline includes descriptive manual assignment metrics:

- Total manual assignments.
- Jobs started.
- Jobs completed.
- Completion rate.
- Assignment-to-start time.
- Assignment-to-completion time.
- Overdue completion rate.
- Employee assignment distribution.

Future academic work is reserved for AI-assisted assignment evaluation and the planned Explainable Hybrid MCDM Assignment Model using eligibility filtering, normalized criteria, AHP-derived weight profiles, TOPSIS ranking, explanation generation, and manager approval or override.

Do not claim statistical significance, prediction accuracy, adaptive learning, or automatic optimization unless those capabilities are explicitly implemented and approved.

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

## 4. Implemented Features

Current implemented web portal features include:

- Protected app shell with Dashboard, Analytics, Jobs, Team, and Settings navigation.
- Admin/Manager-only web portal access through route permissions.
- Login and profile setup required flows.
- Dashboard with compact operational overview, Action Needed alerts, job status metrics, top workload snapshot, and recent activity.
- Analytics page split from Dashboard for operational performance and assignment evaluation.
- Jobs list with search, status, assignment, creator, and priority filtering.
- Responsive Jobs layout with desktop table behavior and smaller-screen usability improvements.
- Job Details decision screen with summary, assignment/recommendation/status actions, job information, and activity timeline.
- Create Job form with manual entry and AI Job Understanding draft suggestions.
- Team page using active employee profile data from `users`.
- Settings page with role-limited operational/business settings visibility.
- Firestore-backed job creation, job listing, job details, assignment, reassignment, unassignment, status transitions, job activities, and audit logs.
- Rule-based assignment recommendation generation for open jobs.
- Manual assignment baseline metrics for Analytics.
- Development demo seed utility for a demo organization, users, jobs, activities, and audit logs.

Recent committed UI phase history shows completed portal improvements for:

- Jobs page usability.
- Job Details decision flow.
- Dashboard action prioritization.
- Dashboard/Analytics separation.
- Portal information density.

The worktree currently contains an uncommitted change to `apps/web-app/src/pages/CreateJobPage.tsx`; treat it as existing work unless the user asks to inspect or modify it.

## 5. Current Assignment Engine

The current assignment engine lives in `apps/web-app/src/services/recommendations/assignmentRecommendationService.ts`.

Current status:

- Implemented as `rule-based-v1`.
- Human-in-the-loop only.
- Generates ranked candidates for open jobs.
- Stores recommendation records in `recommendations`.
- Writes an audit log for recommendation generation.
- Does not assign employees automatically.
- Does not update weights automatically.
- Does not train or call an external ML model.

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

## 9. Next Planned Phases

Use the current roadmap, knowledge base, and latest user request before starting any phase.

Planned or deferred work from the approved knowledge base includes:

- Manager recommendation feedback: accepted recommendation, overridden recommendation, override reason.
- AI-assisted assignment evaluation after recommendation acceptance/override tracking exists.
- Explainable Hybrid MCDM Assignment Model.
- Controlled Conversational Workflow Assistant.
- Grounded RAG Knowledge Assistant.
- Mobile employee field app scope: Today's Jobs, Assigned Jobs, Job Details, status updates, work proof, issue reporting, notifications, and approved assistant access.
- Notifications implementation when explicitly started.
- Work proof and issue management implementation when explicitly started.
- Testing and documentation hardening.

Do not skip ahead. Do not begin a new phase while the user has explicitly limited scope to the current phase.

## 10. Deferred Future Integrations

Deferred future integrations and capabilities include:

- Production Gemini integration through a secure approved runtime.
- Controlled Conversational Workflow Assistant.
- Grounded RAG Knowledge Assistant with trusted sources and citations.
- Recommendation acceptance/override feedback tracking.
- AI-assisted assignment evaluation.
- Explainable Hybrid MCDM Assignment Model.
- Notifications.
- Employee mobile field app.
- Work proof upload and review.
- Issue reporting and resolution.

Out of scope unless later approved:

- Automatic assignment.
- Machine-learning training.
- Automatic weight adjustment.
- Automatic model retraining.
- Predictive workforce forecasting.
- Advanced reporting dashboards beyond approved Analytics scope.
- Payroll.
- Inventory.
- ERP integrations.
- Live GPS tracking.
- Offline sync.
- Internal chat, voice calls, or video calls.

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

Current notable service modules:

- `services/jobs/jobService.ts`
- `services/recommendations/assignmentRecommendationService.ts`
- `services/ai/jobUnderstandingService.ts`
- `services/dashboard/index.ts`
- `services/evaluation/index.ts`
- `services/user/index.ts`
- `services/auth/index.ts`
- `services/storage/index.ts`

Keep this document synchronized after completed phases, but always verify against current code and git history before relying on it for implementation claims.
