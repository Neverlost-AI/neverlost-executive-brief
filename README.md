# Neverlost Command Center

A working continuity and coordination app for capturing important information, organizing it into workstreams, tracking blockers and next actions, and carrying context forward instead of rebuilding it each time.

The repository contains two intentionally separate experiences:

- **Public portfolio demo** — a fully synthetic, browser-local Command Center that recruiters and collaborators can explore without an account.
- **Private authenticated application** — a Supabase-backed cross-device workspace with account-scoped persistence and Row Level Security.

The public demo includes:

- Command Center dashboard
- capture
- triage
- workstreams and workstream detail
- entry review, edit, archive, restore, and delete
- Executive Brief
- deterministic, read-only Operator views

The demo uses fictional data only and does not read or write the private Supabase application.

**Live Demo:** [https://neverlost-executive-brief.vercel.app/demo](https://neverlost-executive-brief.vercel.app/demo)

**Repository:** [https://github.com/Neverlost-AI/neverlost-executive-brief](https://github.com/Neverlost-AI/neverlost-executive-brief)

Status: `PHASE_2A_MANUAL_COMMAND_CENTER_HUMAN_ACCEPTED`

## Architecture

Neverlost preserves capture before classification, then adds explicit owner-controlled structure around the captured material.

- Phase 1 provides the authenticated continuity inbox and Executive Brief.
- Phase 2A adds manual triage, workstreams, command states, deterministic dashboard sections, and weekly review.
- The public `/demo` routes reuse the accepted schemas, transition validators, `buildCommandCenter`, `buildOperatorSnapshot`, and `answerOperatorQuestion` logic through a browser-local persistence adapter.
- The private application uses authenticated API routes and Supabase persistence; the public demo never calls those routes.
- Operator is a deterministic, read-only attention layer. It can explain current state and propose next actions, but it cannot write, approve, send, or execute consequential actions.
- Executive Brief remains available as one view inside the broader Command Center.

There are no model calls, automatic prioritization, background agents, schedulers, external integrations, or autonomous actions in this version.

## Stack

- Next.js-compatible Vinext App Router
- TypeScript and React
- Supabase PostgreSQL and Authentication
- Supabase Row Level Security
- Zod validation
- Vitest and Playwright
- Inter typography with local font assets

Vinext retains the Next.js App Router programming model while producing a Cloudflare-compatible `dist/client` and `dist/server` worker build.

## Public Demo

The public experience is namespaced entirely under `/demo`:

- `/demo` — Command Center dashboard
- `/demo/operator` — deterministic Operator
- `/demo/brief` — Executive Brief
- `/demo/capture` — synthetic capture
- `/demo/triage` — manual triage
- `/demo/entries` and `/demo/entries/:id` — entry review and editing
- `/demo/workstreams` and `/demo/workstreams/:id` — workstream management
- `/demo/archive` — archived synthetic entries

The seeded workspace contains eight fictional entries and three fictional workstreams spanning Inbox, Active, Waiting, Blocked, Resolved, risk, stale-review, next-action, and decision states.

- State stays in namespaced browser local storage under `neverlost:portfolio-demo:v2`.
- The accepted v1 key is not read or rewritten.
- Deterministic stale and overdue behavior uses the fixed synthetic reference time September 19, 2026.
- `Reset demo` restores the full synthetic workspace.
- `Start blank` clears only the visitor's local demo workspace.
- Workstream deletion preserves related entries and returns them to a valid unassigned Inbox state.
- Demo execution makes zero Supabase requests and zero protected/private API requests.

This is a portfolio illustration using synthetic data. It is not clinical software, production healthcare software, or a claim of commercial readiness.

## Private Application

Routes outside `/demo` belong to the authenticated application.

- Supabase email/password authentication gates the workspace.
- Entries and workstreams persist across devices.
- Data is scoped to the authenticated account.
- Weekly Review and account recovery remain private.
- Operational pages require application sign-in even when the public production domain is reachable.
- Protected API methods reject anonymous requests.

### Prerequisites

- Node.js 22.13 or newer
- pnpm or npm
- A Supabase project
- One dedicated test user; two users for the ownership acceptance test

### Supabase setup

1. Create a Supabase project.
2. Apply `supabase/migrations/202607240001_create_entries.sql`.
3. Apply `supabase/migrations/202607260001_phase_2a_command_center.sql`.
4. Create a dedicated email/password test user.
5. Copy `.env.example` to `.env.local`.
6. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
7. For live Playwright acceptance, set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`.

Never add a service-role key. The public publishable/anon key is intentionally restricted by Row Level Security.

## Security & Data Boundaries

- All persisted rows are owned by `user_id`, which references `auth.users`.
- The application server derives ownership from a verified access token.
- Row Level Security independently restricts select, insert, update, and delete.
- Client input and API payloads are validated with Zod.
- Database checks restrict lengths, enums, and accepted state values.
- Entry content is not intentionally logged.
- Permanent deletion requires confirmation.
- Public demo data is embedded fictional seed data and cannot access private account state.
- Public demo links remain under `/demo`; private links are never substituted into the demo navigation.

See `PRIVACY_AND_SECURITY_MODEL.md`, `SECURITY_REVIEW.md`, and `DATA_MODEL.md`.

## Local Development

```text
pnpm install
pnpm dev
```

Open the local URL printed by the development server. `/demo` works without Supabase environment variables; authenticated routes require the two public Supabase configuration values described above.

## Validation & Testing

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The accepted expanded public-demo baseline has:

- 35 passing unit/integration tests
- 13 passing Playwright tests
- 1 credential-dependent live Supabase cross-device test skipped when dedicated credentials are absent
- 9 public-demo Playwright flows covering desktop, 390px mobile, local mutations, deterministic Operator behavior, private-route gating, zero Supabase/private-API traffic, and browser console/page errors

A skipped live-credential test is reported as skipped, not counted as an acceptance pass.

To run the database ownership test, execute `supabase/tests/entries_rls.sql` against a disposable local Supabase database after applying the migrations. It rolls its data back.

## Deployment

The current public portfolio URL is:

[https://neverlost-executive-brief.vercel.app/demo](https://neverlost-executive-brief.vercel.app/demo)

The repository includes `build/vercel-handler.mjs`, a small adapter from Vercel's Node request/response contract to the compiled Vinext worker. It preserves streaming, request bodies, and response cookies without changing application routing or authentication.

Package a validated build with:

```text
npm run build
node build/package-vercel.mjs
vercel deploy --prebuilt --archive=tgz
```

The packaging command replaces only generated `.vercel/output`, copies no environment files, serves `dist/client` through the filesystem route, and serves the worker through a Node 24 function.

The Vercel project uses the `Other` framework preset. Automatic Git deployment retains a known mismatch because the Vinext build does not directly emit the configured `.output` directory; the documented prebuilt workflow is the accepted deployment path.

Vercel Deployment Protection and application authentication are separate boundaries. The stable production domain is public for the portfolio demo, while private pages still enforce Supabase sign-in and protected APIs reject anonymous requests. Generated preview/deployment URLs remain protected under the project's Vercel protection configuration.

## Known Limitations

- Supabase project settings and a real test account are required for authenticated cross-device acceptance.
- Password recovery, MFA, rate-limit tuning, backups, retention, and incident response are configured in Supabase rather than this MVP.
- Delete is permanent and has no in-product recovery.
- Offline capture, notifications, native apps, collaboration, sharing, organizations, and integrations are not included.
- Weekly Review completion, authentication/account recovery, Supabase persistence, RLS, and real cross-device data are intentionally absent from the public representation.
- Phase 2A retains one non-blocking UX note: an empty workstream selector should explicitly say that no workstreams exist and direct the user to create one.
- The authenticated application has passed bounded human acceptance but is not presented as production healthcare or commercially ready software.

## Project History / Acceptance Records

### Phase 1 and Phase 2A

- Phase 1 established the manual cross-device continuity inbox, authenticated ownership, and Executive Brief.
- Phase 2A added the owner-controlled Command Center without changing Phase 1 values or weakening Row Level Security.
- The accepted Operator v0.1 checkpoint confirms that the Command Center can determine what deserves attention, explain why, and propose the next action without taking consequential action on its own.

### Public recruiter demo — 2026-09-18

- The first isolated public demo used seven synthetic entries: six active and one archived.
- Desktop and 390 × 844 mobile edit, review, archive, delete, Reset demo, and Start blank flows passed.
- At that acceptance point, lint, typecheck, production build, 33 unit/integration tests, and 9 Playwright tests passed; one live-credential test was skipped.
- No Supabase, schema, RLS, authentication-data, or private-application behavior changed.

### Visual-system v1 — 2026-09-19

- Inter typography, navy/ink text, restrained blue interactions, and neutral gray workspace surfaces were applied without changing workflows.
- The canonical NVLT logo is preserved as `public/brand/nvlt-official.png`.
- Inter is served locally with its OFL license.
- Desktop and mobile demo flows passed with no demo console/page errors or private API calls.

### Expanded public Command Center — 2026-09-19

- `/demo` became the Command Center landing view and Executive Brief moved to `/demo/brief`.
- The public representation expanded to eight synthetic entries, three workstreams, complete Command Center sections, entry/workstream flows, and deterministic Operator views.
- All 35 unit/integration tests passed. The full Playwright suite passed 13 tests with one credential-dependent test skipped.
- Weekly Review completion, authentication, account recovery, Supabase persistence, RLS, and real cross-device data remain intentionally private.

Historical acceptance documents remain unchanged in the repository.

### Project documents

- `PRODUCT_SPECIFICATION.md`
- `SCOPE_AND_BOUNDARIES.md`
- `PRIVACY_AND_SECURITY_MODEL.md`
- `DATA_MODEL.md`
- `ACCEPTANCE_CRITERIA.md`
- `IMPLEMENTATION_PLAN.md`
- `MANUAL_ACCEPTANCE_CHECKLIST.md`
- `KNOWN_LIMITATIONS.md`
- `SECURITY_REVIEW.md`
- `PHASE_1_MANUAL_CROSS_DEVICE_MVP_BUILD_REPORT.md`
- `PHASE_2A_MANUAL_COMMAND_CENTER_IMPLEMENTATION_REPORT.md`
- `PHASE_2A_ACCEPTANCE_CHECKPOINT.md`
- `OPERATOR_V0_1_ACCEPTANCE_CHECKPOINT.md`
- `OPERATOR_V0_1_IMPLEMENTATION_NOTES.md`

## License and Ownership

Public portfolio repository. No clinical, public-release, or commercial-production status is implied.
