# Neverlost Command Center — Operator v0.1

A greenfield, deterministic-first Command Center shell for the Neverlost Operator architecture.

## Current boundary

This version intentionally performs **no OpenAI API calls, no Supabase writes, no email/calendar/GitHub ingestion, and no external actions**.

It demonstrates the core Operator loop:

1. Read structured workstream + command-item state.
2. Surface what needs attention, what is waiting, what is blocked, and what is stale.
3. Generate deterministic bounded proposals.
4. Require human approval before any consequential action.

The `Accept / Hold / Reject` buttons are local UI state only.

## Run locally

Open PowerShell in the Command Center folder and run:

```powershell
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

Type-check:

```powershell
npm run typecheck
```

Build:

```powershell
npm run build
```

## Install into the empty local workspace

Extract/copy the contents of this project into:

```text
C:\Users\35jsu\OneDrive\Documents\ChatGPT\Neverlost Command Center
```

Do **not** copy another `.git` directory over the existing empty `.git`; this scaffold intentionally contains no `.git` directory.

Then commit locally when you are satisfied:

```powershell
git add .
git commit -m "Initialize Neverlost Command Center Operator v0.1"
```

## Architecture

- `src/domain/operator.ts` — explicit Command Center / Operator domain types.
- `src/operator/buildOperatorView.ts` — deterministic read model and proposal logic.
- `src/data/seed.ts` — temporary seeded demo state.
- `app/ui.tsx` — Jarvis-like Operator interface.
- `app/globals.css` — responsive Command Center presentation.

## Next bounded steps

### v0.2 — Persistent memory
Replace `src/data/seed.ts` with a private Supabase-backed repository while preserving deterministic read-model behavior.

### v0.3 — Accepted → Sync
Add an authenticated intake endpoint for accepted artifacts/events created in external workspaces. Store the artifact/event first; propose structured state changes separately.

### v0.4 — Low-cost AI interpretation
Add an optional low-cost model for extraction / matching / summarization only after deterministic retrieval has bounded the context.

### v0.5 — External connectors
Add Gmail, Calendar, GitHub, and other event ingestion behind explicit authority policies.

## Product rule

> Deterministic code before tokens. Preserve evidence before interpretation. Capability does not imply authority.
