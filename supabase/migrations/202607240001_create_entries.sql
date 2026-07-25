create extension if not exists pgcrypto;

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'note',
  priority text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  archived_at timestamptz,
  constraint entries_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint entries_content_length check (char_length(btrim(content)) between 1 and 20000),
  constraint entries_category_allowed check (
    category in ('note', 'decision', 'follow_up', 'reference', 'personal')
  ),
  constraint entries_priority_allowed check (priority in ('low', 'normal', 'high'))
);

create index entries_owner_active_order_idx
  on public.entries (user_id, archived_at, reviewed_at, created_at desc);

create or replace function public.set_entry_updated_at()
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

create trigger entries_set_updated_at
before update on public.entries
for each row execute function public.set_entry_updated_at();

alter table public.entries enable row level security;
alter table public.entries force row level security;

create policy "owners_select_entries"
on public.entries for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "owners_insert_entries"
on public.entries for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "owners_update_entries"
on public.entries for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "owners_delete_entries"
on public.entries for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.entries from anon;
grant select, insert, update, delete on table public.entries to authenticated;
