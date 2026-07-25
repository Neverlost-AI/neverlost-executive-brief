import { describe, expect, it } from "vitest";
import {
  entryInputSchema,
  entrySchema,
  entryUpdateSchema,
  sortActiveEntries,
  type Entry,
} from "../../lib/entries";

const base: Entry = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  title: "Example",
  content: "Private content",
  category: "note",
  priority: "normal",
  created_at: "2026-07-24T12:00:00.000Z",
  updated_at: "2026-07-24T12:00:00.000Z",
  reviewed_at: null,
  archived_at: null,
};

describe("entry validation", () => {
  it("accepts the controlled manual input", () => {
    expect(
      entryInputSchema.parse({
        title: "  Decision to revisit  ",
        content: "Keep the original wording.",
        category: "decision",
        priority: "high",
      }),
    ).toEqual({
      title: "Decision to revisit",
      content: "Keep the original wording.",
      category: "decision",
      priority: "high",
    });
  });

  it("rejects empty, oversized, and uncontrolled fields", () => {
    expect(
      entryInputSchema.safeParse({
        title: "",
        content: "",
        category: "generated",
        priority: "urgent",
      }).success,
    ).toBe(false);
  });

  it("accepts explicit review and archive state transitions", () => {
    expect(entryUpdateSchema.safeParse({ reviewed_at: new Date().toISOString() }).success).toBe(true);
    expect(entryUpdateSchema.safeParse({ reviewed_at: null, archived_at: null }).success).toBe(true);
  });

  it("accepts PostgreSQL timestamps with explicit UTC offsets", () => {
    expect(
      entrySchema.safeParse({
        ...base,
        created_at: "2026-07-25T07:15:30.123456+00:00",
        updated_at: "2026-07-25T07:15:30.123456+00:00",
      }).success,
    ).toBe(true);
  });
});

describe("active brief ordering", () => {
  it("puts unreviewed entries first and sorts newest within each group", () => {
    const ordered = sortActiveEntries([
      { ...base, id: "33333333-3333-4333-8333-333333333333", reviewed_at: "2026-07-24T13:00:00.000Z" },
      { ...base, id: "44444444-4444-4444-8444-444444444444", created_at: "2026-07-24T14:00:00.000Z" },
      { ...base, id: "55555555-5555-4555-8555-555555555555", created_at: "2026-07-24T13:00:00.000Z" },
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual([
      "44444444-4444-4444-8444-444444444444",
      "55555555-5555-4555-8555-555555555555",
      "33333333-3333-4333-8333-333333333333",
    ]);
  });
});
