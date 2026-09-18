import { z } from "zod";
import { entryInputSchema, type EntryInput } from "@/lib/entries";

export const DEMO_STORAGE_KEY = "neverlost:portfolio-demo:v1";

export const demoEntrySchema = entryInputSchema.extend({
  id: z.string().min(1),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  reviewed_at: z.iso.datetime({ offset: true }).nullable(),
  archived_at: z.iso.datetime({ offset: true }).nullable(),
});

export type DemoEntry = z.infer<typeof demoEntrySchema>;

export const DEMO_SEED_ENTRIES: readonly DemoEntry[] = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    title: "Review launch-readiness checklist",
    content: "Confirm that the fictional Northstar rollout has an owner for release notes, analytics verification, and rollback communication.",
    category: "follow_up",
    priority: "high",
    created_at: "2026-08-28T15:00:00.000Z",
    updated_at: "2026-08-28T15:00:00.000Z",
    reviewed_at: null,
    archived_at: null,
  },
  {
    id: "d0000000-0000-4000-8000-000000000002",
    title: "Confirm onboarding handoff owner",
    content: "Choose a fictional owner for the sample client-onboarding handoff and record the decision before the next review.",
    category: "decision",
    priority: "high",
    created_at: "2026-08-27T17:30:00.000Z",
    updated_at: "2026-08-27T17:30:00.000Z",
    reviewed_at: null,
    archived_at: null,
  },
  {
    id: "d0000000-0000-4000-8000-000000000003",
    title: "Draft stakeholder progress update",
    content: "Summarize the synthetic project milestones, open questions, and next deliberate action for Friday's sample review.",
    category: "note",
    priority: "normal",
    created_at: "2026-08-26T14:15:00.000Z",
    updated_at: "2026-08-26T14:15:00.000Z",
    reviewed_at: null,
    archived_at: null,
  },
  {
    id: "d0000000-0000-4000-8000-000000000004",
    title: "Accessibility QA complete",
    content: "The fictional responsive interface passed keyboard, contrast, and screen-reader checks in the sample workspace.",
    category: "reference",
    priority: "normal",
    created_at: "2026-08-24T19:00:00.000Z",
    updated_at: "2026-08-25T16:00:00.000Z",
    reviewed_at: "2026-08-25T16:00:00.000Z",
    archived_at: null,
  },
  {
    id: "d0000000-0000-4000-8000-000000000005",
    title: "Approve renewal timing",
    content: "Decision for this fictional account: schedule the sample renewal conversation after the adoption review is complete.",
    category: "decision",
    priority: "high",
    created_at: "2026-08-22T18:00:00.000Z",
    updated_at: "2026-08-23T18:00:00.000Z",
    reviewed_at: "2026-08-23T18:00:00.000Z",
    archived_at: null,
  },
  {
    id: "d0000000-0000-4000-8000-000000000006",
    title: "Competitive research notes",
    content: "Keep these fictional comparison notes available as context for the next sample planning session.",
    category: "reference",
    priority: "low",
    created_at: "2026-08-20T16:45:00.000Z",
    updated_at: "2026-08-21T16:45:00.000Z",
    reviewed_at: "2026-08-21T16:45:00.000Z",
    archived_at: null,
  },
  {
    id: "d0000000-0000-4000-8000-000000000007",
    title: "Archived discovery notes",
    content: "Early fictional discovery notes retained to demonstrate that demo entries can be archived and restored.",
    category: "note",
    priority: "low",
    created_at: "2026-08-14T13:00:00.000Z",
    updated_at: "2026-08-18T13:00:00.000Z",
    reviewed_at: "2026-08-16T13:00:00.000Z",
    archived_at: "2026-08-18T13:00:00.000Z",
  },
] as const;

export function seedDemoEntries(): DemoEntry[] {
  return DEMO_SEED_ENTRIES.map((entry) => ({ ...entry }));
}

export function parseStoredDemoEntries(value: string | null): DemoEntry[] | null {
  if (!value) return null;
  try {
    return demoEntrySchema.array().parse(JSON.parse(value));
  } catch {
    return null;
  }
}

export function createDemoEntry(
  input: EntryInput,
  id: string,
  now: string,
): DemoEntry {
  return {
    ...entryInputSchema.parse(input),
    id,
    created_at: now,
    updated_at: now,
    reviewed_at: null,
    archived_at: null,
  };
}

export function updateDemoEntry(
  entries: DemoEntry[],
  id: string,
  update: Partial<Omit<DemoEntry, "id" | "created_at">>,
  now: string,
): DemoEntry[] {
  return entries.map((entry) =>
    entry.id === id
      ? demoEntrySchema.parse({ ...entry, ...update, updated_at: now })
      : entry,
  );
}

export function deleteDemoEntry(entries: DemoEntry[], id: string): DemoEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function sortDemoEntries(entries: DemoEntry[]): DemoEntry[] {
  return [...entries].sort((a, b) => {
    const reviewOrder = Number(Boolean(a.reviewed_at)) - Number(Boolean(b.reviewed_at));
    return reviewOrder || Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}
