import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const migrationPath = resolve(
  projectRoot,
  "supabase/migrations/202607260001_phase_2a_command_center.sql",
);
const rollbackPath = resolve(
  projectRoot,
  "supabase/rollbacks/202607260001_phase_2a_command_center_down.sql",
);

const databases: PGlite[] = [];

async function sqlFile(path: string) {
  return readFile(path, "utf8");
}

async function phase1Database() {
  const db = new PGlite({ extensions: { pgcrypto } });
  databases.push(db);
  await db.exec(`
    create role authenticated nologin;
    create role anon nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    insert into auth.users (id) values
      ('00000000-0000-4000-8000-000000000001'),
      ('00000000-0000-4000-8000-000000000002');
  `);
  await db.exec(
    await sqlFile(
      resolve(projectRoot, "supabase/migrations/202607240001_create_entries.sql"),
    ),
  );
  await db.exec(
    await sqlFile(
      resolve(projectRoot, "supabase/fixtures/phase_1_production_like_entries.sql"),
    ),
  );
  return db;
}

async function setOwner(db: PGlite, ownerId: string) {
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = '${ownerId}';`);
}

async function resetOwner(db: PGlite) {
  await db.exec('reset role; reset "request.jwt.claim.sub";');
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

describe("Phase 2A additive PostgreSQL migration", () => {
  it("preserves every Phase 1 value and assigns only approved defaults", async () => {
    const db = await phase1Database();
    const before = await db.query(`
      select id, user_id, title, content, category, priority,
             created_at::text, updated_at::text, reviewed_at::text, archived_at::text
      from public.entries order by id
    `);

    await db.exec(await sqlFile(migrationPath));

    const after = await db.query(`
      select id, user_id, title, content, category, priority,
             created_at::text, updated_at::text, reviewed_at::text, archived_at::text
      from public.entries order by id
    `);
    expect(after.rows).toEqual(before.rows);

    const defaults = await db.query<{
      command_type: string;
      command_state: string;
      workstream_id: string | null;
      next_action: string | null;
      due_on: string | null;
      review_on: string | null;
      triaged_at: string | null;
      resolved_at: string | null;
    }>(`
      select command_type, command_state, workstream_id, next_action,
             due_on, review_on, triaged_at, resolved_at
      from public.entries order by id
    `);
    expect(defaults.rows).toHaveLength(3);
    for (const row of defaults.rows) {
      expect(row).toEqual({
        command_type: "note",
        command_state: "inbox",
        workstream_id: null,
        next_action: null,
        due_on: null,
        review_on: null,
        triaged_at: null,
        resolved_at: null,
      });
    }
  });

  it("forces owner-only RLS on all Phase 2A tables", async () => {
    const db = await phase1Database();
    await db.exec(await sqlFile(migrationPath));
    await db.exec(`
      insert into public.workstreams (id, user_id, name, objective) values
        ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Owner one', 'Private to owner one'),
        ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Owner two', 'Private to owner two');
      insert into public.user_preferences (user_id) values
        ('00000000-0000-4000-8000-000000000001'),
        ('00000000-0000-4000-8000-000000000002');
    `);

    const security = await db.query<{ relname: string; rls: boolean; forced: boolean }>(`
      select relname, relrowsecurity as rls, relforcerowsecurity as forced
      from pg_class
      where relnamespace = 'public'::regnamespace
        and relname in ('entries', 'workstreams', 'user_preferences')
      order by relname
    `);
    expect(security.rows).toEqual([
      { relname: "entries", rls: true, forced: true },
      { relname: "user_preferences", rls: true, forced: true },
      { relname: "workstreams", rls: true, forced: true },
    ]);

    const policies = await db.query<{ tablename: string; count: number }>(`
      select tablename, count(*)::int as count
      from pg_policies
      where schemaname = 'public'
        and tablename in ('entries', 'workstreams', 'user_preferences')
      group by tablename order by tablename
    `);
    expect(policies.rows).toEqual([
      { tablename: "entries", count: 4 },
      { tablename: "user_preferences", count: 4 },
      { tablename: "workstreams", count: 4 },
    ]);

    await setOwner(db, "00000000-0000-4000-8000-000000000001");
    expect((await db.query("select id from public.entries")).rows).toHaveLength(2);
    expect((await db.query("select id from public.workstreams")).rows).toHaveLength(1);
    expect((await db.query("select user_id from public.user_preferences")).rows).toHaveLength(1);
    await db.exec(
      `update public.workstreams set name = 'Intrusion' where id = '20000000-0000-4000-8000-000000000002'`,
    );
    await resetOwner(db);

    const untouched = await db.query<{ name: string }>(`
      select name from public.workstreams
      where id = '20000000-0000-4000-8000-000000000002'
    `);
    expect(untouched.rows[0]?.name).toBe("Owner two");
  });

  it("rejects cross-owner workstream assignment and preserves entries on deletion", async () => {
    const db = await phase1Database();
    await db.exec(await sqlFile(migrationPath));
    await db.exec(`
      insert into public.workstreams (id, user_id, name, objective) values
        ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Owner one', 'Deletion test'),
        ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Owner two', 'Isolation test');
    `);

    await expect(
      db.exec(`
        update public.entries
        set workstream_id = '20000000-0000-4000-8000-000000000002', command_state = 'active'
        where id = '10000000-0000-4000-8000-000000000001'
      `),
    ).rejects.toThrow(/foreign key|entries_workstream_same_owner_fk/i);

    await db.exec(`
      update public.entries
      set workstream_id = '20000000-0000-4000-8000-000000000001',
          command_state = 'resolved', command_type = 'action',
          next_action = 'Preserve this action', due_on = '2026-08-01', review_on = '2026-08-02'
      where id = '10000000-0000-4000-8000-000000000001';
    `);
    const beforeDelete = await db.query<Record<string, unknown>>(`
      select id, user_id, title, content, category, priority, created_at::text,
             updated_at::text, reviewed_at::text, archived_at::text, command_type,
             next_action, due_on::text, review_on::text, triaged_at::text, resolved_at::text
      from public.entries where id = '10000000-0000-4000-8000-000000000001'
    `);

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5));
    await db.exec(`delete from public.workstreams where id = '20000000-0000-4000-8000-000000000001'`);
    const afterDelete = await db.query<Record<string, unknown>>(`
      select id, user_id, title, content, category, priority, created_at::text,
             updated_at::text, reviewed_at::text, archived_at::text, command_type,
             next_action, due_on::text, review_on::text, triaged_at::text, resolved_at::text,
             workstream_id, command_state
      from public.entries where id = '10000000-0000-4000-8000-000000000001'
    `);

    const beforeRow = beforeDelete.rows[0]!;
    const afterRow = afterDelete.rows[0]!;
    for (const key of [
      "id", "user_id", "title", "content", "category", "priority", "created_at",
      "reviewed_at", "archived_at", "command_type", "next_action", "due_on",
      "review_on", "triaged_at",
    ]) {
      expect(afterRow[key]).toEqual(beforeRow[key]);
    }
    expect(Date.parse(afterRow.updated_at as string)).toBeGreaterThanOrEqual(
      Date.parse(beforeRow.updated_at as string),
    );
    expect(afterRow.workstream_id).toBeNull();
    expect(afterRow.command_state).toBe("inbox");
    expect(afterRow.resolved_at).toBeNull();
    expect((await db.query("select id from public.entries")).rows).toHaveLength(3);
  });

  it("enforces controlled defaults, uniqueness, privileges, and transition timestamps", async () => {
    const db = await phase1Database();
    await db.exec(await sqlFile(migrationPath));

    const anonymousPrivileges = await db.query(`
      select table_name from information_schema.role_table_grants
      where grantee = 'anon' and table_schema = 'public'
        and table_name in ('entries', 'workstreams', 'user_preferences')
    `);
    expect(anonymousPrivileges.rows).toHaveLength(0);

    await db.exec(`
      insert into public.workstreams (id, user_id, name, objective)
      values ('20000000-0000-4000-8000-000000000001',
              '00000000-0000-4000-8000-000000000001',
              'Manual Operations', 'Keep the work bounded');
    `);
    const defaults = await db.query(`
      select status, health, stale_after_days
      from public.workstreams where id = '20000000-0000-4000-8000-000000000001'
    `);
    expect(defaults.rows[0]).toEqual({ status: "proposed", health: "on_track", stale_after_days: 7 });

    await expect(db.exec(`
      insert into public.workstreams (user_id, name, objective)
      values ('00000000-0000-4000-8000-000000000001', ' manual operations ', 'Duplicate')
    `)).rejects.toThrow(/workstreams_owner_name_unique_idx|duplicate key/i);

    await db.exec(`
      update public.workstreams
      set status = 'active', health = 'off_track', stale_after_days = 90,
          latest_status_update = 'Owner-written update'
      where id = '20000000-0000-4000-8000-000000000001';
    `);
    const updated = await db.query<Record<string, unknown>>(`
      select status, health, stale_after_days, latest_status_updated_at::text, completed_at::text
      from public.workstreams where id = '20000000-0000-4000-8000-000000000001'
    `);
    expect(updated.rows[0]).toMatchObject({ status: "active", health: "off_track", stale_after_days: 90, completed_at: null });
    expect(updated.rows[0]?.latest_status_updated_at).not.toBeNull();

    await db.exec(`
      update public.entries
      set workstream_id = '20000000-0000-4000-8000-000000000001', command_state = 'active'
      where id = '10000000-0000-4000-8000-000000000001';
      update public.entries set command_state = 'resolved'
      where id = '10000000-0000-4000-8000-000000000001';
    `);
    const resolved = await db.query<Record<string, unknown>>(`
      select triaged_at::text, resolved_at::text from public.entries
      where id = '10000000-0000-4000-8000-000000000001'
    `);
    expect(resolved.rows[0]?.triaged_at).not.toBeNull();
    expect(resolved.rows[0]?.resolved_at).not.toBeNull();
    await db.exec(`
      update public.entries set command_state = 'active'
      where id = '10000000-0000-4000-8000-000000000001';
      update public.workstreams set status = 'completed'
      where id = '20000000-0000-4000-8000-000000000001';
    `);
    expect((await db.query<Record<string, unknown>>(`select resolved_at::text from public.entries where id = '10000000-0000-4000-8000-000000000001'`)).rows[0]?.resolved_at).toBeNull();
    expect((await db.query<Record<string, unknown>>(`select completed_at::text from public.workstreams where id = '20000000-0000-4000-8000-000000000001'`)).rows[0]?.completed_at).not.toBeNull();

    await db.exec(`
      update public.workstreams set status = 'paused', latest_status_update = null
      where id = '20000000-0000-4000-8000-000000000001';
    `);
    expect((await db.query(`select completed_at, latest_status_updated_at from public.workstreams where id = '20000000-0000-4000-8000-000000000001'`)).rows[0]).toEqual({ completed_at: null, latest_status_updated_at: null });
  });

  it("rolls back to the exact Phase 1 column set while preserving Phase 1 values", async () => {
    const db = await phase1Database();
    const before = await db.query(`select * from public.entries order by id`);
    await db.exec(await sqlFile(migrationPath));
    await db.exec(await sqlFile(rollbackPath));

    const columns = await db.query<{ column_name: string }>(`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'entries'
      order by ordinal_position
    `);
    expect(columns.rows.map((row) => row.column_name)).toEqual([
      "id", "user_id", "title", "content", "category", "priority",
      "created_at", "updated_at", "reviewed_at", "archived_at",
    ]);
    expect((await db.query(`select * from public.entries order by id`)).rows).toEqual(before.rows);
    expect(
      (await db.query(`select to_regclass('public.workstreams') as relation`)).rows[0],
    ).toEqual({ relation: null });
    expect(
      (await db.query(`select to_regclass('public.user_preferences') as relation`)).rows[0],
    ).toEqual({ relation: null });
  });
});
