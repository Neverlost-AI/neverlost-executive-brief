import { z } from "zod";

export const categories = [
  "note",
  "decision",
  "follow_up",
  "reference",
  "personal",
] as const;
export const priorities = ["low", "normal", "high"] as const;
export const commandTypes = [
  "note",
  "action",
  "decision",
  "risk",
  "question",
  "commitment",
] as const;
export const commandStates = [
  "inbox",
  "active",
  "waiting",
  "blocked",
  "resolved",
] as const;
const nullableDate = z.iso.date().nullable();

export const entryInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(160),
  content: z.string().trim().min(1, "Content is required.").max(20_000),
  category: z.enum(categories),
  priority: z.enum(priorities),
});

export const entryUpdateSchema = entryInputSchema.partial().extend({
  reviewed_at: z.iso.datetime({ offset: true }).nullable().optional(),
  archived_at: z.iso.datetime({ offset: true }).nullable().optional(),
  workstream_id: z.uuid().nullable().optional(),
  command_type: z.enum(commandTypes).optional(),
  command_state: z.enum(commandStates).optional(),
  next_action: z.string().trim().min(1).max(1000).nullable().optional(),
  due_on: nullableDate.optional(),
  review_on: nullableDate.optional(),
}).strict();

export const entrySchema = entryInputSchema.extend({
  id: z.uuid(),
  user_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  reviewed_at: z.iso.datetime({ offset: true }).nullable(),
  archived_at: z.iso.datetime({ offset: true }).nullable(),
  workstream_id: z.uuid().nullable(),
  command_type: z.enum(commandTypes),
  command_state: z.enum(commandStates),
  next_action: z.string().nullable(),
  due_on: nullableDate,
  review_on: nullableDate,
  triaged_at: z.iso.datetime({ offset: true }).nullable(),
  resolved_at: z.iso.datetime({ offset: true }).nullable(),
});

export const quickCaptureSchema = z
  .object({ content: z.string().trim().min(1, "Capture text is required.").max(20_000) })
  .strict();

export type EntryInput = z.infer<typeof entryInputSchema>;
export type EntryUpdate = z.infer<typeof entryUpdateSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type CommandState = (typeof commandStates)[number];

export function deriveQuickCapture(input: string) {
  const content = input.trim();
  const firstNonblankLine = content
    .split(/\r?\n/u)
    .find((line) => line.trim().length > 0)
    ?.trim();
  const title = Array.from(firstNonblankLine || "").slice(0, 160).join("");
  return {
    title,
    content,
    category: "note" as const,
    priority: "normal" as const,
    command_type: "note" as const,
    command_state: "inbox" as const,
    workstream_id: null,
    next_action: null,
    due_on: null,
    review_on: null,
    reviewed_at: null,
    archived_at: null,
  };
}

const transitionMap: Record<CommandState, readonly CommandState[]> = {
  inbox: ["active", "waiting", "blocked", "resolved"],
  active: ["inbox", "waiting", "blocked", "resolved"],
  waiting: ["inbox", "active", "blocked", "resolved"],
  blocked: ["inbox", "active", "waiting", "resolved"],
  resolved: ["inbox", "active", "waiting", "blocked"],
};

export function isAllowedCommandTransition(from: CommandState, to: CommandState) {
  return from === to || transitionMap[from].includes(to);
}

export function sortActiveEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const aReviewed = a.reviewed_at ? 1 : 0;
    const bReviewed = b.reviewed_at ? 1 : 0;
    if (aReviewed !== bReviewed) return aReviewed - bReviewed;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

export function categoryLabel(category: Entry["category"]) {
  return {
    note: "Note",
    decision: "Decision",
    follow_up: "Follow-up",
    reference: "Reference",
    personal: "Personal",
  }[category];
}
