import { z } from "zod";
import {
  entryInputSchema,
  entrySchema,
  entryUpdateSchema,
  isAllowedCommandTransition,
  type Entry,
  type EntryInput,
  type EntryUpdate,
} from "@/lib/entries";
import {
  isAllowedWorkstreamTransition,
  workstreamInputSchema,
  workstreamSchema,
  workstreamUpdateSchema,
  type WorkstreamInput,
  type WorkstreamUpdate,
} from "@/lib/workstreams";

export const DEMO_STORAGE_KEY = "neverlost:portfolio-demo:v2";
export const DEMO_REFERENCE_NOW = "2026-09-19T16:00:00.000Z";
export const DEMO_USER_ID = "d1111111-1111-4111-8111-111111111111";

export const demoWorkspaceSchema = z.object({
  version: z.literal(2),
  reference_now: z.iso.datetime({ offset: true }),
  entries: entrySchema.array(),
  workstreams: workstreamSchema.array(),
});

export type DemoWorkspace = z.infer<typeof demoWorkspaceSchema>;
export type DemoEntry = Entry;

const NORTHSTAR_ID = "a0000000-0000-4000-8000-000000000001";
const ONBOARDING_ID = "a0000000-0000-4000-8000-000000000002";
const RENEWAL_ID = "a0000000-0000-4000-8000-000000000003";

