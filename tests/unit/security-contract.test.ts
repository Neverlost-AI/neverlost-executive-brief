import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/entries/route";

describe("API authentication", () => {
  it("rejects an unauthenticated entries request", async () => {
    const response = await GET(new Request("http://localhost/api/entries"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });
});

describe("database ownership contract", () => {
  const migration = readFileSync(
    "supabase/migrations/202607240001_create_entries.sql",
    "utf8",
  );

  it("enables and forces RLS with all four owner policies", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("force row level security");
    expect(migration).toContain('"owners_select_entries"');
    expect(migration).toContain('"owners_insert_entries"');
    expect(migration).toContain('"owners_update_entries"');
    expect(migration).toContain('"owners_delete_entries"');
    expect(migration.match(/auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("revokes anonymous table access", () => {
    expect(migration).toContain("revoke all on table public.entries from anon");
  });
});
