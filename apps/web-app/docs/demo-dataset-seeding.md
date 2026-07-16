# Workflow Demo Dataset Seeding

This utility is development-only. It is never imported by the app and never runs
automatically.

## What It Seeds

- Demo organization: `Workflow Demo Services`
- Organization ID: `demo-org-001`
- Firestore profiles for:
  - 1 admin
  - 2 managers
  - 10 active employees
- 32 AC/electronics service jobs across all job statuses
- Job activities for status, assignment, start, and completion events
- Audit logs for matching lifecycle events

The normal seed script does not create Firebase Authentication users. For the
local Firebase emulator only, use the dedicated command below to create
matching fake Auth users and profiles.

## Safety Requirements

The script refuses to run unless all of these are true:

- `WORKFLOW_DEMO_SEED_ENABLED=true`
- `WORKFLOW_FIREBASE_ENV=development`
- `NODE_ENV` is not `production`
- `VITE_FIREBASE_PROJECT_ID` does not look production-like
- `VITE_FIREBASE_PROJECT_ID` is not listed in
  `WORKFLOW_PRODUCTION_FIREBASE_PROJECT_IDS`
- The required confirmation flag is passed

Use Firebase Admin credentials through one of:

- `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json`
- `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'`
- `FIREBASE_SERVICE_ACCOUNT_BASE64=<base64-json>`

## Seed Demo Data

From `apps/web-app`:

```bash
WORKFLOW_DEMO_SEED_ENABLED=true \
WORKFLOW_FIREBASE_ENV=development \
npm run seed:demo -- --confirm=SEED_WORKFLOW_DEMO_SERVICES
```

## Seed the Local Emulator and Sign In

Start the Firebase emulator suite from `functions/`, then run this from
`apps/web-app`:

```bash
npm run seed:demo:emulator
```

Use `manager@workflow.local` with password `WorkflowDemo-Only-123!`.

This command refuses any project other than `workflow-integration` and requires
the Auth and Firestore emulator hosts. It never targets Firebase production.

## Reset and Re-Seed Demo Data

This deletes only documents with `organizationId == "demo-org-001"` in:

- `users`
- `jobs`
- `jobActivities`
- `auditLogs`

It also deletes `organizations/demo-org-001`.

From `apps/web-app`:

```bash
WORKFLOW_DEMO_SEED_ENABLED=true \
WORKFLOW_FIREBASE_ENV=development \
npm run seed:demo -- \
  --reset \
  --confirm=SEED_WORKFLOW_DEMO_SERVICES \
  --confirm-reset=DELETE_WORKFLOW_DEMO_SERVICES
```

No production data paths are modified by this utility when the safety checks are
left intact.
