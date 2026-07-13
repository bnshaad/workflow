# Current Implementation Status

**Status date:** 2026-07-14

## 1. Current stage

Workflow is past foundation and basic CRUD implementation. The manager web application has a functioning multi-tenant job-management foundation, deterministic assignment recommendations with manager acceptance/override tracking, and a narrowly scoped coordinator foundation.

## 2. Confirmed completed foundation

- Firebase initialization and environment structure
- Authentication and profile loading
- Roles: admin, manager, employee
- Admin/manager web access guards
- Tenant-aware organization isolation
- Firestore Security Rules foundation
- Shared layout, navigation, design system, and service-layer conventions

## 3. Confirmed completed job capabilities

- Job data model and service foundation
- Manual job creation
- Job listing, search, filters, and details
- Status lifecycle: draft, open, assigned, in progress, completed, cancelled
- Assignment, reassignment, and unassignment
- Employee start and completion fields
- Append-only job activities and audit reads
- Development demo-data seeder
- Dashboard summaries, priority metrics, workload metrics, and recent activity
- Evaluation-data access foundation
- AI Job Understanding secure Gemini-backed draft callable with an explicitly opted-in development stub fallback
- Create Job usability polish, required markers, field-level service-error presentation, and clear AI-draft labeling
- Deterministic, explainable `rule-based-v1` assignment recommendations
- Manager acceptance or override of a recommendation with persisted decision feedback
- Coordinator foundation with fixed routing, allowlisted tools, bounded reads, fallback behavior, and create-job proposals requiring explicit confirmation
- Durable `actionProposals` persistence for create-job proposals, with client-side immutable proposal records and tenant-scoped reads
- Firebase callable `confirmCreateJobProposal` boundary that reloads trusted proposal data, verifies active admin or manager access, atomically claims execution, writes the job and audit log, and records completion or a safe terminal state
- Firebase Emulator Suite integration verification for Auth, Firestore Rules, Firestore transactions, and the create-job callable using disposable tenant fixtures
- Secure Gemini provider boundary with bounded direct REST generation, strict structured validation, Firebase Secret binding, deterministic fake-provider tests, verified Node 20 compatibility, and no live API request

## 4. Current architectural reality

The implemented repository uses:

- `organizations`
- `users`
- `jobs`
- `jobActivities`
- `auditLogs`
- `recommendations`
- `actionProposals`

Approved but currently locked or unimplemented operational areas include:

- `incidents`
- `notifications`
- knowledge-document metadata and chunks, only after the implementation design is approved

Older documentation references to a primary `tasks` collection are superseded by `jobs`.

## 5. Current AI maturity

| Module | Current maturity |
|---|---|
| AI Job Understanding | Server-side Gemini structured-draft callable implemented and verified through Node 20 build, unit, and emulator checks; it requires a configured Firebase Secret and has not been live-verified. Development stub remains opt-in only. |
| Weighted assignment | Deterministic `rule-based-v1` recommendation service with explainable scoring; advisory only |
| AHP-TOPSIS ranking | Approved future experimental ranking mode; not assumed implemented |
| Recommendation acceptance/override | Implemented for generated recommendations; accepted/overridden decisions persist with reason and score snapshots |
| Evaluation metrics | Manual-assignment baseline plus recommendation decision metrics are available as bounded reads |
| Multi-agent coordinator | Deterministic-first typed coordinator; exact routes make zero model calls, ambiguous requests may use one server-side Gemini classification call mapped to a fixed allowlist. No assistant UI. |
| Decision-support agent | Initial read-only Operations Insight routes only |
| Knowledge/RAG agent | Planned |
| Employee mobile AI | Planned after web AI core |

## 6. Immediate priority

The coordinator now has a narrow secure model boundary for classification and editable drafting. The next coherent milestone is still not a broad autonomous multi-agent system:

1. Provision or identify a separate approved development Firebase project, then configure and manually verify Gemini there using a Secret, quota limits, and Node 20.
2. Add specialist slices one at a time, beginning with a grounded Workforce or Operations design, not autonomous execution.
3. Extend trusted proposal execution only after each new action has explicit lifecycle, validation, audit, and reconciliation requirements.

## 7. Critical actions

The following actions must never be silently executed by an LLM:

- Create a job
- Assign, reassign, or unassign employees
- Change job status
- Cancel or delete a job
- Resolve an incident
- Send operational notifications to users
- Modify users, roles, organization settings, assignment criteria, or knowledge documents

The AI may prepare a proposal. The existing trusted service layer performs the write only after explicit confirmation and authorization checks.

## 8. Scope boundary

Not part of the current MVP claim:

- Autonomous assignment
- Automatic model retraining or weight changes
- Reinforcement learning
- Predictive workforce forecasting
- Live GPS tracking
- Route optimization
- Unrestricted agent-to-agent loops
- General-purpose autonomous browsing

## 9. Local Integration Verification

The repository configures only the Auth (`9099`), Firestore (`8080`), and Functions (`5001`) emulators. Emulator use is opt-in for the web client: Vite development mode must set `VITE_USE_FIREBASE_EMULATORS=true`; `VITE_FIREBASE_EMULATOR_HOST` defaults to `127.0.0.1`. Production builds never connect to local emulators.

Run these commands from the indicated directories:

```text
functions/: npm run emulators
functions/: npm run test:integration
functions/: npm run build
apps/web-app/: npm run test:rules
apps/web-app/: npm run lint
apps/web-app/: npm run build
```

`test:integration` starts isolated emulators using project ID `workflow-integration`, creates disposable Auth users and tenant profiles, and verifies the valid lifecycle, reload, audit write, duplicate and concurrent confirmation, ownership and tenant isolation, Rules-denied mutation, invalid payload/hash, expiry, unsupported action, inactive/employee access, processing collision, and reconciliation non-retry.

No Firebase project deployment has been performed. The 2026-07-14 controlled runtime verification used Node `20.20.2` with Firebase CLI `15.18.0`: Functions build and 13 unit tests passed; the Auth, Firestore, and Functions emulator suite passed 7 checks and loaded both Gemini callables; and the web rule tests passed 15 checks alongside lint and production build. The checked Firebase account exposed only the current `workflow-p` project, not a separately identified development project, so no Secret was set, billing or quota was not assessed, no deployment occurred, and no live Gemini smoke scenario or Cloud log review occurred. A deployment must target a controlled development Firebase project first, with review of the generated Functions package and no production credentials or user data. Eventual Functions deployment can require a billing-enabled Firebase project even when usage remains within free quotas. Do not deploy unverified changes to production.

The real uncertain-write transition is not artificially induced in the emulator suite; its terminal non-retry behavior is integration-tested and its failure classification remains unit-tested. Gemini behavior is covered with fake-provider unit tests only: no API key or live Gemini request was used. Node 20 is declared for Functions deployment and has been verified with an isolated Node `20.20.2` runtime; repeat the same checks after any Functions or dependency change and before controlled deployment. No Genkit, RAG, extra agents, autonomous actions, or assistant UI is implemented.
