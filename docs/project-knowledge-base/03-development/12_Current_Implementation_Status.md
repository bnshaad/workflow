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
- Bounded read-only Operations Intelligence with six fixed intents, shared deterministic attention rules, grounded summaries, and one tenant-scoped `getOperationsInsight` callable
- Compact dashboard operations insight panel with fixed views, reason badges, job links, and loading, error, and empty states

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
| Multi-agent coordinator | Deterministic-first typed coordinator; exact routes make zero model calls, ambiguous requests may use one server-side Gemini classification call mapped to a fixed allowlist. Operations requests make at most one trusted tool call. No broad assistant UI. |
| Workforce Intelligence | First read-only slice implemented for recommendation, grounded explanation, and top-two comparison; deterministic engine remains authoritative and no assignment is executed |
| Operations Intelligence | Read-only specialist implemented for urgent unassigned, overdue, deterministic attention, workload distribution, open-operations summary, and attention explanations; no overload threshold or prediction |
| Knowledge/RAG agent | Planned |
| Employee mobile AI | Planned after web AI core |

## 6. Immediate priority

The coordinator now has a narrow secure model boundary for classification and editable drafting. The next coherent milestone is still not a broad autonomous multi-agent system:

1. Keep public deployment and Blaze deferred until public Functions access is required.
2. Keep the next specialist phase narrow; Knowledge/RAG remains unimplemented until its trusted document and citation design is approved.
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

`test:integration` starts isolated emulators using project ID `workflow-integration`, creates disposable Auth users and tenant profiles, and verifies the proposal lifecycle plus the read-only Workforce and Operations callables. Operations coverage includes manager and admin access, employee and inactive-manager rejection, ignored client tenant claims, tenant isolation, bounded results, workload counts, and absence of job, proposal, recommendation, or notification writes.

For optional local real-Gemini testing, create untracked `functions/.secret.local` containing `GEMINI_API_KEY`, then run the explicit opt-in command above from `functions/`. The command refuses CI, requires the isolated emulator project, never targets a deployed endpoint, uses synthetic classification and draft text, and verifies protected collection counts do not change. The local file is ignored by Git and the key is never printed. The deployed path continues to use Firebase `defineSecret`.

The smoke command automatically asserts allowlisted intent values, destructive-request fallback, the classifier-to-Operations-tool path, deterministic overdue and workload results, required empty fields for the incomplete draft, bounded structured output, and absence of job, proposal, recommendation, or notification writes. It prints only field-presence and list-count summaries; prompts, customer details, secrets, raw responses, and full drafts are not logged.

No Firebase project deployment has been performed. Workflow remains on Spark and uses local emulators; Blaze is deferred until public Functions deployment is required. Node 20 compatibility for Functions was verified on 2026-07-14. The web `test:rules` command compiles its TypeScript tests with the existing compiler into ignored `node_modules/.tmp` output and runs Node's built-in test runner without adding a dependency. The Operations Intelligence verification passed 27 Functions unit tests, 19 emulator integration tests, 29 web tests, both builds, web lint, and the guarded real-Gemini smoke. The current host provides Node 25, so emulator output records the existing Node 20 engine mismatch warning.

The real uncertain-write transition is not artificially induced in the emulator suite; its terminal non-retry behavior is integration-tested and its failure classification remains unit-tested. Automated Gemini tests use fake providers; the separate opt-in local smoke passed against real Gemini using synthetic data. No Genkit, RAG, assignment-capable agent, recursive delegation, autonomous actions, or broad assistant UI is implemented.
