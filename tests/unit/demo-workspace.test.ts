import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCommandCenter } from "../../lib/command-center";
import {
  addDemoEntry,
  createDemoEntry,
  createDemoWorkstream,
  deleteDemoEntry,
  deleteDemoWorkstream,
  DEMO_REFERENCE_NOW,
  DEMO_STORAGE_KEY,
  parseStoredDemoWorkspace,
  seedDemoWorkspace,
  updateDemoEntry,
  updateDemoWorkstream,
} from "../../lib/demo-workspace";
import { answerOperatorQuestion, buildOperatorSnapshot } from "../../lib/operator";

describe("public synthetic demo workspace v2", () => {
  it("ships a deterministic fictional Command Center seed", () => {
    const workspace = seedDemoWorkspace();
    expect(DEMO_STORAGE_KEY).toBe("neverlost:portfolio-demo:v2");
    expect(workspace.reference_now).toBe(DEMO_REFERENCE_NOW);
    expect(workspace.entries).toHaveLength(8);
    expect(workspace.workstreams).toHaveLength(3);
    expect(new Set(workspace.entries.map((entry) => entry.command_state))).toEqual(
      new Set(["inbox", "active", "waiting", "blocked", "resolved"]),
    );
    expect(new Set(workspace.workstreams.map((workstream) => workstream.health))).toEqual(
      new Set(["on_track", "at_risk", "off_track"]),
    );
    expect(workspace.entries.every((entry) => /fictional|synthetic|sample/i.test(entry.content))).toBe(true);
    expect(workspace.workstreams.every((workstream) => /fictional|synthetic|sample/i.test(`${workstream.objective} ${workstream.latest_status_update}`))).toBe(true);

    const command = buildCommandCenter(workspace.entries, workspace.workstreams, new Date(workspace.reference_now));
    expect(command.needsTriage).toHaveLength(1);
    expect(command.activeWorkstreams).toHaveLength(3);
    expect(command.nextActions).toHaveLength(2);
    expect(command.blockedEntries).toHaveLength(1);
    expect(command.atRiskWorkstreams).toHaveLength(2);
    expect(command.waiting).toHaveLength(1);
    expect(command.recentDecisions).toHaveLength(2);
    expect(command.staleWorkstreams).toHaveLength(2);
  });

  it("uses the accepted deterministic Operator without mutating source state", () => {
    const workspace = seedDemoWorkspace();
    const before = structuredClone(workspace);
    const snapshot = buildOperatorSnapshot(workspace.entries, workspace.workstreams, new Date(workspace.reference_now));
    expect(snapshot.proposals.length).toBeGreaterThan(0);
    expect(snapshot.proposals[0]?.summary).toContain("Review blocked item");
    expect(answerOperatorQuestion("What needs attention?", snapshot)).toContain("need attention");
    expect(answerOperatorQuestion("What am I waiting on?", snapshot)).toContain("waiting");
    expect(answerOperatorQuestion("What changed recently?", snapshot)).toContain("Most recently updated");
    expect(answerOperatorQuestion("What should I work on next?", snapshot)).toContain("Suggested next review");
    expect(workspace).toEqual(before);
  });

  it("creates, triages, edits, archives, and deletes entries only in the local workspace", () => {
    let workspace = seedDemoWorkspace();
    const created = createDemoEntry(
      { title: "Synthetic test item", content: "Fictional content", category: "follow_up", priority: "high" },
      "d0000000-0000-4000-8000-000000000099",
      "2026-09-19T18:00:00.000Z",
    );
    workspace = addDemoEntry(workspace, created);
    expect(workspace.entries[0]).toMatchObject({ command_state: "inbox", workstream_id: null });

    workspace = updateDemoEntry(workspace, created.id, {
      title: "Synthetic test item edited",
      command_type: "action",
      command_state: "active",
      workstream_id: workspace.workstreams[0]!.id,
      next_action: "Complete the fictional test",
      reviewed_at: "2026-09-19T18:01:00.000Z",
    }, "2026-09-19T18:01:00.000Z");
    expect(workspace.entries.find((entry) => entry.id === created.id)).toMatchObject({
      title: "Synthetic test item edited",
      command_state: "active",
      next_action: "Complete the fictional test",
      triaged_at: "2026-09-19T18:01:00.000Z",
    });
    workspace = updateDemoEntry(workspace, created.id, { archived_at: "2026-09-19T18:02:00.000Z" }, "2026-09-19T18:02:00.000Z");
    expect(workspace.entries.find((entry) => entry.id === created.id)?.archived_at).not.toBeNull();
    workspace = deleteDemoEntry(workspace, created.id);
    expect(workspace.entries.some((entry) => entry.id === created.id)).toBe(false);
  });

  it("creates and edits workstreams and preserves related entries when a workstream is deleted", () => {
    let workspace = seedDemoWorkspace();
    workspace = createDemoWorkstream(workspace, {
      name: "Fictional portfolio planning",
      objective: "Coordinate a synthetic portfolio example.",
      status: "proposed",
      health: "on_track",
      next_review_on: null,
      stale_after_days: 7,
      latest_status_update: null,
    }, "a0000000-0000-4000-8000-000000000099", "2026-09-19T18:00:00.000Z");
    workspace = updateDemoWorkstream(workspace, "a0000000-0000-4000-8000-000000000099", {
      status: "active",
      latest_status_update: "Synthetic planning is ready.",
    }, "2026-09-19T18:01:00.000Z");
    expect(workspace.workstreams.find((workstream) => workstream.id.endsWith("099"))).toMatchObject({
      status: "active",
      latest_status_update: "Synthetic planning is ready.",
      latest_status_updated_at: "2026-09-19T18:01:00.000Z",
    });

    const deleted = workspace.workstreams.find((workstream) => workstream.name === "Northstar launch readiness")!;
    const relatedCount = workspace.entries.filter((entry) => entry.workstream_id === deleted.id).length;
    workspace = deleteDemoWorkstream(workspace, deleted.id, deleted.name, relatedCount, "2026-09-19T18:02:00.000Z");
    expect(workspace.workstreams.some((workstream) => workstream.id === deleted.id)).toBe(false);
    expect(workspace.entries.filter((entry) => entry.updated_at === "2026-09-19T18:02:00.000Z")).toHaveLength(relatedCount);
    expect(workspace.entries.filter((entry) => entry.updated_at === "2026-09-19T18:02:00.000Z").every((entry) => entry.command_state === "inbox" && entry.workstream_id === null && entry.resolved_at === null)).toBe(true);
  });

  it("resets with fresh copies and rejects invalid or legacy stored data", () => {
    const first = seedDemoWorkspace();
    first.entries[0]!.title = "Changed locally";
    const reset = seedDemoWorkspace();
    expect(reset.entries[0]?.title).not.toBe("Changed locally");
    expect(parseStoredDemoWorkspace(JSON.stringify(reset))).toEqual(reset);
    expect(parseStoredDemoWorkspace(JSON.stringify(reset.entries))).toBeNull();
    expect(parseStoredDemoWorkspace('{"not":"a workspace"}')).toBeNull();
  });

  it("keeps every public-demo client source outside authenticated APIs and Supabase", () => {
    const sources = [
      readFileSync("components/DemoApp.tsx", "utf8"),
      readFileSync("components/DemoCommandCenterViews.tsx", "utf8"),
      readFileSync("lib/demo-workspace.ts", "utf8"),
    ].join("\n");
    expect(sources).not.toContain("fetch(");
    expect(sources).not.toContain('"/api/');
    expect(sources).not.toContain("getBrowserSupabase");
    expect(sources).not.toContain("SupabaseClient");
    expect(sources).not.toContain('href="/dashboard');
    expect(sources).not.toContain('href="/entries');
    expect(sources).not.toContain('href="/workstreams');
    expect(sources).not.toContain('href={`/entries');
    expect(sources).not.toContain('href={`/workstreams');
  });
});
