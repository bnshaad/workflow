# Multi-Agent AI Architecture

**Implementation status date:** 2026-07-16

## 1. Purpose

The multi-agent layer connects Workflow's AI modules through controlled orchestration. It improves modularity and practical usability without allowing autonomous operational changes.

## 2. Design principle

Use a small coordinator-and-specialists model. Agents reason and prepare results; deterministic application services read or mutate trusted data.

```text
User request
  -> Coordinator
      -> Job Intelligence Agent
      -> Workforce Intelligence Agent
      -> Operations Intelligence Agent
      -> Knowledge Agent
  -> Proposed response or proposed action
  -> Explicit user confirmation for critical writes
  -> Existing authorized service executes
  -> Audit log and result
```

## 3. Agents

The boundaries below are the approved target architecture. The active specialist slices are Job Intelligence, read-only Workforce Intelligence, and bounded read-only Operations Intelligence.

### Coordinator

Responsibilities:

- Validate request context and user role
- Classify intent using rules first and model routing only when needed
- Select the minimum required specialist agents
- Prevent recursive or unrestricted agent loops
- Merge specialist outputs
- Produce either an informational response or a structured proposed action

The coordinator must not directly write to Firestore.

### Job Intelligence Agent

- Convert natural-language service requests into strict structured job drafts
- Mark uncertain or missing fields
- Never create the job automatically

### Workforce Intelligence Agent

- Load eligible employees through authorized tools
- Invoke the deterministic weighted-score or AHP-TOPSIS engine
- Return ranked candidates and criterion-grounded explanations
- Never invent scores or employee facts

### Operations Intelligence Agent

- Summarize authorized, tenant-scoped operational data from one trusted callable
- Report urgent unassigned jobs, overdue jobs, deterministic attention flags, ranked workload counts, and open-operation counts
- Explain attention flags using only returned rule codes
- Never claim overload because no approved threshold exists
- Never predict delay, risk, failure, or burnout
- Never write, prepare proposals, notify users, or change job or employee state

### Knowledge Agent

- Retrieve relevant chunks from approved organization documents
- Answer with sources
- State when no grounded answer is available
- Never use untrusted web knowledge as company policy

## 4. Efficient routing

The coordinator should use a routing cascade:

1. Exact command and UI-context rules
2. Lightweight intent classification
3. Specialist call only when required
4. Parallel calls only for independent read-only work
5. No call to unrelated agents

Examples:

- "Show urgent unassigned jobs" -> Operations Insight only
- "What does the AC safety SOP say?" -> Knowledge only
- "Create an urgent AC job" -> Job Intelligence, then proposed create action
- "Create a job and suggest a technician" -> Job Intelligence, then Workforce Intelligence after draft validation

## 5. Tool boundary

Each agent receives a narrow allowlist of typed tools. Tools must:

- Derive `organizationId` and user identity from trusted auth context
- Enforce RBAC in the service layer and Firestore Rules
- Validate input and output schemas
- Return bounded data
- Avoid exposing secrets or unrestricted collection access
- Be idempotent where practical

## 6. Proposed-action contract

Critical writes must return a structured proposal rather than execute immediately.

```ts
interface ProposedAction<TPayload> {
  proposalId: string;
  actionType: CriticalActionType;
  organizationId: string;
  requestedBy: string;
  payload: TPayload;
  summary: string;
  warnings: string[];
  requiresConfirmation: true;
  expiresAt: string;
}
```

Confirmation must bind to the proposal ID, authenticated user, organization, action type, and payload hash/version. Revalidate authorization and current entity state before execution.

## 7. Critical-action execution

```text
Agent prepares proposal
 -> UI displays exact effect
 -> Manager explicitly confirms
 -> Trusted service revalidates auth, tenant, permissions, proposal expiry, and entity version
 -> Existing domain service executes once
 -> Audit log records proposal, confirmer, result, and failure if any
```

