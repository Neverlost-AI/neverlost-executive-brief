# Neverlost Executive Brief

Status: `PHASE_1_MANUAL_CROSS_DEVICE_MVP_HUMAN_ACCEPTED`

A private, manual cross-device inbox for continuity items. Capture an item on a phone, then review, edit, archive, restore, or delete it from a computer using the same Supabase-authenticated account.

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

Do not expose the review environment publicly before security and human acceptance are complete.

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
- Phase 1 human acceptance passed using the protected private preview. No production deployment exists, the app is not production-ready, Phase 2 has not started, and public launch or commercial readiness is not approved.

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

## License and ownership

Private review project. No public-release or production status is implied.
