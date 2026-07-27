import { z } from "zod";

export const workstreamStatuses = ["proposed", "active", "paused", "completed"] as const;
export const workstreamHealthValues = ["on_track", "at_risk", "off_track"] as const;

const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable();

export const workstreamInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(160),
    objective: z.string().trim().min(1, "Objective is required.").max(2000),
    status: z.enum(workstreamStatuses).default("proposed"),
    health: z.enum(workstreamHealthValues).default("on_track"),
    next_review_on: z.iso.date().nullable().default(null),
    stale_after_days: z.coerce.number().int().min(1).max(90).default(7),
    latest_status_update: nullableText(4000).default(null),
  })
  .strict();

export const workstreamUpdateSchema = workstreamInputSchema.partial();

export const workstreamSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  name: z.string(),
  objective: z.string(),
  status: z.enum(workstreamStatuses),
  health: z.enum(workstreamHealthValues),
  next_review_on: z.iso.date().nullable(),
  stale_after_days: z.number().int(),
  latest_status_update: z.string().nullable(),
  latest_status_updated_at: z.iso.datetime({ offset: true }).nullable(),
  completed_at: z.iso.datetime({ offset: true }).nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export const workstreamDeleteSchema = z
  .object({
    confirmation_name: z.string(),
    related_entry_count: z.number().int().min(0),
  })
  .strict();

export const preferenceSchema = z.object({
  user_id: z.uuid(),
  last_weekly_review_completed_at: z.iso.datetime({ offset: true }).nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export type Workstream = z.infer<typeof workstreamSchema>;
export type WorkstreamInput = z.input<typeof workstreamInputSchema>;
export type WorkstreamUpdate = z.infer<typeof workstreamUpdateSchema>;

const statusTransitions: Record<Workstream["status"], readonly Workstream["status"][]> = {
  proposed: ["active", "paused", "completed"],
  active: ["paused", "completed"],
  paused: ["active", "completed"],
  completed: ["active", "paused"],
};

export function isAllowedWorkstreamTransition(
  from: Workstream["status"],
  to: Workstream["status"],
) {
  return from === to || statusTransitions[from].includes(to);
}
