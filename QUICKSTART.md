<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Quickstart

This quickstart is for engineers and operations support staff who need a running local instance.

## Outcome

After this guide, you should have:

- API running locally
- Dashboard running locally
- A basic verification path for source/status and chart views
- A troubleshooting path for common startup and data issues

## Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+

Recommended:
- isolated Python environment (venv/conda/poetry)
- two terminals (API and dashboard)

## 1) Python setup

From repo root, install API and core packages into your active environment:

```bash
pip install -e ./apps/api
pip install -e ./packages/domain
pip install -e ./packages/predictive
```

If your environment uses additional package boundaries from `packages/*`, install those as needed for your route/test scope.

## 2) Environment configuration

Provider credentials are optional for local preview workflows.

- If credentials are missing, routes should expose degraded/auth-required states.
- Do not add real secrets to repo files.

If your team uses `.env` loading, keep secrets local and out of version control.

## 3) Dashboard setup

The active frontend is the Vue 3 dashboard in `apps/dashboard/src`.
The older React implementation is kept only as a backup/reference under `apps/dashboard/src/react-backup`.

```bash
cd apps/dashboard
npm install
```

If lockfile conflicts occur, use your team policy (clean install or lock refresh) before continuing.

## 4) Run API

From repo root:

```bash
uvicorn dispatchlayer_api.main:app --reload --app-dir apps/api/src
```

API default URL: `http://localhost:8000`

Expected startup result:
- Uvicorn starts without import errors
- `/docs` loads in browser

## 5) Run dashboard

In a second terminal:

```bash
cd apps/dashboard
npm run dev
```

Dashboard default URL: `http://localhost:3001`
Dashboard default URL: `http://localhost:3000`

Expected startup result:
- Vite server starts
- Vue dashboard shell loads without hard crash

## 6) Baseline verification checklist

- Open dashboard and navigate Sources and Charts pages
- Confirm API docs load at `/docs`
- Confirm no immediate runtime exceptions in terminal logs

Frontend implementation check:

- `src/main.ts` is the Vite entrypoint
- `src/router.ts` owns the active SPA route table
- `src/react-backup` is not used by `npm run dev` or `npm run build`

Recommended deeper checks:

1. Sources page shows honest status categories (connected/auth-required/cached)
2. Charts page selections render without placeholder fall-through
3. Bands page renders charts without vertical overflow behavior
4. API route samples return warnings when providers are unavailable

## 7) Build checks

Dashboard build:

```bash
cd apps/dashboard
npm run build
```

API tests (if available in your environment):

```bash
cd apps/api
pytest
```

## 8) Data expectations in local preview

Local behavior may combine:

- live public provider calls (when available)
- snapshot-backed responses from `data/source_snapshots`
- demo captures under `data/raw/curl/production_demo`

This is expected for professional preview workflows.

## Common Failure Modes

- Missing module imports:
  - Cause: dependencies installed into a different Python environment
  - Fix: reinstall in current environment

- Empty or sparse site context:
  - Cause: missing source snapshot/demo files or provider failures
  - Fix: check `data/source_snapshots` and provider warning fields

- Port already in use:
  - Cause: existing local process
  - Fix: stop the conflicting process on port 3000 or run Vite with an alternate port

## API/Dashboard mismatch troubleshooting

- Symptom: dashboard page loads but cards/charts are empty
  - Check API route response payloads and warning fields
  - Check browser console for route/asset load errors

- Symptom: route returns data but UI status labels look wrong
  - Validate status mapping in dashboard page logic
  - Confirm backend source status fields are explicit

- Symptom: TypeScript compile failures in dashboard
  - Run `npx tsc --noEmit` inside `apps/dashboard`
  - Fix type contract drift between chart components and data shape

## Operational handoff notes

For shift-to-shift or engineer-to-operator handoff, include:

1. running commit/hash
2. active provider credential state
3. known degraded routes/connectors
4. unresolved warnings and owner
