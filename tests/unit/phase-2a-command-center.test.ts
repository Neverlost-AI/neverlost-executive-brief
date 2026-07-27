import { describe, expect, it } from "vitest";
import { buildCommandCenter, denverDate, isStaleWorkstream, latestMeaningfulUpdate } from "../../lib/command-center";
import {
  deriveQuickCapture,
  entryUpdateSchema,
  isAllowedCommandTransition,
  type Entry,
} from "../../lib/entries";
import {
  isAllowedWorkstreamTransition,
  workstreamInputSchema,
  workstreamUpdateSchema,
  type Workstream,
} from "../../lib/workstreams";

const owner = "00000000-0000-4000-8000-000000000001";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    user_id: owner,
    title: "Captured item",
    content: "Exact source text",
    category: "note",
    priority: "normal",
    created_at: "2026-07-20T12:00:00Z",
    updated_at: "2026-07-20T12:00:00Z",
    reviewed_at: null,
    archived_at: null,
    workstream_id: null,
    command_type: "note",
    command_state: "inbox",
    next_action: null,
    due_on: null,
    review_on: null,
    triaged_at: null,
    resolved_at: null,
    ...overrides,
  };
}

function workstream(overrides: Partial<Workstream> = {}): Workstream {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    user_id: owner,
    name: "Neverlost",
    objective: "Keep consequential context held.",
    status: "active",
    health: "on_track",
    next_review_on: null,
    stale_after_days: 7,
    latest_status_update: null,
    latest_status_updated_at: null,
    completed_at: null,
    created_at: "2026-07-10T12:00:00Z",
    updated_at: "2026-07-10T12:00:00Z",
    ...overrides,
  };
}

describe("deterministic quick capture", () => {
  it("preserves normalized multiline content and derives from the first nonblank line", () => {
    expect(deriveQuickCapture("  \n  A consequential development  \nKeep this punctuation!\n  ")).toEqual({
      title: "A consequential development",
      content: "A consequential development  \nKeep this punctuation!",
      category: "note",
      priority: "normal",
      command_type: "note",
      command_state: "inbox",
      workstream_id: null,
      next_action: null,
      due_on: null,
      review_on: null,
      reviewed_at: null,
      archived_at: null,
    });
  });

  it("truncates at 160 Unicode code points without splitting a surrogate pair", () => {
    const derived = deriveQuickCapture(`${"a".repeat(159)}🧭extra\nsecond line`);
    expect(Array.from(derived.title)).toHaveLength(160);
    expect(derived.title.endsWith("🧭")).toBe(true);
    expect(derived.content).toContain("second line");
  });

  it("rejects trusted server fields supplied by a browser", () => {
    expect(entryUpdateSchema.safeParse({ user_id: owner, command_state: "active" }).success).toBe(false);
    expect(entryUpdateSchema.safeParse({ triaged_at: new Date().toISOString() }).success).toBe(false);
  });
});

describe("manual transitions and controlled values", () => {
  it("permits exactly the command-state table, including no-op edits", () => {
    expect(isAllowedCommandTransition("inbox", "active")).toBe(true);
    expect(isAllowedCommandTransition("inbox", "inbox")).toBe(true);
    expect(isAllowedCommandTransition("resolved", "waiting")).toBe(true);
  });

  it("permits only the approved workstream status transitions", () => {
    expect(isAllowedWorkstreamTransition("proposed", "active")).toBe(true);
    expect(isAllowedWorkstreamTransition("active", "proposed")).toBe(false);
    expect(isAllowedWorkstreamTransition("completed", "paused")).toBe(true);
  });

  it("applies editable creation defaults and rejects uncontrolled values", () => {
    expect(workstreamInputSchema.parse({ name: "Operations", objective: "Hold continuity." })).toMatchObject({
      status: "proposed", health: "on_track", stale_after_days: 7,
    });
    expect(workstreamInputSchema.safeParse({ name: "X", objective: "Y", health: "green" }).success).toBe(false);
    expect(workstreamUpdateSchema.safeParse({ stale_after_days: 90, health: "off_track" }).success).toBe(true);
  });
});

describe("America/Denver stale boundaries", () => {
  it("uses Denver calendar dates across spring and fall daylight-saving boundaries", () => {
    expect(denverDate("2026-03-08T06:30:00Z")).toBe("2026-03-07");
    expect(denverDate("2026-03-08T08:30:00Z")).toBe("2026-03-08");
    expect(denverDate("2026-11-01T07:30:00Z")).toBe("2026-11-01");
    expect(denverDate("2026-11-02T06:30:00Z")).toBe("2026-11-01");
  });

  it("becomes stale on the eighth local calendar day for a seven-day threshold", () => {
    const value = workstream({ created_at: "2026-03-01T19:00:00Z", updated_at: "2026-03-01T19:00:00Z" });
    expect(isStaleWorkstream(value, new Date("2026-03-09T05:59:59Z"))).toBe(false);
    expect(isStaleWorkstream(value, new Date("2026-03-09T06:00:00Z"))).toBe(true);
  });

  it("uses the chronological maximum and keeps overdue review independently sufficient", () => {
    const recentlyEdited = workstream({
      created_at: "2026-07-01T12:00:00Z",
      latest_status_updated_at: "2026-07-10T12:00:00Z",
      updated_at: "2026-07-25T12:00:00Z",
    });
    expect(latestMeaningfulUpdate(recentlyEdited)).toBe("2026-07-25T12:00:00Z");
    expect(isStaleWorkstream(recentlyEdited, new Date("2026-07-26T18:00:00Z"))).toBe(false);
    expect(isStaleWorkstream({ ...recentlyEdited, next_review_on: "2026-07-24" }, new Date("2026-07-26T18:00:00Z"))).toBe(true);
  });
});

describe("deterministic dashboard selectors", () => {
  it("applies each predicate, archived exclusion, and decision preservation", () => {
    const workstreamId = "20000000-0000-4000-8000-000000000001";
    const values = [
      entry(),
      entry({ id: "10000000-0000-4000-8000-000000000002", workstream_id: workstreamId, command_type: "action", command_state: "active", next_action: "Write the brief", due_on: "2026-07-25" }),
      entry({ id: "10000000-0000-4000-8000-000000000003", workstream_id: workstreamId, command_state: "waiting", review_on: null }),
      entry({ id: "10000000-0000-4000-8000-000000000004", workstream_id: workstreamId, command_state: "blocked" }),
      entry({ id: "10000000-0000-4000-8000-000000000005", workstream_id: workstreamId, command_type: "decision", command_state: "resolved", resolved_at: "2026-07-24T12:00:00Z", triaged_at: "2026-07-21T12:00:00Z" }),
      entry({ id: "10000000-0000-4000-8000-000000000006", command_state: "inbox", archived_at: "2026-07-25T12:00:00Z" }),
    ];
    const result = buildCommandCenter(values, [workstream({ id: workstreamId, health: "at_risk" })], new Date("2026-07-26T18:00:00Z"));
    expect(result.needsTriage.map(({ id }) => id)).toEqual(["10000000-0000-4000-8000-000000000001"]);
    expect(result.nextActions).toHaveLength(1);
    expect(result.waiting).toHaveLength(1);
    expect(result.blockedEntries).toHaveLength(1);
    expect(result.atRiskWorkstreams).toHaveLength(1);
    expect(result.recentDecisions).toHaveLength(1);
    expect(result.recentDecisions[0]?.command_state).toBe("resolved");
  });
});
