# Known Limitations

Status: `PHASE_1_MANUAL_CROSS_DEVICE_MVP_REVIEW_ONLY`

- A configured Supabase project and dedicated test account are required for sign-in and real cross-device persistence.
- The full acceptance workflow is intentionally skipped when `E2E_TEST_EMAIL` or `E2E_TEST_PASSWORD` is absent. A skipped test is not a pass.
- The supplied RLS SQL test must run against a disposable Supabase database; it was not run in this environment.
- Password recovery, MFA, session lifetime, rate limiting, backups, retention, regional hosting, and incident response are Supabase project settings outside this application.
- Delete is permanent and has no in-product undo.
- The MVP requires a network connection; it has no offline capture queue.
- It has no AI, automatic interpretation, automatic prioritization, external integrations, monitoring, notifications, background jobs, organizations, billing, public sharing, browser extension, or native mobile app.
- The project has not completed human acceptance and must not be described as production-ready.
