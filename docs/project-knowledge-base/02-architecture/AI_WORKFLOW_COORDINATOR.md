# AI Workflow Coordinator Architecture

## 1. Overview & Purpose

The **AI Workflow Coordinator** (`services/coordinator/workflowCoordinator.ts`) acts as the single, safe entry point for all natural-language and assistant-driven operations within the Workflow platform. It decouples model intent classification from operational execution, ensuring that AI responses are strictly grounded, tenant-isolated, and RBAC-controlled.

## 2. Architecture & Decision Pipeline

The coordinator operates using a 4-stage decision pipeline:

```
[ User Request / Message ]
           │
           ▼
1. Deterministic Intent Routing (coordinatorRules.ts)
   ├── Match exact allowlisted operational commands (e.g. "show overdue jobs", "Smart Match Rahul")
   └── If un-matched ➔ Model Intent Classifier (Gemini Cloud Function)
           │
           ▼
2. Tool Binding & Context Validation
   ├── Verify user profile active state and organizationId tenant scope
   └── Enforce single tool execution constraint (Operations or Workforce tool)
           │
           ▼
3. Execution & Grounding (OperationsIntelligenceAgent / WorkforceIntelligenceAgent)
   ├── Operations Tool: Computes live metrics, attention flags, and workload stats
   └── Workforce Tool: Executes Eligibility ➔ MCDM Ranking (AHP-TOPSIS) ➔ Explanation Engine
           │
           ▼
4. Response Synthesis & Action Proposal
   ├── Read-only responses: Immediate deterministic summary payload returned to client
   └── Write actions (Job Creation): Prepared as Action Proposals requiring explicit user confirmation
```

## 3. Human-in-the-Loop & Action Proposal Protocol

To prevent unauthorized or unintended database modifications:

- **No Direct AI Writes**: The AI coordinator cannot perform direct mutations on Firestore business collections (`jobs`, `users`, `recommendations`).
- **Action Proposals**: Any draft creation or update request emits a durable `actionProposal` record in Firestore.
- **Explicit User Confirmation**: Write operations execute only after an active Manager or Admin confirms the proposal ID via `confirmCreateJobProposal`.

## 4. Telemetry & Error Handling

All coordinator execution paths log structured telemetry events (`coordinatorTelemetry.ts`):

- `correlationId`: Unique transaction ID tracking the lifecycle of the request.
- `errorCategory`: Categorized failure states (`invalid_input`, `unauthorized`, `model_error`, `tool_error`, `fallback`).
- `latencyMs`: Measured end-to-end routing and tool execution time.
- **Fail-Closed Fallbacks**: If model output is malformed, low-confidence (<0.70), or un-grounded, the coordinator safely returns a pre-configured `CoordinatorFallback` without exposing internal stack traces.

## 5. Security & Isolation Constraints

1. **Tenant Isolation**: `organizationId` is derived exclusively from the authenticated user's verified Firestore profile, never from client input.
2. **Role Gate**: Operational queries and proposal confirmations check `canViewDashboard` / `canCreateJob` permissions before invoking tool handlers.
3. **No External Secret Leaks**: Gemini API calls execute inside Firebase Cloud Functions (`functions/src/model/modelProvider.ts`) with credentials injected via Firebase Secrets Manager.
