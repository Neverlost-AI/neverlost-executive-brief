export type Priority = "high" | "normal" | "low";
export type CommandState = "inbox" | "active" | "waiting" | "blocked" | "resolved";
export type CommandType = "note" | "action" | "decision" | "risk" | "question" | "commitment";
export type WorkstreamStatus = "proposed" | "active" | "paused" | "completed";
export type WorkstreamHealth = "on_track" | "at_risk" | "off_track";

export interface Workstream {
  id: string;
  name: string;
  objective: string;
  status: WorkstreamStatus;
  health: WorkstreamHealth;
  nextReviewOn?: string;
  staleAfterDays: number;
  latestStatusUpdate?: string;
  latestStatusUpdatedAt?: string;
  updatedAt: string;
}

export interface CommandItem {
  id: string;
  title: string;
  content: string;
  type: CommandType;
  state: CommandState;
  priority: Priority;
  workstreamId?: string;
  nextAction?: string;
  dueOn?: string;
  reviewOn?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  archivedAt?: string;
  sourceLabel?: string;
}

export type ProposalKind = "NEXT_ACTION" | "FOLLOW_UP" | "REVIEW" | "REMINDER";
export type ProposalState = "PROPOSED" | "ACCEPTED" | "REJECTED" | "HELD";

export interface OperatorProposal {
  id: string;
  sourceEntryId?: string;
  workstreamId?: string;
  kind: ProposalKind;
  summary: string;
  rationale: string;
  authority: "HUMAN_APPROVAL_REQUIRED";
  state: ProposalState;
}

export interface OperatorView {
  needsAttention: CommandItem[];
  waiting: CommandItem[];
  blocked: CommandItem[];
  recentDecisions: CommandItem[];
  staleWorkstreams: Workstream[];
  proposals: OperatorProposal[];
}
