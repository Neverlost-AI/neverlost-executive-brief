# Neverlost Executive Brief

Status: `PHASE_2A_MANUAL_COMMAND_CENTER_HUMAN_ACCEPTED`

A private, manual cross-device continuity inbox and owner-controlled Command Center. Phase 1 capture remains preserved while Phase 2A adds manual triage, workstreams, command states, deterministic dashboard views, and weekly review.

The repository also includes a public recruiter-facing portfolio demo at `/demo`. The demo is an isolated client-side workspace with synthetic data; it does not authenticate, read or write Supabase, or call the authenticated entry APIs.

There is no AI, automatic summarization, prioritization, external integration, monitoring, scheduler, or background action.

## Stack

- Next.js-compatible Vinext App Router, TypeScript, and React
- Supabase PostgreSQL and Authentication
- Supabase Row Level Security
- Zod validation
- Vitest and Playwright

The site starter uses Vinext to produce the Cloudflare Worker-compatible build required by OpenAI Sites while retaining the Next.js App Router programming model.

## Prerequisites

- Node.js 22.13 or newer
- pnpm
- A Supabase project
- One dedicated test user; two users for the ownership acceptance test

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run:
   `supabase/migrations/202607240001_create_entries.sql`
3. Create a dedicated email/password test user.
4. Copy `.env.example` to `.env.local`.
5. Set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
6. For Playwright, set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`.

Never add a service-role key. The public anon key is intentionally restricted by RLS.

## Local development

```text
pnpm install
pnpm dev
```

Open the local URL printed by the development server.

### Application modes

#### Private authenticated mode

- Routes outside `/demo` use Supabase email/password authentication.
- Data is scoped to the authenticated account and protected by Row Level Security.
- Entries and workstreams persist across devices through the existing authenticated API routes.

#### Public portfolio demo

- Public recruiter demo: https://neverlost-executive-brief-ce7hc9koe-neverlost-ai1.vercel.app/demo
- No authentication or environment variables are required.
- The seeded workspace contains fictional synthetic records only.
- Demo mutations stay in namespaced browser local storage under `neverlost:portfolio-demo:v1`.
- `Reset demo` restores the original seed and `Start blank` clears only the local demo workspace.
- The demo performs no Supabase reads or writes and is not production clinical software.

### Public demo acceptance — 2026-09-18

- Desktop demo lifecycle passed. Fresh mobile acceptance confirmed native delete and Start blank confirmations, persisted deletion/empty state, and usable empty-state controls at 390 × 844. No application-code fix was required.
- Reset restored the original seven synthetic entries: six active and one archived. Demo changes remain local to each visitor's browser.
- The public URL returned HTTP 200 anonymously; all 11 private page routes displayed the sign-in gate and all 15 protected API checks returned HTTP 401. Another protected preview still returned HTTP 302.
- Lint, typecheck, production build, and 33 unit/integration tests passed. The existing Playwright suite passed 9 tests; its live-credential cross-device test was skipped, not counted as a pass. Validation ran from an isolated source copy without local environment files.
- No production deployment, project-wide protection change, Supabase change, or packaging change was made for closeout.

### Visual-system v1 acceptance — 2026-09-19

- Accepted functional baseline `112bd62a918e80d3230b4a17100813494531c65c` was pushed unchanged before the visual pass.
- Branding follows the supplied Brand Overview Card: Inter typography, navy/ink text, restrained blue interactions, and neutral gray workspace surfaces. The canonical `NVLT Offical Logo (1).png` is preserved byte-for-byte as `public/brand/nvlt-official.png`. Existing layouts and workflows are unchanged.
- Inter is served locally with its OFL license. This corrects a deployed Vinext font-loader issue that emitted Windows file URLs; no build packaging or application behavior was changed.
- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test` (33 passed), `npm.cmd run build`, and `npm.cmd run test:e2e` (9 passed, 1 live-credential test skipped) passed from an isolated source copy without local environment files.
- The final preview passed desktop and mobile loading/layout, edit/reload, review, archive, confirmed delete, Reset demo, and confirmed Start blank/reload. Both test contexts were restored to six active plus one archived synthetic entry. Inter loaded successfully, with no demo console/page errors or private API calls.
- Anonymous `/demo` returned HTTP 200; 11 private pages required sign-in and 15 protected API checks returned HTTP 401. Another protected preview returned HTTP 302. Only the final preview hostname received a new protection exception; the superseded font-test preview's exception was revoked.
- No production deployment, Supabase/schema/RLS change, project-wide protection change, environment-file change, or unrelated packaging change was made. The existing automatic Git deployment `.output` mismatch remains a separate known issue.