export const DEMO_SEED_WORKSPACE: DemoWorkspace = demoWorkspaceSchema.parse({
  version: 2,
  reference_now: DEMO_REFERENCE_NOW,
  workstreams: [
    {
      id: NORTHSTAR_ID,
      user_id: DEMO_USER_ID,
      name: "Northstar launch readiness",
      objective: "Coordinate the fictional Northstar release so ownership, quality checks, and rollback communication are explicit.",
      status: "active",
      health: "at_risk",
      next_review_on: "2026-09-18",
      stale_after_days: 7,
      latest_status_update: "Synthetic launch review found an unresolved rollback-communication owner.",
      latest_status_updated_at: "2026-09-08T16:00:00.000Z",
      completed_at: null,
      created_at: "2026-08-20T15:00:00.000Z",
      updated_at: "2026-09-08T16:00:00.000Z",
    },
    {
      id: ONBOARDING_ID,
      user_id: DEMO_USER_ID,
      name: "Client onboarding refresh",
      objective: "Clarify the fictional onboarding handoff and make every sample owner and decision visible.",
      status: "active",
      health: "on_track",
      next_review_on: "2026-09-25",
      stale_after_days: 10,
      latest_status_update: "The synthetic checklist is current; one owner confirmation is still pending.",
      latest_status_updated_at: "2026-09-18T14:30:00.000Z",
      completed_at: null,
      created_at: "2026-08-24T14:00:00.000Z",
      updated_at: "2026-09-18T14:30:00.000Z",
    },
    {
      id: RENEWAL_ID,
      user_id: DEMO_USER_ID,
      name: "Sample renewal planning",
      objective: "Prepare a fictional renewal decision using synthetic adoption, timing, and stakeholder context.",
      status: "active",
      health: "off_track",
      next_review_on: "2026-09-16",
      stale_after_days: 5,
      latest_status_update: "The fictional adoption review is late, so renewal timing remains deliberately unresolved.",
      latest_status_updated_at: "2026-09-10T18:00:00.000Z",
      completed_at: null,
      created_at: "2026-08-18T17:00:00.000Z",
      updated_at: "2026-09-10T18:00:00.000Z",
    },
  ],
  entries: [
    {
      id: "d0000000-0000-4000-8000-000000000001",
      user_id: DEMO_USER_ID,
      title: "Review launch-readiness checklist",
      content: "Confirm that the fictional Northstar rollout has an owner for release notes, analytics verification, and rollback communication.",
      category: "follow_up",
      priority: "high",
      command_type: "risk",
      command_state: "blocked",
      workstream_id: NORTHSTAR_ID,
      next_action: "Name the fictional rollback-communication owner",
      due_on: "2026-09-17",
      review_on: "2026-09-19",
      created_at: "2026-08-28T15:00:00.000Z",
      updated_at: "2026-09-18T15:00:00.000Z",
      triaged_at: "2026-08-29T15:00:00.000Z",
      resolved_at: null,
      reviewed_at: null,
      archived_at: null,
    },
    {
      id: "d0000000-0000-4000-8000-000000000002",
      user_id: DEMO_USER_ID,
      title: "Confirm onboarding handoff owner",
      content: "Choose a fictional owner for the sample client-onboarding handoff and record the decision before the next review.",
      category: "decision",
      priority: "high",
      command_type: "decision",
      command_state: "waiting",
      workstream_id: ONBOARDING_ID,
      next_action: "Collect the sample owner's confirmation",
      due_on: null,
      review_on: "2026-09-18",
      created_at: "2026-08-27T17:30:00.000Z",
      updated_at: "2026-09-17T17:30:00.000Z",
      triaged_at: "2026-08-28T17:30:00.000Z",
      resolved_at: null,
      reviewed_at: null,
      archived_at: null,
    },
    {
      id: "d0000000-0000-4000-8000-000000000003",
      user_id: DEMO_USER_ID,
      title: "Draft stakeholder progress update",
      content: "Summarize the synthetic project milestones, open questions, and next deliberate action for Friday's sample review.",
      category: "note",
      priority: "normal",
      command_type: "action",
      command_state: "active",
      workstream_id: NORTHSTAR_ID,
      next_action: "Draft the fictional Friday update",
      due_on: "2026-09-20",
      review_on: "2026-09-19",
      created_at: "2026-08-26T14:15:00.000Z",
      updated_at: "2026-09-16T14:15:00.000Z",
      triaged_at: "2026-08-27T14:15:00.000Z",
      resolved_at: null,
      reviewed_at: null,
      archived_at: null,
    },
    {
      id: "d0000000-0000-4000-8000-000000000004",
      user_id: DEMO_USER_ID,
      title: "Accessibility QA complete",
      content: "The fictional responsive interface passed keyboard, contrast, and screen-reader checks in the sample workspace.",
      category: "reference",
      priority: "normal",
      command_type: "action",
      command_state: "resolved",
      workstream_id: NORTHSTAR_ID,
      next_action: null,
      due_on: "2026-09-12",
      review_on: null,
      created_at: "2026-08-24T19:00:00.000Z",
      updated_at: "2026-09-12T16:00:00.000Z",
      triaged_at: "2026-08-25T16:00:00.000Z",
      resolved_at: "2026-09-12T16:00:00.000Z",
      reviewed_at: "2026-08-25T16:00:00.000Z",
      archived_at: null,
    },
    {
      id: "d0000000-0000-4000-8000-000000000005",
      user_id: DEMO_USER_ID,
      title: "Approve renewal timing",
      content: "Decision for this fictional account: schedule the sample renewal conversation after the adoption review is complete.",
      category: "decision",
      priority: "high",
      command_type: "decision",
      command_state: "resolved",
      workstream_id: RENEWAL_ID,
      next_action: null,
      due_on: null,
      review_on: null,
      created_at: "2026-08-22T18:00:00.000Z",
      updated_at: "2026-09-14T18:00:00.000Z",
      triaged_at: "2026-08-23T18:00:00.000Z",
      resolved_at: "2026-09-14T18:00:00.000Z",
      reviewed_at: "2026-08-23T18:00:00.000Z",
      archived_at: null,
    },
    {
      id: "d0000000-0000-4000-8000-000000000006",
      user_id: DEMO_USER_ID,
      title: "Competitive research notes",
      content: "Keep these fictional comparison notes available for deliberate triage in the next sample planning session.",
      category: "reference",
      priority: "low",
      command_type: "note",
      command_state: "inbox",
      workstream_id: null,
      next_action: null,
      due_on: null,
      review_on: null,
      created_at: "2026-08-20T16:45:00.000Z",
      updated_at: "2026-08-21T16:45:00.000Z",
      triaged_at: null,
      resolved_at: null,
      reviewed_at: "2026-08-21T16:45:00.000Z",
      archived_at: null,
    },
    {
      id: "d0000000-0000-4000-8000-000000000007",
      user_id: DEMO_USER_ID,
      title: "Validate sample adoption report",
      content: "Review the fictional adoption totals before the synthetic renewal-planning discussion.",
      category: "follow_up",
      priority: "normal",
      command_type: "question",
      command_state: "active",
      workstream_id: RENEWAL_ID,
      next_action: "Compare the fictional adoption totals with the sample report",
      due_on: "2026-09-22",
      review_on: "2026-09-21",
      created_at: "2026-09-02T16:00:00.000Z",
      updated_at: "2026-09-15T16:00:00.000Z",
      triaged_at: "2026-09-03T16:00:00.000Z",
      resolved_at: null,
      reviewed_at: "2026-09-03T16:00:00.000Z",
      archived_at: null,
    },
    {
      id: "d0000000-0000-4000-8000-000000000008",
      user_id: DEMO_USER_ID,
      title: "Archived discovery notes",
      content: "Early fictional discovery notes retained to demonstrate that demo entries can be archived and restored.",
      category: "note",
      priority: "low",
      command_type: "note",
      command_state: "inbox",
      workstream_id: null,
      next_action: null,
      due_on: null,
      review_on: null,
      created_at: "2026-08-14T13:00:00.000Z",
      updated_at: "2026-08-18T13:00:00.000Z",
      triaged_at: null,
      resolved_at: null,
      reviewed_at: "2026-08-16T13:00:00.000Z",
      archived_at: "2026-08-18T13:00:00.000Z",
    },
  ],
});

