import { describe, expect, it } from "vitest";
import { answerOperatorQuestion, buildOperatorSnapshot } from "../../lib/operator";
import type { Entry } from "../../lib/entries";
import type { Workstream } from "../../lib/workstreams";

const owner = "00000000-0000-4000-8000-000000000001";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    user_id: owner,
    title: "Captured item",
    content: "Exact source text",
    category: "note",
    priority: "normal",
    created_at: "2026-08-20T12:00:00Z",
    updated_at: "2026-08-20T12:00:00Z",
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
    name: "Career",
    objective: "Maintain job-search continuity.",
    status: "active",
    health: "on_track",
    next_review_on: null,
    stale_after_days: 7,
    latest_status_update: null,
    latest_status_updated_at: null,
    completed_at: null,
    created_at: "2026-08-20T12:00:00Z",
    updated_at: "2026-08-20T12:00:00Z",
    ...overrides,
  };
}

describe("Operator v0.1 deterministic read model", () => {
  it("ranks blocked and overdue work ahead of ordinary next actions", () => {
    const values = [
      entry({ id: "10000000-0000-4000-8000-000000000002", title: "Blocked", command_state: "blocked" }),
      entry({ id: "10000000-0000-4000-8000-000000000003", title: "Overdue", command_state: "active", next_action: "Follow up", due_on: "2026-08-21" }),
      entry({ id: "10000000-0000-4000-8000-000000000004", title: "Normal", command_state: "active", next_action: "Draft note" }),
    ];
    const snapshot = buildOperatorSnapshot(values, [workstream()], new Date("2026-08-22T18:00:00Z"));
    expect(snapshot.proposals.map((value) => value.id).slice(0, 3)).toEqual([
      "blocked:10000000-0000-4000-8000-000000000002",
      "next:10000000-0000-4000-8000-000000000003",
      "next:10000000-0000-4000-8000-000000000004",
    ]);
    expect(snapshot.proposals.every((value) => value.authority === "HUMAN_APPROVAL_REQUIRED")).toBe(true);
    expect(snapshot.proposals.every((value) => value.state === "PROPOSED")).toBe(true);
  });

  it("turns due waiting and stale workstreams into review proposals without mutating source state", () => {
    const waiting = entry({
      command_state: "waiting",
      review_on: "2026-08-22",
      workstream_id: "20000000-0000-4000-8000-000000000001",
    });
    const stale = workstream({ created_at: "2026-08-01T12:00:00Z", updated_at: "2026-08-01T12:00:00Z", stale_after_days: 7 });
    const snapshot = buildOperatorSnapshot([waiting], [stale], new Date("2026-08-22T18:00:00Z"));
    expect(snapshot.proposals.some((value) => value.id.startsWith("waiting:"))).toBe(true);
    expect(snapshot.proposals.some((value) => value.id.startsWith("stale:"))).toBe(true);
    expect(waiting.command_state).toBe("waiting");
    expect(stale.status).toBe("active");
  });

  it("answers the bounded Ask Neverlost prompts from the same snapshot", () => {
    const snapshot = buildOperatorSnapshot([entry()], [workstream()], new Date("2026-08-22T18:00:00Z"));
    expect(answerOperatorQuestion("What needs attention?", snapshot)).toContain("need attention");
    expect(answerOperatorQuestion("What am I waiting on?", snapshot)).toBe("Nothing is currently marked waiting.");
    expect(answerOperatorQuestion("What changed recently?", snapshot)).toContain("Most recently updated active items");
  });
});
