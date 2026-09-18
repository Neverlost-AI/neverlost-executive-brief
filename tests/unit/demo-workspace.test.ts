import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDemoEntry,
  deleteDemoEntry,
  DEMO_SEED_ENTRIES,
  parseStoredDemoEntries,
  seedDemoEntries,
  updateDemoEntry,
} from "../../lib/demo-workspace";

describe("public synthetic demo workspace", () => {
  it("ships a realistic seven-entry seed spanning review, priority, category, and archive states", () => {
    const entries = seedDemoEntries();
    expect(entries).toHaveLength(7);
    expect(entries.filter((entry) => !entry.archived_at && !entry.reviewed_at)).toHaveLength(3);
    expect(entries.filter((entry) => !entry.archived_at && entry.reviewed_at)).toHaveLength(3);
    expect(entries.filter((entry) => entry.archived_at)).toHaveLength(1);
    expect(new Set(entries.map((entry) => entry.category)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(entries.map((entry) => entry.priority))).toEqual(new Set(["low", "normal", "high"]));
    expect(entries.every((entry) => /fictional|synthetic|sample/i.test(entry.content))).toBe(true);
  });

  it("creates, reviews, archives, restores, edits, and deletes only in-memory entries", () => {
    const created = createDemoEntry(
      { title: "Synthetic test item", content: "Fictional content", category: "follow_up", priority: "high" },
      "d0000000-0000-4000-8000-000000000099",
      "2026-09-17T18:00:00.000Z",
    );
    let entries = [created];
    entries = updateDemoEntry(entries, created.id, { reviewed_at: "2026-09-17T18:01:00.000Z" }, "2026-09-17T18:01:00.000Z");
    expect(entries[0]?.reviewed_at).not.toBeNull();
    entries = updateDemoEntry(entries, created.id, { archived_at: "2026-09-17T18:02:00.000Z" }, "2026-09-17T18:02:00.000Z");
    expect(entries[0]?.archived_at).not.toBeNull();
    entries = updateDemoEntry(entries, created.id, { archived_at: null, title: "Edited synthetic item" }, "2026-09-17T18:03:00.000Z");
    expect(entries[0]).toMatchObject({ archived_at: null, title: "Edited synthetic item" });
    expect(deleteDemoEntry(entries, created.id)).toEqual([]);
  });

  it("resets with fresh copies and rejects invalid stored data", () => {
    const first = seedDemoEntries();
    first[0]!.title = "Changed locally";
    const reset = seedDemoEntries();
    expect(reset[0]?.title).toBe(DEMO_SEED_ENTRIES[0]?.title);
    expect(parseStoredDemoEntries(JSON.stringify(reset))).toEqual(reset);
    expect(parseStoredDemoEntries('{"not":"entries"}')).toBeNull();
  });

  it("keeps the demo source outside authenticated API and Supabase clients", () => {
    const source = readFileSync("components/DemoApp.tsx", "utf8");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain('"/api/');
    expect(source).not.toContain("getBrowserSupabase");
    expect(source).not.toContain("SupabaseClient");
  });
});