The trusted callable records the supported `job_created` audit event and owns lifecycle transitions for the persisted create-job proposal. Browser clients may prepare and read only their own proposals; they cannot transition execution state.

A conversational "yes" without an active, displayed, unexpired proposal is not sufficient.

## 8. Reliability controls

- Maximum orchestration steps per request
- Maximum specialist calls per request
- Timeouts and graceful partial results
- Structured schemas for all model outputs
- No hidden chain of agent delegation
- Correlation ID for tracing
- Safe fallback to normal UI
- Read-only default
- Duplicate-execution protection
- Prompt-injection isolation for retrieved documents

## 9. Verified implementation boundary

The repository currently contains a typed TypeScript coordinator foundation in the manager web application. Exact supported commands use fixed deterministic routes with zero model calls. Operations Intelligence supports:

- Show urgent unassigned jobs
- Show overdue jobs
- Show jobs requiring attention
- Show workforce workload distribution
- Summarize open operations
- Explain why the current job is flagged

Other implemented coordinator commands remain:

- Recommend an employee for the current job
- Explain the current top recommendation
- Compare the top two candidates
- Prepare an editable job draft
- Prepare a proposed create-job action from an editable structured draft

When no exact route matches, the coordinator may make one server-side Gemini classification call. The fixed model classification allowlist includes the six operations intents and drafting intents plus `recommend_employee_for_job`, `explain_recommendation`, and `compare_top_candidates`. The returned intent must pass a strict client and server contract, meet the confidence threshold, and map to a fixed allowlisted tool. Low-confidence, malformed, clarifying, and unsupported results fall back to existing screens. The model cannot select arbitrary tools or functions. An operations request invokes at most one classifier and one trusted operations tool, with no recursive specialist calls.

The trusted Operations Intelligence callable reloads the active manager or admin profile and derives the tenant from it. It reads at most the latest 200 active jobs and, for workload, at most 100 active employee profiles; public attention and workload lists are capped at 10. High or Urgent open jobs with no assignment are urgent unassigned. Active jobs past due are overdue unless completed or cancelled. Assigned-past-due and in-progress-past-due are explicit attention reasons. Workload counts only assigned and in-progress jobs. Summaries are deterministic formatting over the returned contract and never add missing facts, overload thresholds, predictions, or risk language.

The first Workforce Intelligence slice is read-only. It requires a current job ID, invokes `getWorkforceRecommendation` once, and presents only candidate names, ranks, scores, engine reasons, and warnings returned by `rule-based-v1`. Candidate comparison and explanation are deterministic formatting steps; the model does not calculate scores, add facts, alter ranking, persist a recommendation, create a proposal, or execute assignment.

The `draftJobFromRequest` callable produces an editable structured draft containing only current job fields, missing fields, uncertain fields, and warnings. It does not receive tenant data beyond the authenticated authorization check, does not create proposals, and does not create jobs. Unknown details remain empty. The current Create Job surface can use this draft or a deliberately opted-in local development stub; the manager still edits the form and any coordinator proposal uses the existing durable confirmation flow.

The Gemini provider uses the single server-side model `gemini-3.1-flash-lite`. Draft extraction uses a flat transport schema with strings and string arrays, including `dueDateText` and `locationText`, before strict normalization into the shared public draft contract. Relative dates that cannot be resolved safely remain `null` with a warning. Thought signatures and other metadata are never stored or returned.

The job-creation proposal is stored in `actionProposals`, binds to the requesting user and organization, expires after five minutes, and preserves a payload hash. Confirmation calls the `confirmCreateJobProposal` Firebase callable by proposal ID only. The callable reloads trusted profile and proposal data, atomically claims `processing`, validates the canonical payload, writes the job and audit record through the Admin SDK, and records `completed`, `failed`, `expired`, or `reconciliation_required` as appropriate. The proposal ID is the deterministic job ID, so retries return the completed job rather than creating another.

