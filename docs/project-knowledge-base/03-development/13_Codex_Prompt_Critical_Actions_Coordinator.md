# Codex Prompt — Critical Actions and Efficient Multi-Agent Coordinator

You are working in the existing Workflow repository. First audit the repository and the project knowledge base. Treat implemented code as the source of truth where older documentation is stale. Do not perform a broad rewrite.

## Goal

Implement the safest minimal foundation for an efficient human-in-the-loop multi-agent coordinator, with strict handling of critical actions, and update the knowledge base to match the verified repository state.

## Current project context

Workflow is a Firebase-based, multi-tenant workforce operations platform. The manager web application already includes authentication, RBAC, tenant isolation, jobs, job lifecycle management, assignment/reassignment/unassignment, job activities, dashboard metrics, audit/evaluation reads, demo data, and a development AI Job Understanding stub. Verify every claim in the repository before relying on it.

The target AI architecture is:

- Coordinator
- Job Intelligence specialist
- Workforce Intelligence specialist
- Operations Insight specialist
- Knowledge specialist

Do not implement all specialists fully in this phase. Build the coordinator foundation and one or two safe vertical slices using existing services.

## Mandatory first step: repository audit

Inspect:

- package/workspace structure
- auth and profile context
- role and organization guards
- jobs, assignments, job activities, audit logs, dashboard and AI services
- existing AI Job Understanding stub
- Firestore Rules and indexes
- current tests, lint and build commands
- knowledge-base files

Report the verified current phase and identify stale documentation before editing.

## Architecture requirements

### 1. Efficient coordinator

Implement rule-first selective routing:

1. Exact supported commands and current UI context
2. Lightweight intent classification only when rules are insufficient
3. Call only the required specialist/tool
4. Run independent read-only calls in parallel only when useful
5. Enforce a maximum orchestration-step count and maximum model/tool-call count
6. Return a safe fallback when confidence is low

Do not call every agent for every request. Do not allow recursive or unrestricted agent-to-agent loops.

### 2. Trusted boundaries

- The coordinator and specialists must not write directly to Firestore.
- Wrap existing application services in narrow typed tool adapters.
- Derive user ID, role, and organization ID from trusted auth context; never accept organization ID from model output as authority.
- Preserve current service-layer validation and Firestore Security Rules.
- Use strict schemas for all model and tool inputs/outputs.
- Do not store hidden chain-of-thought or model reasoning.

### 3. Critical actions

Treat these as critical actions:

- create job
- assign, reassign, or unassign employee
- change job status
- cancel/delete job
- resolve incident
- send operational notification
- modify user role, organization settings, assignment criteria, or knowledge documents

An agent may only prepare a `ProposedAction`; it must not execute the action.

Create or adapt a typed contract similar to:

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
  entityVersion?: string;
}
```

The UI must display the exact proposed effect. Execution requires explicit confirmation tied to the active proposal. Before execution, revalidate:

- authenticated user
- role/permission
- organization membership
- proposal expiry
- proposal payload integrity
- current entity state/version
- duplicate execution status

Then call the existing trusted domain service and append the appropriate audit/job activity record.

A generic conversational “yes” without a visible active proposal is not confirmation.

### 4. Initial supported vertical slices

Prefer these minimal slices if they fit the existing code:

#### Read-only

- show urgent unassigned jobs
- summarize open jobs
- show overloaded employees

#### Proposed action

- create an editable job draft from natural language, then prepare a proposed create-job action
- find recommended employees using the existing deterministic assignment service if present; otherwise define the adapter without inventing an unfinished ranking engine

Do not silently create or assign anything.

### 5. Reliability and efficiency

Add practical safeguards:

- typed routing result
- allowed-intent enum
- allowed-tool registry per specialist
- correlation/request ID
- timeout handling
- maximum steps/calls
- bounded query results
- structured validation errors
- idempotency or duplicate-confirmation protection
- graceful fallback to the existing normal UI
- concise operational logging without prompts, secrets, or personal data

Keep model use minimal. Deterministic rules and algorithms should remain deterministic. The Workforce specialist should call the assignment engine; it must not invent candidate scores.

### 6. Firebase and secrets

Keep Firebase as the primary backend. Privileged orchestration must run in an existing trusted server-side environment if one exists. If none exists, add only the smallest justified serverless boundary and document why it is necessary. Never expose Gemini/API credentials in browser code. Do not add billing-dependent infrastructure without clearly documenting it.

### 7. Knowledge-base reconciliation

Update the existing knowledge base after verifying the code:

- Record the actual current implementation stage and date.
- Standardize `jobs` as the primary entity; mark stale `tasks` references as superseded.
- Approve/document `jobActivities` if verified.
- Document the coordinator, specialist boundaries, tool boundary, and critical-action confirmation flow.
- Clarify that adaptive learning is feedback collection/analysis only.
- Clarify that real-time is not claimed where listeners are not implemented.
- Separate completed, current, next, and future scope.
- Do not duplicate documentation; modify canonical files or add one clearly linked architecture/status file only where necessary.

## Testing

Add focused tests for:

- routing to the correct specialist/tool
- unrelated agents not being called
- unsupported/low-confidence intent fallback
- proposal creation without write execution
- confirmation required for critical actions
- expired, modified, cross-tenant, unauthorized, and duplicate proposals being rejected
- successful confirmed action using the existing service
- organization isolation
- structured-output validation

Run the repository's existing lint, type-check, test, and build commands. Do not weaken tests or security rules to make checks pass.

## Scope constraints

Do not:

- implement autonomous assignment
- add automatic learning/retraining
- build all agents at once
- add unrestricted web browsing
- create a new chatbot UI if an existing assistant surface can be reused
- replace existing services or Firebase architecture
- introduce a large agent framework unless clearly required
- create temporary/debug/backup files or duplicate docs
- add dependencies unless strictly necessary
- commit secrets or generated output

Review `git status` before completion. Modify the minimum required files.

## Deliverable

Return:

1. Verified current repository stage
2. Architecture and security findings
3. Files changed with reasons
4. Supported coordinator intents and routes
5. Critical-action confirmation design
6. Tests and verification results
7. Knowledge-base updates
8. Remaining limitations and the next smallest phase

If the repository lacks a secure server-side execution boundary or a completed assignment engine, do not pretend otherwise. Implement only safe interfaces/foundations and clearly report the limitation.
