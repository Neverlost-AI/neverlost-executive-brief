import { z } from "zod";

export const categories = [
  "note",
  "decision",
  "follow_up",
  "reference",
  "personal",
] as const;
export const priorities = ["low", "normal", "high"] as const;

export const entryInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(160),
  content: z.string().trim().min(1, "Content is required.").max(20_000),
  category: z.enum(categories),
  priority: z.enum(priorities),
});

export const entryUpdateSchema = entryInputSchema.partial().extend({
  reviewed_at: z.iso.datetime().nullable().optional(),
  archived_at: z.iso.datetime().nullable().optional(),
});

export const entrySchema = entryInputSchema.extend({
  id: z.uuid(),
  user_id: z.uuid(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  reviewed_at: z.iso.datetime().nullable(),
  archived_at: z.iso.datetime().nullable(),
});

export type EntryInput = z.infer<typeof entryInputSchema>;
export type EntryUpdate = z.infer<typeof entryUpdateSchema>;
export type Entry = z.infer<typeof entrySchema>;

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
