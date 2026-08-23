# Operator v0.1 implementation notes

Status: `UNACCEPTED_DEVELOPMENT_BRANCH`

This patch adds a read-only Operator layer on top of the human-accepted Phase 2A manual Command Center. It intentionally does not modify the Phase 2A database schema, Supabase RLS policies, authentication model, accepted-state fields, or release authorization.

## Added

- `/operator` route and primary navigation link.
- Deterministic `lib/operator.ts` read model.
- Human-review proposals derived from blocked items, at-risk workstreams, overdue/defined next actions, waiting items, stale workstreams, and inbox triage.
- Bounded “Ask Neverlost” interaction for four deterministic questions:
  - What needs attention?
  - What am I waiting on?
  - What changed recently?
  - What should I work on next?
- Operator unit tests.

## Authority boundary

Every Operator proposal is `PROPOSED` and `HUMAN_APPROVAL_REQUIRED`.

Operator v0.1 does not:

- persist proposals;
- mutate entries or workstreams;
- call an AI model;
- send messages;
- submit applications;
- schedule work;
- create background jobs;
- change Supabase migrations or RLS;
- deploy or promote any environment.

## Next acceptance step

Run the existing validation suite plus the new Operator unit tests, inspect `/operator` locally, and confirm that Phase 2A views still behave identically before any commit or remote push is considered accepted.
