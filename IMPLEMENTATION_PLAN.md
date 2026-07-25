# Implementation Plan

## Phase 0 — governance and design

1. Freeze manual-only scope and user authority.
2. Define the entry schema and state transitions.
3. Define owner-only RLS, validation layers, threats, and acceptance gates.
4. Document local setup, deployment, known limitations, and review-only status.

## Phase 1 — implementation

1. Create the Supabase migration, indexes, trigger, and RLS policies.
2. Implement email/password sign-in and sign-out.
3. Implement mobile capture, active brief, detail/editing, and archive screens.
4. Route mutations through authenticated server endpoints with Zod validation.
5. Add unit tests for schema, validation, sorting, and state transitions.
6. Add security/integration tests for unauthenticated and cross-owner access.
7. Add Playwright phone-to-desktop acceptance coverage.
8. Build and run all locally available tests.
9. Run the real Supabase acceptance workflow; remain review-only until it passes.

## Phase 1 stop condition

Stop after the manual cross-device workflow passes. Do not begin AI, MCP, integrations, automation, or Phase 2 work.
