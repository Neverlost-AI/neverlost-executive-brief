begin;

create table public.workstreams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  objective text not null,
  status text not null default 'proposed',
  health text not null default 'on_track',
  next_review_on date,
  stale_after_days smallint not null default 7,
  latest_status_update text,
  latest_status_updated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workstreams_owner_identity unique (id, user_id),
  constraint workstreams_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint workstreams_objective_length check (char_length(btrim(objective)) between 1 and 2000),
  constraint workstreams_status_allowed check (status in ('proposed', 'active', 'paused', 'completed')),
  constraint workstreams_health_allowed check (health in ('on_track', 'at_risk', 'off_track')),
  constraint workstreams_stale_after_days_range check (stale_after_days between 1 and 90),
  constraint workstreams_latest_status_length check (
    latest_status_update is null or char_length(btrim(latest_status_update)) between 1 and 4000
  )
);

create unique index workstreams_owner_name_unique_idx
  on public.workstreams (user_id, lower(btrim(name)));
create index workstreams_owner_status_order_idx
  on public.workstreams (user_id, status, updated_at desc);

create or replace function public.set_workstream_transition_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();

  if new.latest_status_update is distinct from old.latest_status_update then
    new.latest_status_updated_at = case
      when new.latest_status_update is null then null
      else now()
    end;
  else
    new.latest_status_updated_at = old.latest_status_updated_at;
  end if;

  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at = now();
  elsif new.status <> 'completed' and old.status = 'completed' then
    new.completed_at = null;
  else
    new.completed_at = old.completed_at;
  end if;

  return new;
end;
$$;

create trigger workstreams_set_transition_timestamps
before update on public.workstreams
for each row execute function public.set_workstream_transition_timestamps();

alter table public.workstreams enable row level security;
alter table public.workstreams force row level security;

create policy "owners_select_workstreams"
on public.workstreams for select to authenticated
using ((select auth.uid()) = user_id);
create policy "owners_insert_workstreams"
on public.workstreams for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "owners_update_workstreams"
on public.workstreams for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "owners_delete_workstreams"
on public.workstreams for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.workstreams from anon;
grant select, insert, update, delete on table public.workstreams to authenticated;

alter table public.entries
  add column workstream_id uuid,
  add column command_type text not null default 'note',
  add column command_state text not null default 'inbox',
  add column next_action text,
  add column due_on date,
  add column review_on date,
  add column triaged_at timestamptz,
  add column resolved_at timestamptz,
  add constraint entries_command_type_allowed check (
    command_type in ('note', 'action', 'decision', 'risk', 'question', 'commitment')
  ),
  add constraint entries_command_state_allowed check (
    command_state in ('inbox', 'active', 'waiting', 'blocked', 'resolved')
  ),
  add constraint entries_next_action_length check (
    next_action is null or char_length(btrim(next_action)) between 1 and 1000
  ),
  add constraint entries_workstream_required_after_triage check (
    command_state = 'inbox' or workstream_id is not null
  ),
  add constraint entries_workstream_same_owner_fk
    foreign key (workstream_id, user_id)
    references public.workstreams (id, user_id)
    on delete set null (workstream_id);

create index entries_owner_command_state_idx
  on public.entries (user_id, archived_at, command_state, due_on, created_at desc);
create index entries_owner_workstream_idx
  on public.entries (user_id, workstream_id, archived_at, command_state);

create or replace function public.set_entry_command_transition_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.command_state = 'inbox' and new.command_state <> 'inbox' and old.triaged_at is null then
    new.triaged_at = now();
  else
    new.triaged_at = old.triaged_at;
  end if;

  if new.command_state = 'resolved' and old.command_state <> 'resolved' then
    new.resolved_at = now();
  elsif old.command_state = 'resolved' and new.command_state <> 'resolved' then
    new.resolved_at = null;
  else
    new.resolved_at = old.resolved_at;
  end if;

  if old.workstream_id is not null and new.workstream_id is null then
    new.command_state = 'inbox';
    if old.command_state = 'resolved' then
      new.resolved_at = null;
    end if;
  end if;

  return new;
end;
$$;

create trigger entries_set_command_transition_timestamps
before update on public.entries
for each row execute function public.set_entry_command_transition_timestamps();

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_weekly_review_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_preferences_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_user_preferences_updated_at();

alter table public.user_preferences enable row level security;
alter table public.user_preferences force row level security;

create policy "owners_select_user_preferences"
on public.user_preferences for select to authenticated
using ((select auth.uid()) = user_id);
create policy "owners_insert_user_preferences"
on public.user_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "owners_update_user_preferences"
on public.user_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "owners_delete_user_preferences"
on public.user_preferences for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.user_preferences from anon;
grant select, insert, update, delete on table public.user_preferences to authenticated;

commit;