No broad conversational UI, RAG, knowledge retrieval, Genkit setup, assignment execution, model-based authorization, or autonomous critical-action execution is implemented in this phase. The dashboard contains only a compact operations insight panel with fixed read-only views. The Gemini provider is implemented behind a Firebase Secret and a local emulator-only opt-in; no public deployment exists.

Workflow remains on Spark with Auth, Firestore, and Functions emulators. Public deployment and Blaze are deferred until public access is required. Local real-Gemini testing requires gitignored `functions/.secret.local`, explicit `WORKFLOW_USE_REAL_GEMINI=true`, and `npm run test:ai:local`; the command refuses CI and non-emulator endpoints and uses synthetic text only. Without opt-in, model callables fail closed, and automated tests use fake providers. The controlled local smoke passed with all classification and draft scenarios, concise metadata-only output, and zero protected collection changes.

The coordinator now has a fixed, versioned synthetic evaluation corpus, `coordinator-functional-v1`. Its 35 cases cover six deterministic Operations commands, six natural or ambiguous Operations requests, six unsupported mutations, thirteen boundary and ambiguity cases, and four other supported no-write coordinator flows. The fake-provider runner executes the real coordinator and verifies validated intent, classifier and model-call budgets, tool selection, tool-call budgets, safe rejection, deterministic grounding, response completeness, structured telemetry, and zero write-capable tool invocations. This is a controlled functional conformance check, not a statistical accuracy benchmark or evidence of production language coverage.

No prompt, customer detail, employee detail, full response, or model payload is placed in coordinator telemetry. The in-process event is limited to `correlationId`, `routeSource`, `validatedIntent`, `toolName`, `modelCallCount`, `toolCallCount`, `durationMs`, `outcome`, `normalizedError`, `groundingStatus`, and the constant `writeAttempted: false`. Values are bounded and normalized before logging. These events are not persisted, exported, or displayed in a UI by this phase, and write-capable proposal paths do not emit a no-write event.

## 10. Future Firebase fit

The current model boundary reuses the existing minimal trusted boundary:

- Firebase Authentication for identity
- Firestore for operational data
- Firebase Storage for approved documents and proof
- Existing TypeScript services for business rules
- Firebase callable Functions for model classification, draft extraction, trusted read-only workforce ranking, and trusted read-only operations insight
- `GEMINI_API_KEY` as a Firebase Secret bound only to those callables
- An approved model provider for language understanding only when deterministic routing is insufficient

Do not place privileged multi-agent tools or secrets directly in the browser.

The durable proposal ledger retains its server-verified payload hash, lifecycle, and idempotency key for create-job execution. Each additional critical action still requires its own validation, audit, lifecycle, and reconciliation design before it may use this boundary. The Knowledge Agent and any broader approved coordinator UI remain future work.

## 11. Evaluation

The repository command `apps/web-app/: npm run evaluate:coordinator` reports concise controlled functional metrics: routing pass rate, unsupported-request rejection, deterministic classifier bypass, correct tool selection, grounding compliance, no-write safety, response completeness, average model calls, and average tool calls. Results must be described as pass rates over the fixed corpus, never as production accuracy.

The optional `functions/: WORKFLOW_USE_REAL_GEMINI=true npm run evaluate:operations:real` command runs the guarded emulator-only Operations subset over nine synthetic, non-personal real-model requests. It requires a gitignored local key, refuses CI and non-emulator endpoints, emits route summaries rather than prompts or full responses, and asserts that protected collection counts do not change. The 2026-07-16 spot-check passed, including destructive, predictive, and unsupported historical requests; it remains a manual provider check and is not part of the deterministic automated gate.

Future broader evaluation may measure:

- Intent-routing accuracy
- Unnecessary agent calls
- Average model calls per request, with exact deterministic routes remaining zero
- Structured-output validity
- Tool success and failure rates
- Critical-action confirmation compliance
- End-to-end task completion time
- Recommendation acceptance and override rate
- Grounded-answer source accuracy