export function seedDemoWorkspace(): DemoWorkspace {
  return structuredClone(DEMO_SEED_WORKSPACE);
}

export function blankDemoWorkspace(): DemoWorkspace {
  return { version: 2, reference_now: DEMO_REFERENCE_NOW, entries: [], workstreams: [] };
}

export function newDemoId(): string {
  return crypto.randomUUID();
}

export function parseStoredDemoWorkspace(value: string | null): DemoWorkspace | null {
  if (!value) return null;
  try {
    return demoWorkspaceSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}

export function createDemoEntry(input: EntryInput, id: string, now: string): DemoEntry {
  return entrySchema.parse({
    ...entryInputSchema.parse(input),
    id,
    user_id: DEMO_USER_ID,
    created_at: now,
    updated_at: now,
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
  });
}

export function addDemoEntry(workspace: DemoWorkspace, entry: DemoEntry): DemoWorkspace {
  return demoWorkspaceSchema.parse({ ...workspace, entries: [entry, ...workspace.entries] });
}

export function updateDemoEntry(
  workspace: DemoWorkspace,
  id: string,
  rawUpdate: EntryUpdate,
  now: string,
): DemoWorkspace {
  const update = entryUpdateSchema.parse(rawUpdate);
  const current = workspace.entries.find((entry) => entry.id === id);
  if (!current) return workspace;

  const nextState = update.command_state ?? current.command_state;
  if (!isAllowedCommandTransition(current.command_state, nextState)) {
    throw new Error("That command-state transition is not allowed.");
  }

  const requestedWorkstream = update.workstream_id === undefined
    ? current.workstream_id
    : update.workstream_id;
  const nextWorkstream = nextState === "inbox" ? null : requestedWorkstream;
  if (nextState !== "inbox" && !nextWorkstream) {
    throw new Error("A workstream is required outside Needs triage.");
  }
  if (nextWorkstream && !workspace.workstreams.some((workstream) => workstream.id === nextWorkstream)) {
    throw new Error("The selected workstream is unavailable.");
  }

  const triagedAt = current.command_state === "inbox" && nextState !== "inbox" && !current.triaged_at
    ? now
    : current.triaged_at;
  const resolvedAt = nextState === "resolved" && current.command_state !== "resolved"
    ? now
    : current.command_state === "resolved" && nextState !== "resolved"
      ? null
      : current.resolved_at;

  const entries = workspace.entries.map((entry) => entry.id === id
    ? entrySchema.parse({
        ...entry,
        ...update,
        workstream_id: nextWorkstream,
        command_state: nextState,
        triaged_at: triagedAt,
        resolved_at: resolvedAt,
        updated_at: now,
      })
    : entry);
  return demoWorkspaceSchema.parse({ ...workspace, entries });
}

export function deleteDemoEntry(workspace: DemoWorkspace, id: string): DemoWorkspace {
  return demoWorkspaceSchema.parse({
    ...workspace,
    entries: workspace.entries.filter((entry) => entry.id !== id),
  });
}

export function createDemoWorkstream(
  workspace: DemoWorkspace,
  input: WorkstreamInput,
  id: string,
  now: string,
): DemoWorkspace {
  const parsed = workstreamInputSchema.parse(input);
  if (workspace.workstreams.some((workstream) => workstream.name.trim().toLowerCase() === parsed.name.toLowerCase())) {
    throw new Error("A synthetic workstream with that name already exists.");
  }
  const workstream = workstreamSchema.parse({
    ...parsed,
    id,
    user_id: DEMO_USER_ID,
    latest_status_updated_at: parsed.latest_status_update ? now : null,
    completed_at: parsed.status === "completed" ? now : null,
    created_at: now,
    updated_at: now,
  });
  return demoWorkspaceSchema.parse({ ...workspace, workstreams: [workstream, ...workspace.workstreams] });
}

export function updateDemoWorkstream(
  workspace: DemoWorkspace,
  id: string,
  rawUpdate: WorkstreamUpdate,
  now: string,
): DemoWorkspace {
  const update = workstreamUpdateSchema.parse(rawUpdate);
  const current = workspace.workstreams.find((workstream) => workstream.id === id);
  if (!current) return workspace;
  const nextStatus = update.status ?? current.status;
  if (!isAllowedWorkstreamTransition(current.status, nextStatus)) {
    throw new Error("That workstream-status transition is not allowed.");
  }
  const nextName = update.name?.trim().toLowerCase();
  if (nextName && workspace.workstreams.some((workstream) => workstream.id !== id && workstream.name.trim().toLowerCase() === nextName)) {
    throw new Error("A synthetic workstream with that name already exists.");
  }
  const latestStatusChanged = update.latest_status_update !== undefined && update.latest_status_update !== current.latest_status_update;
  const completedAt = nextStatus === "completed" && current.status !== "completed"
    ? now
    : current.status === "completed" && nextStatus !== "completed"
      ? null
      : current.completed_at;
  const workstreams = workspace.workstreams.map((workstream) => workstream.id === id
    ? workstreamSchema.parse({
        ...workstream,
        ...update,
        status: nextStatus,
        latest_status_updated_at: latestStatusChanged ? now : workstream.latest_status_updated_at,
        completed_at: completedAt,
        updated_at: now,
      })
    : workstream);
  return demoWorkspaceSchema.parse({ ...workspace, workstreams });
}

export function deleteDemoWorkstream(
  workspace: DemoWorkspace,
  id: string,
  confirmationName: string,
  relatedEntryCount: number,
  now: string,
): DemoWorkspace {
  const workstream = workspace.workstreams.find((value) => value.id === id);
  if (!workstream) return workspace;
  const actualRelatedCount = workspace.entries.filter((entry) => entry.workstream_id === id).length;
  if (confirmationName !== workstream.name || relatedEntryCount !== actualRelatedCount) {
    throw new Error("The workstream name or related-entry count changed. Review the confirmation again.");
  }
  const entries = workspace.entries.map((entry) => entry.workstream_id === id
    ? entrySchema.parse({
        ...entry,
        workstream_id: null,
        command_state: "inbox",
        resolved_at: null,
        updated_at: now,
      })
    : entry);
  return demoWorkspaceSchema.parse({
    ...workspace,
    entries,
    workstreams: workspace.workstreams.filter((value) => value.id !== id),
  });
}

export function sortDemoEntries(entries: DemoEntry[]): DemoEntry[] {
  return [...entries].sort((a, b) => {
    const reviewOrder = Number(Boolean(a.reviewed_at)) - Number(Boolean(b.reviewed_at));
    return reviewOrder || Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}