## Validation

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:acceptance
```

The acceptance test skips when dedicated Supabase test credentials are absent. A skip is not an acceptance pass.

To run the database ownership test, execute `supabase/tests/entries_rls.sql` against a disposable local Supabase database after applying the migration. It rolls its data back.

## Deployment

1. Apply the migration to the target Supabase project.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as hosted runtime variables.
3. Build the validated source.
4. Deploy privately for review.
5. Run `MANUAL_ACCEPTANCE_CHECKLIST.md` against the deployed URL.
6. Verify that `/demo` renders without Supabase environment variables before sharing that public demo URL.

Only the isolated synthetic `/demo` experience is intended for public portfolio viewing. Do not expose private account credentials or weaken authentication/RLS for the authenticated routes.

### Vercel/Vinext deployment note

The linked Vercel project currently uses the `Other` framework preset with `npm run build` and an `.output` output directory. This Vinext application instead emits a Cloudflare-compatible `dist/client` plus `dist/server` worker, so Git-based Vercel builds cannot deploy it by merely changing the output directory. `dist/client` is not a standalone application, and the repository must not manufacture a placeholder `.output` directory.

The repository includes a small deployment adapter in `build/vercel-handler.mjs` that translates Vercel's Node request/response contract to the compiled Vinext worker. It preserves streaming, request bodies, and response cookies. It does not change application routing or authentication. Package and deploy a preview with:

```text
npm run build
node build/package-vercel.mjs
vercel deploy --prebuilt --archive=tgz
```

The packaging command replaces only generated `.vercel/output` and copies no environment files. It serves `dist/client` through the filesystem route and the worker through a Node 24 function. Existing images use `unoptimized`; Cloudflare image-transformation bindings are not supplied by this adapter.

The public `/demo` route itself requires no Supabase environment variables; the preserved private routes still require the two Supabase variables above. Automatic Git deployment retains the known `.output` mismatch and should remain disabled until its configuration is separately updated. Vercel Deployment Protection is independent of application authentication: the current recruiter preview has an exact-hostname exception for `neverlost-executive-brief-ce7hc9koe-neverlost-ai1.vercel.app`. The previously accepted `phgw4u519` preview remains available as a recovery preview. Project-wide protection is unchanged. Each exception covers its hostname, not only `/demo`; operational/private pages still require application sign-in and protected APIs reject anonymous requests. This is a non-production, synthetic portfolio demo.

## Data and security

- All rows are owned by `user_id`, which references `auth.users`.
- The application server derives ownership from the verified access token.
- RLS independently restricts select, insert, update, and delete.
- Client input and API payloads are validated with Zod.
- Database checks restrict lengths, category, and priority.
- Entry content is not intentionally logged.
- Permanent deletion requires confirmation.

See `PRIVACY_AND_SECURITY_MODEL.md`, `SECURITY_REVIEW.md`, and `DATA_MODEL.md`.

## Known limitations

- Supabase project settings and a real test account are required for authentication and cross-device acceptance.
- Password recovery, MFA, rate-limit tuning, backups, retention, and incident response are configured in Supabase rather than this MVP.
- Delete is permanent and has no in-product recovery.
- Offline capture, notifications, native apps, collaboration, sharing, organizations, and integrations are not included.
- Phase 1 and Phase 2A human acceptance passed using protected private previews. Phase 2A has one non-blocking UX note: an empty workstream selector should explicitly say that no workstreams exist and direct the user to create one. No production deployment is authorized, the app is not production-ready, and public launch or commercial readiness is not approved.
- The public demo is a portfolio illustration with browser-local synthetic data. It does not claim clinical, production, or commercial readiness.

## Project documents

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

## License and ownership

Private review project. No public-release or production status is implied.
