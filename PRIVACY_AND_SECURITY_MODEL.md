# Privacy and Security Model

Status: `REVIEW_ONLY`

## Assets

Entry titles, content, categories, priorities, timestamps, and account identifiers are private user data.

## Trust boundaries

1. The browser authenticates with Supabase using the public project URL and anon key.
2. Mutations pass through application API routes and carry the user's access token.
3. API routes validate the token and payload, then query Supabase with the anon key plus the user's JWT.
4. PostgreSQL Row Level Security independently restricts every row to `auth.uid() = user_id`.

### Public portfolio demo boundary

The `/demo` route family is a separate client-only mode. It starts from fictional synthetic fixtures and persists optional reviewer changes only in namespaced browser local storage (`neverlost:portfolio-demo:v1`). It does not initialize the Supabase client, call authenticated `/api/entries` routes, create users, or depend on hosted environment variables. All demo navigation remains under `/demo`.

## Controls

- No service-role key is present in browser code or required by the app.
- Secrets and project configuration live in environment variables; `.env.example` contains placeholders only.
- Zod validates browser submissions and API payloads.
- SQL `NOT NULL`, length, and controlled-value checks provide database-side validation.
- Select, insert, update, and delete each have explicit owner-only RLS policies.
- API queries also filter by the verified user ID as defense in depth.
- Entry content is not written to application logs.
- Delete requires an explicit confirmation step.
- Public demo screens visibly identify synthetic data and state that no real patient information is present.
- Resetting or clearing the demo affects only browser-local synthetic state.

## Threats addressed

- Cross-account reads or writes: blocked by RLS and owner filters.
- User-ID spoofing: the server derives `user_id` from the verified JWT and ignores client ownership fields.
- Invalid workflow values: blocked by Zod and SQL checks.
- Leaked privileged credentials: no service-role key is used.
- Accidental automatic action: no scheduler, worker job, integration, or AI exists.

## Remaining MVP risks

- Email/password security, MFA, session lifetime, rate limits, and recovery settings depend on the configured Supabase project.
- A compromised user session can act as that user.
- Permanent deletion has no in-product undo.
- Backups, retention, regional hosting, and incident response are Supabase/project-owner responsibilities.
- Human acceptance against the real hosted environment is still required before any readiness claim.
