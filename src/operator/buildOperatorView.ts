import type { CommandItem, OperatorProposal, OperatorView, Priority, Workstream } from "../domain/operator";

const DAY = 86_400_000;
const priorityRank: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

function parseDateOnly(value?: string): number | null {
  if (!value) return null;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function isDueOrReviewable(item: CommandItem, now: Date): boolean {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const due = parseDateOnly(item.dueOn);
  const review = parseDateOnly(item.reviewOn);
  return (due !== null && due <= today) || (review !== null && review <= today);
}

function isStale(workstream: Workstream, now: Date): boolean {
  if (workstream.status === "completed") return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const nextReview = parseDateOnly(workstream.nextReviewOn);
  if (nextReview !== null && nextReview <= today) return true;

  const meaningful = [workstream.latestStatusUpdatedAt, workstream.updatedAt]
    .filter(Boolean)
    .map((value) => Date.parse(value as string))
    .filter((value) => !Number.isNaN(value));

  if (!meaningful.length) return true;
  return today - Math.max(...meaningful) >= workstream.staleAfterDays * DAY;
}

function activeItems(items: CommandItem[]): CommandItem[] {
  return items.filter((item) => !item.archivedAt && item.state !== "resolved");
}

function sortAttention(items: CommandItem[]): CommandItem[] {
  return [...items].sort((a, b) => {
    const p = priorityRank[a.priority] - priorityRank[b.priority];
    if (p !== 0) return p;
    const aDate = parseDateOnly(a.dueOn) ?? parseDateOnly(a.reviewOn) ?? Number.MAX_SAFE_INTEGER;
    const bDate = parseDateOnly(b.dueOn) ?? parseDateOnly(b.reviewOn) ?? Number.MAX_SAFE_INTEGER;
    return aDate - bDate;
  });
}

function buildProposal(item: CommandItem): OperatorProposal | null {
  if (!item.nextAction) return null;
  const kind = item.state === "waiting" ? "FOLLOW_UP" : item.state === "blocked" ? "REVIEW" : "NEXT_ACTION";
  return {
    id: `proposal:${item.id}`,
    sourceEntryId: item.id,
    workstreamId: item.workstreamId,
    kind,
    summary: item.nextAction,
    rationale:
      item.state === "waiting"
        ? "The item is waiting and its review condition has become actionable."
        : item.state === "blocked"
          ? "The item is blocked and should be deliberately reviewed before proceeding."
          : "The item is active and has a concrete next action.",
    authority: "HUMAN_APPROVAL_REQUIRED",
    state: "PROPOSED",
  };
}

export function buildOperatorView(
  items: CommandItem[],
  workstreams: Workstream[],
  now = new Date(),
): OperatorView {
  const active = activeItems(items);

  const needsAttention = sortAttention(
    active.filter((item) => item.state === "active" || isDueOrReviewable(item, now)),
  );

  const waiting = sortAttention(active.filter((item) => item.state === "waiting"));
  const blocked = sortAttention(active.filter((item) => item.state === "blocked"));
  const recentDecisions = [...items]
    .filter((item) => !item.archivedAt && item.type === "decision")
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 5);
  const staleWorkstreams = workstreams.filter((workstream) => isStale(workstream, now));
  const proposals = [...needsAttention, ...waiting.filter((item) => isDueOrReviewable(item, now)), ...blocked]
    .map(buildProposal)
    .filter((proposal): proposal is OperatorProposal => proposal !== null);

  return { needsAttention, waiting, blocked, recentDecisions, staleWorkstreams, proposals };
}
