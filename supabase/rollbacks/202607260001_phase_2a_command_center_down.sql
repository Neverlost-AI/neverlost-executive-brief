-- DESTRUCTIVE WARNING:
-- This rollback permanently drops all Phase 2A workstreams, preferences, command
-- fields, dates, transitions, and indexes. Export meaningful Phase 2A data first.
-- Run only against a disposable copy or after explicit human authorization.
begin;

drop trigger if exists entries_set_command_transition_timestamps on public.entries;
drop function if exists public.set_entry_command_transition_timestamps();

drop index if exists public.entries_owner_workstream_idx;
drop index if exists public.entries_owner_command_state_idx;

alter table public.entries
  drop constraint if exists entries_workstream_same_owner_fk,
  drop constraint if exists entries_workstream_required_after_triage,
  drop constraint if exists entries_next_action_length,
  drop constraint if exists entries_command_state_allowed,
  drop constraint if exists entries_command_type_allowed,
  drop column if exists resolved_at,
  drop column if exists triaged_at,
  drop column if exists review_on,
  drop column if exists due_on,
  drop column if exists next_action,
  drop column if exists command_state,
  drop column if exists command_type,
  drop column if exists workstream_id;

drop table if exists public.user_preferences;
drop function if exists public.set_user_preferences_updated_at();
drop table if exists public.workstreams;
drop function if exists public.set_workstream_transition_timestamps();

commit;
