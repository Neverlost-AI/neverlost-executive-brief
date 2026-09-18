# Security Review

Status: `PHASE_1_MANUAL_CROSS_DEVICE_MVP_REVIEW_ONLY`

Review date: 2026-07-24

## Result

The source implements the intended defense-in-depth ownership model. Static and unit checks pass. The database policies have not been exercised against a real Supabase project in this environment, so this review is not a production-readiness approval.

## Controls verified in source

- The browser receives only the Supabase project URL and anon key.
- No service-role key is referenced, required, or exposed.
- The API verifies the bearer token with Supabase before accessing data.
- `user_id` is derived from the verified user and is never accepted from entry input.
- Every API read and mutation includes an owner filter.
- PostgreSQL RLS is enabled and forced.
- Separate owner-only select, insert, update, and delete policies use `auth.uid()`.
- Anonymous table privileges are revoked.
- Zod validates create and update payloads.
- Database constraints independently validate required fields, lengths, categories, and priorities.
- API error responses do not return entry data or raw provider errors.
- Application code does not intentionally log entry titles or content.
- Destructive deletion requires a browser confirmation.
- The public `/demo` mode is isolated from Supabase and authenticated application APIs, uses synthetic fixtures only, and namespaces optional local persistence specifically to the demo.

## Verification completed

- Unit tests validate schema boundaries and ordering.
- An API test confirms unauthenticated list access returns `401`.
- A source contract test confirms RLS and anonymous-access controls exist.
- A transactional SQL ownership test is supplied for a disposable Supabase database.
- The application typecheck, lint, responsive setup-state browser test, and production build pass.

## Verification still required

- Apply the migration to a disposable Supabase project.
- Run `supabase/tests/entries_rls.sql` with a database role allowed to create the two test identities.
- Run the Playwright lifecycle test with dedicated test credentials.
- Manually confirm that User A cannot read or mutate User B's entry.
- Review Supabase MFA, password recovery, session duration, rate limits, backups, retention, region, and incident-response settings.

## Residual risks

- A stolen authenticated session can act with the user's authority.
- The MVP has no in-product recovery for permanent deletion.
- Availability, backups, and disaster recovery depend on the configured Supabase project.
- Browser-stored authentication sessions remain subject to endpoint and browser security.
- A deployment is not useful or acceptable until its Supabase environment variables and authentication policy are configured.
