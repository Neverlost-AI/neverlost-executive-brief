begin;

do $$
declare
  user_a uuid := '11111111-1111-4111-8111-111111111111';
  user_b uuid := '22222222-2222-4222-8222-222222222222';
  entry_a uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
  values
    (user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test', ''),
    (user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test', '')
  on conflict (id) do nothing;

  insert into public.entries (user_id, title, content)
  values (user_a, 'Owner A', 'Private entry')
  returning id into entry_a;

  perform set_config('request.jwt.claim.sub', user_b::text, true);
  set local role authenticated;

  if exists (select 1 from public.entries where id = entry_a) then
    raise exception 'RLS failure: user B read user A entry';
  end if;

  update public.entries set title = 'Forbidden' where id = entry_a;
  if found then
    raise exception 'RLS failure: user B updated user A entry';
  end if;

  delete from public.entries where id = entry_a;
  if found then
    raise exception 'RLS failure: user B deleted user A entry';
  end if;
end;
$$;

rollback;
