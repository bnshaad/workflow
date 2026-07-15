# Current Implementation Status

**Status date:** 2026-07-15

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
- Secure Gemini provider boundary using server-only `gemini-3.1-flash-lite`, bounded direct REST generation, a flat draft transport schema, strict public-contract validation, Firebase Secret binding, deterministic fake-provider tests, and successful local real-model smoke verification
- Emulator-only real-Gemini opt-in with a gitignored local Secret override and guarded synthetic smoke command
- Read-only Workforce Intelligence routing for recommendation, explanation, and top-candidate comparison
- Trusted tenant-scoped `getWorkforceRecommendation` callable using the shared deterministic engine without writes

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
| AI Job Understanding | Server-side `gemini-3.1-flash-lite` structured-draft callable implemented with a flat transport schema and strict normalization; fake-provider automation and the controlled local real-model smoke have passed. Development stub remains opt-in only. |
| Weighted assignment | Deterministic `rule-based-v1` recommendation service with explainable scoring; advisory only |
| AHP-TOPSIS ranking | Approved future experimental ranking mode; not assumed implemented |
| Recommendation acceptance/override | Implemented for generated recommendations; accepted/overridden decisions persist with reason and score snapshots |
| Evaluation metrics | Manual-assignment baseline plus recommendation decision metrics are available as bounded reads |
| Multi-agent coordinator | Deterministic-first typed coordinator; exact routes make zero model calls, ambiguous requests may use one server-side Gemini classification call mapped to a fixed allowlist. No assistant UI. |
| Workforce Intelligence | First read-only slice implemented for recommendation, grounded explanation, and top-two comparison; deterministic engine remains authoritative and no assignment is executed |
| Decision-support agent | Initial read-only Operations Insight routes only |
| Knowledge/RAG agent | Planned |
| Employee mobile AI | Planned after web AI core |

## 6. Immediate priority

The coordinator now has a narrow secure model boundary for classification and editable drafting. The next coherent milestone is still not a broad autonomous multi-agent system:

1. Keep public deployment and Blaze deferred until public Functions access is required.
2. Add the next specialist slice one at a time, beginning with grounded Operations Intelligence, not autonomous execution.
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
functions/: WORKFLOW_USE_REAL_GEMINI=true npm run test:ai:local
functions/: npm run build
apps/web-app/: npm run test:rules
apps/web-app/: npm run lint
apps/web-app/: npm run build
```

`test:integration` starts isolated emulators using project ID `workflow-integration`, creates disposable Auth users and tenant profiles, and verifies the proposal lifecycle plus the read-only Workforce callable. Workforce coverage includes active manager access, employee and inactive-manager rejection, tenant isolation, missing jobs, eligibility, deterministic ordering and scores, grounded reasons, and absence of assignment, proposal, or recommendation writes.

For optional local real-Gemini testing, create untracked `functions/.secret.local` containing `GEMINI_API_KEY`, then run the explicit opt-in command above from `functions/`. The command refuses CI, requires the isolated emulator project, never targets a deployed endpoint, uses synthetic classification and draft text, and verifies protected collection counts do not change. The local file is ignored by Git and the key is never printed. The deployed path continues to use Firebase `defineSecret`.

The smoke command automatically asserts allowlisted intent values, destructive-request fallback, required empty fields for the incomplete draft, bounded structured output, and absence of job, proposal, or recommendation writes. It prints only field-presence and list-count summaries; prompts, customer details, secrets, raw responses, and full drafts are not logged.

No Firebase project deployment has been performed. Workflow remains on Spark and uses local emulators; Blaze is deferred until public Functions deployment is required. Node 20 compatibility for Functions was verified on 2026-07-14. The web `test:rules` command now compiles its TypeScript tests with the existing compiler into ignored `node_modules/.tmp` output and runs Node's built-in test runner, removing the Node 25-only strip-types flag without adding a dependency. The final cleanup verification passed 26 Functions unit tests, 12 emulator integration tests, 22 web tests, both builds, web lint, and the real-Gemini smoke. The current cleanup host provides Node 25, so the revised web command still requires one direct rerun under Node 20 before claiming runtime verification of that command.

The real uncertain-write transition is not artificially induced in the emulator suite; its terminal non-retry behavior is integration-tested and its failure classification remains unit-tested. Automated Gemini tests use fake providers; the separate opt-in local smoke passed against real Gemini using synthetic data. No Genkit, RAG, assignment-capable agent, recursive delegation, autonomous actions, or broad assistant UI is implemented.
