import type { Entry } from "@/lib/entries";
import type { Workstream } from "@/lib/workstreams";

export const PRODUCT_TIMEZONE = "America/Denver";

function dateParts(value: Date, timezone = PRODUCT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function denverDate(value: Date | string) {
  const { year, month, day } = dateParts(typeof value === "string" ? new Date(value) : value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateOrdinal(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function latestMeaningfulUpdate(workstream: Workstream) {
  return [
    workstream.latest_status_updated_at,
    workstream.updated_at,
    workstream.created_at,
  ]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

export function isStaleWorkstream(workstream: Workstream, now = new Date()) {
  if (workstream.status === "completed") return false;
  const today = denverDate(now);
  if (workstream.next_review_on && workstream.next_review_on < today) return true;
  const latestDate = denverDate(latestMeaningfulUpdate(workstream));
  return dateOrdinal(latestDate) + workstream.stale_after_days < dateOrdinal(today);
}

const activeEntries = (entries: Entry[]) => entries.filter((entry) => !entry.archived_at);
const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id);
const timestamp = (value: string) => Date.parse(value);

export function buildCommandCenter(entries: Entry[], workstreams: Workstream[], now = new Date()) {
  const active = activeEntries(entries);
  const today = denverDate(now);
  const needsTriage = active
    .filter((entry) => entry.command_state === "inbox")
    .sort((a, b) => timestamp(a.created_at) - timestamp(b.created_at) || byId(a, b));

  const healthOrder = { off_track: 0, at_risk: 1, on_track: 2 };
  const activeWorkstreams = workstreams
    .filter((workstream) => workstream.status === "active")
    .sort((a, b) =>
      healthOrder[a.health] - healthOrder[b.health] ||
      Number(a.next_review_on === null) - Number(b.next_review_on === null) ||
      (a.next_review_on || "").localeCompare(b.next_review_on || "") ||
      timestamp(b.updated_at) - timestamp(a.updated_at) || byId(a, b),
    );

  const nextActions = active
    .filter((entry) => entry.command_state === "active" && Boolean(entry.next_action?.trim()))
    .sort((a, b) => {
      const aOverdue = a.due_on !== null && a.due_on < today ? 0 : 1;
      const bOverdue = b.due_on !== null && b.due_on < today ? 0 : 1;
      return aOverdue - bOverdue ||
        Number(a.due_on === null) - Number(b.due_on === null) ||
        (a.due_on || "").localeCompare(b.due_on || "") ||
        Number(a.review_on === null) - Number(b.review_on === null) ||
        (a.review_on || "").localeCompare(b.review_on || "") ||
        timestamp(b.updated_at) - timestamp(a.updated_at) || byId(a, b);
    });

  const blockedEntries = active.filter((entry) => entry.command_state === "blocked");
  const atRiskWorkstreams = workstreams.filter(
    (workstream) => workstream.status !== "completed" &&
      (workstream.health === "at_risk" || workstream.health === "off_track"),
  );
  const waiting = active
    .filter((entry) => entry.command_state === "waiting")
    .sort((a, b) =>
      Number(!(a.review_on && a.review_on < today)) - Number(!(b.review_on && b.review_on < today)) ||
      Number(a.review_on === null) - Number(b.review_on === null) ||
      (a.review_on || "").localeCompare(b.review_on || "") ||
      timestamp(a.updated_at) - timestamp(b.updated_at) || byId(a, b),
    );
  const recentDecisions = active
    .filter((entry) => entry.command_type === "decision" && entry.command_state !== "inbox")
    .sort((a, b) =>
      timestamp(b.triaged_at || b.updated_at) - timestamp(a.triaged_at || a.updated_at) ||
      timestamp(b.updated_at) - timestamp(a.updated_at) || byId(a, b),
    );
  const staleWorkstreams = workstreams
    .filter((workstream) => isStaleWorkstream(workstream, now))
    .sort((a, b) =>
      Number(!(a.next_review_on && a.next_review_on < today)) - Number(!(b.next_review_on && b.next_review_on < today)) ||
      timestamp(latestMeaningfulUpdate(a)) - timestamp(latestMeaningfulUpdate(b)) || byId(a, b),
    );

  return {
    needsTriage,
    activeWorkstreams,
    nextActions,
    blockedEntries,
    atRiskWorkstreams,
    waiting,
    recentDecisions,
    staleWorkstreams,
  };
}
