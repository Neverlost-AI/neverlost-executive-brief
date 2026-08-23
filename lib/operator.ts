import { buildCommandCenter, denverDate } from "@/lib/command-center";
import type { Entry } from "@/lib/entries";
import type { Workstream } from "@/lib/workstreams";

export type OperatorProposalKind = "NEXT_ACTION" | "FOLLOW_UP" | "REVIEW" | "REMINDER";
export type OperatorProposalState = "PROPOSED" | "ACCEPTED" | "REJECTED" | "HELD";

export type OperatorProposal = {
  id: string;
  sourceEntryId?: string;
  workstreamId?: string;
  kind: OperatorProposalKind;
  summary: string;
  rationale: string;
  authority: "HUMAN_APPROVAL_REQUIRED";
  state: OperatorProposalState;
  createdAt: string;
  priority: number;
};

export type OperatorSnapshot = ReturnType<typeof buildOperatorSnapshot>;

function proposal(input: Omit<OperatorProposal, "authority" | "state">): OperatorProposal {
  return {
    ...input,
    authority: "HUMAN_APPROVAL_REQUIRED",
    state: "PROPOSED",
  };
}

function byPriority(a: OperatorProposal, b: OperatorProposal) {
  return a.priority - b.priority || a.summary.localeCompare(b.summary) || a.id.localeCompare(b.id);
}

export function buildOperatorSnapshot(entries: Entry[], workstreams: Workstream[], now = new Date()) {
  const command = buildCommandCenter(entries, workstreams, now);
  const today = denverDate(now);
  const createdAt = now.toISOString();
  const proposals: OperatorProposal[] = [];
  const seen = new Set<string>();

  const add = (value: OperatorProposal) => {
    if (seen.has(value.id)) return;
    seen.add(value.id);
    proposals.push(value);
  };

  for (const entry of command.blockedEntries) {
    add(proposal({
      id: `blocked:${entry.id}`,
      sourceEntryId: entry.id,
      kind: "REVIEW",
      summary: `Review blocked item: ${entry.title}`,
      rationale: "This item is explicitly blocked and needs human judgment before work can progress.",
      createdAt,
      priority: 10,
    }));
  }

  for (const workstream of command.atRiskWorkstreams) {
    add(proposal({
      id: `risk:${workstream.id}`,
      workstreamId: workstream.id,
      kind: "REVIEW",
      summary: `Review ${workstream.name}`,
      rationale: `This workstream is marked ${workstream.health.replaceAll("_", " ")}; Operator does not change that judgment automatically.`,
      createdAt,
      priority: workstream.health === "off_track" ? 12 : 18,
    }));
  }

  for (const entry of command.nextActions) {
    const overdue = Boolean(entry.due_on && entry.due_on < today);
    add(proposal({
      id: `next:${entry.id}`,
      sourceEntryId: entry.id,
      kind: "NEXT_ACTION",
      summary: entry.next_action || entry.title,
      rationale: overdue
        ? `The next action is overdue${entry.due_on ? ` since ${entry.due_on}` : ""}.`
        : entry.due_on
          ? `This active item has a defined next action due ${entry.due_on}.`
          : "This active item has a defined next action and no due date.",
      createdAt,
      priority: overdue ? 15 : 45,
    }));
  }

  for (const entry of command.waiting) {
    const reviewDue = Boolean(entry.review_on && entry.review_on <= today);
    add(proposal({
      id: `waiting:${entry.id}`,
      sourceEntryId: entry.id,
      kind: "FOLLOW_UP",
      summary: `Check waiting item: ${entry.title}`,
      rationale: reviewDue
        ? `Its review date is ${entry.review_on}; a human follow-up decision is due.`
        : entry.review_on
          ? `It is waiting with a review date of ${entry.review_on}.`
          : "It is waiting but has no review date, so continuity depends on manual review.",
      createdAt,
      priority: reviewDue ? 20 : entry.review_on ? 55 : 35,
    }));
  }

  for (const workstream of command.staleWorkstreams) {
    add(proposal({
      id: `stale:${workstream.id}`,
      workstreamId: workstream.id,
      kind: "REVIEW",
      summary: `Review stale workstream: ${workstream.name}`,
      rationale: workstream.next_review_on && workstream.next_review_on < today
        ? `The workstream review date ${workstream.next_review_on} has passed.`
        : `The workstream has crossed its ${workstream.stale_after_days}-day stale review threshold.`,
      createdAt,
      priority: 30,
    }));
  }

  for (const entry of command.needsTriage) {
    add(proposal({
      id: `triage:${entry.id}`,
      sourceEntryId: entry.id,
      kind: "REVIEW",
      summary: `Triage: ${entry.title}`,
      rationale: "This preserved capture is still in Inbox. Operator will not classify or assign it automatically.",
      createdAt,
      priority: 40,
    }));
  }

  const recentChanges = [...entries]
    .filter((entry) => !entry.archived_at)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 5);

  return {
    generatedAt: createdAt,
    today,
    proposals: proposals.sort(byPriority),
    needsAttention: proposals.filter((value) => value.priority <= 40).sort(byPriority),
    waiting: command.waiting,
    activeWorkstreams: command.activeWorkstreams,
    recentDecisions: command.recentDecisions,
    recentChanges,
  };
}

export function answerOperatorQuestion(query: string, snapshot: OperatorSnapshot) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return "Ask about attention, waiting, recent changes, or what to work on next.";
  }

  if (normalized.includes("waiting")) {
    if (snapshot.waiting.length === 0) return "Nothing is currently marked waiting.";
    const names = snapshot.waiting.slice(0, 3).map((entry) => entry.title).join("; ");
    return `${snapshot.waiting.length} item${snapshot.waiting.length === 1 ? " is" : "s are"} waiting. First up: ${names}.`;
  }

  if (normalized.includes("changed") || normalized.includes("recent")) {
    if (snapshot.recentChanges.length === 0) return "No active entries are available for a recent-change view.";
    const names = snapshot.recentChanges.slice(0, 3).map((entry) => entry.title).join("; ");
    return `Most recently updated active items: ${names}. This is a deterministic timestamp view, not an AI summary.`;
  }

  if (normalized.includes("next") || normalized.includes("work on") || normalized.includes("priority")) {
    const first = snapshot.proposals[0];
    if (!first) return "There are no current Operator proposals.";
    return `Suggested next review: ${first.summary}. Why: ${first.rationale}`;
  }

  if (normalized.includes("attention") || normalized.includes("important") || normalized.includes("need")) {
    if (snapshot.needsAttention.length === 0) return "Nothing currently crosses the deterministic attention rules.";
    const first = snapshot.needsAttention[0];
    return `${snapshot.needsAttention.length} item${snapshot.needsAttention.length === 1 ? "" : "s"} currently need attention. First: ${first.summary}. Why: ${first.rationale}`;
  }

  return "Operator v0.1 currently understands: what needs attention, what am I waiting on, what changed recently, and what should I work on next.";
}
