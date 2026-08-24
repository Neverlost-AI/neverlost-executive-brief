# Password Recovery v0.1

Bounded addition to the `operator-v0.1` branch.

## Adds
- `/reset-password` recovery-request route.
- "Forgot password?" action on sign-in.
- Supabase `resetPasswordForEmail` flow using a local `/reset-password` redirect.
- Detection of Supabase `PASSWORD_RECOVERY` auth events and `type=recovery` URL markers, including existing links that return to the app root.
- Authenticated password update via `supabase.auth.updateUser({ password })`.
- No public signup, no service-role key, no database/RLS changes.

## Verification
Run:
- `npm.cmd run typecheck`
- `npm.cmd test`

Then request a fresh recovery link and set the password from the recovery screen.
