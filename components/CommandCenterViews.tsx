"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildCommandCenter, PRODUCT_TIMEZONE } from "@/lib/command-center";
import { answerOperatorQuestion, buildOperatorSnapshot } from "@/lib/operator";
import {
  commandStates,
  commandTypes,
  entrySchema,
  type Entry,
  type EntryUpdate,
} from "@/lib/entries";
import {
  workstreamHealthValues,
  workstreamSchema,
  workstreamStatuses,
  type Workstream,
} from "@/lib/workstreams";

type CommandView =
  | "command-dashboard"
  | "operator"
  | "triage"
  | "entries"
  | "workstreams"
  | "workstream-detail"
  | "review"
  | string;

async function api(session: Session, input: string, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init.headers,
    },
  });
}

function formatTimestamp(value: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PRODUCT_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

const stateIcons: Record<Entry["command_state"], string> = {
  inbox: "○",
  active: "▶",
  waiting: "◷",
  blocked: "■",
  resolved: "✓",
};

const healthIcons: Record<Workstream["health"], string> = {
  on_track: "✓",
  at_risk: "▲",
  off_track: "!",
};

export function CommandCenterView({
  view,
  session,
  workstreamId,
}: {
  view: CommandView;
  session: Session;
  workstreamId?: string;
}) {
  if (view === "command-dashboard") return <CommandDashboard session={session} />;
  if (view === "operator") return <OperatorConsole session={session} />;
  if (view === "triage") return <Triage session={session} />;
  if (view === "entries") return <AllEntries session={session} />;
  if (view === "workstreams") return <Workstreams session={session} />;
  if (view === "workstream-detail" && workstreamId) {
    return <WorkstreamDetail session={session} workstreamId={workstreamId} />;
  }
  if (view === "review") return <WeeklyReview session={session} />;
  return <p className="message message-error">Command Center view not found.</p>;
}

function Heading({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="page-heading command-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
    </div>
  );
}

function QuickCapture({ session, onSaved }: { session: Session; onSaved: () => void }) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    const response = await api(session, "/api/entries/quick", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setStatus(payload.error || "Capture could not be saved.");
      return;
    }
    setContent("");
    setStatus("Saved to Needs triage.");
    onSaved();
  }
  return (
    <section className="panel quick-capture" aria-labelledby="quick-capture-title">
      <div>
        <div className="eyebrow">One-field capture</div>
        <h2 id="quick-capture-title">Hold the development now</h2>
        <p>Stored exactly as entered after edge trimming. Classification stays manual.</p>
      </div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="quick-capture">Capture text</label>
        <textarea
          id="quick-capture"
          rows={5}
          maxLength={20_000}
          required
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Type or dictate the full development..."
        />
        <button className="button button-primary" disabled={saving}>
          {saving ? "Saving..." : "Save to Needs triage"}
        </button>
      </form>
      {status && <p className="message" role="status">{status}</p>}
    </section>
  );
}

function useDashboard(session: Session) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [serverNow, setServerNow] = useState(new Date().toISOString());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    api(session, "/api/dashboard")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Command Center could not be loaded.");
        if (active) {
          setEntries(entrySchema.array().parse(payload.entries));
          setWorkstreams(workstreamSchema.array().parse(payload.workstreams));
          setServerNow(payload.server_now);
        }
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [session, version]);
  return {
    entries,
    workstreams,
    serverNow,
    error,
    loading,
    reload: () => { setLoading(true); setError(""); setVersion((value) => value + 1); },
  };
}

function CommandDashboard({ session }: { session: Session }) {
  const data = useDashboard(session);
  const sections = useMemo(
    () => buildCommandCenter(data.entries, data.workstreams, new Date(data.serverNow)),
    [data.entries, data.workstreams, data.serverNow],
  );
  return (
    <>
      <Heading eyebrow="Phase 2A manual command center" title="Command Center">
        One owner-controlled view of triage, action, waiting, risk, decisions, and review.
      </Heading>
      <div className="phone-first-capture"><QuickCapture session={session} onSaved={data.reload} /></div>
      {data.loading && <p className="message">Loading Command Center...</p>}
      {data.error && <p className="message message-error">{data.error}</p>}
      {!data.loading && !data.error && (
        <>
          <div className="command-counts">
            <Count label="Needs triage" value={sections.needsTriage.length} />
            <Count label="Next actions" value={sections.nextActions.length} />
            <Count label="Waiting" value={sections.waiting.length} />
            <Count label="Blocked / at risk" value={sections.blockedEntries.length + sections.atRiskWorkstreams.length} />
            <Count label="Stale workstreams" value={sections.staleWorkstreams.length} />
          </div>
          <div className="command-grid">
            <Section title="Needs triage" href="/triage">
              {sections.needsTriage.slice(0, 5).map((entry) => <EntryRow key={entry.id} entry={entry} />)}
            </Section>
            <Section title="Active workstreams" href="/workstreams">
              {sections.activeWorkstreams.slice(0, 5).map((workstream) => <WorkstreamRow key={workstream.id} workstream={workstream} />)}
            </Section>
            <Section title="Next actions" href="/entries">
              {sections.nextActions.slice(0, 5).map((entry) => <EntryRow key={entry.id} entry={entry} detail={entry.next_action || ""} />)}
            </Section>
            <Section title="Recent decisions" href="/entries">
              {sections.recentDecisions.slice(0, 10).map((entry) => <EntryRow key={entry.id} entry={entry} />)}
            </Section>
            <Section title="Blocked and at risk" href="/entries">
              {sections.blockedEntries.slice(0, 5).map((entry) => <EntryRow key={entry.id} entry={entry} detail="Blocked item" />)}
              {sections.atRiskWorkstreams.slice(0, 5).map((workstream) => <WorkstreamRow key={workstream.id} workstream={workstream} />)}
            </Section>
            <Section title="Stale workstreams" href="/workstreams">
              {sections.staleWorkstreams.slice(0, 5).map((workstream) => <WorkstreamRow key={workstream.id} workstream={workstream} detail="Stale review signal" />)}
            </Section>
            <Section title="Waiting on" href="/entries">
              {sections.waiting.slice(0, 5).map((entry) => <EntryRow key={entry.id} entry={entry} detail={entry.review_on ? `Review ${entry.review_on}` : "Review date missing"} />)}
            </Section>
          </div>
          <div className="desktop-capture"><QuickCapture session={session} onSaved={data.reload} /></div>
        </>
      )}
    </>
  );
}

function OperatorConsole({ session }: { session: Session }) {
  const data = useDashboard(session);
  const snapshot = useMemo(
    () => buildOperatorSnapshot(data.entries, data.workstreams, new Date(data.serverNow)),
    [data.entries, data.workstreams, data.serverNow],
  );
  const [question, setQuestion] = useState("What needs attention?");
  const [answer, setAnswer] = useState("");

  function ask(event: React.FormEvent) {
    event.preventDefault();
    setAnswer(answerOperatorQuestion(question, snapshot));
  }

  return (
    <>
      <Heading eyebrow="Operator v0.1 · read-only" title="Neverlost Operator">
        Deterministic attention and next-action proposals over accepted Command Center state. Nothing here changes source state automatically.
      </Heading>
      {data.loading && <p className="message">Loading Operator...</p>}
      {data.error && <p className="message message-error">{data.error}</p>}
      {!data.loading && !data.error && (
        <>
          <section className="panel operator-ask" aria-labelledby="ask-neverlost-title">
            <div>
              <div className="eyebrow">Ask Neverlost</div>
              <h2 id="ask-neverlost-title">Ask the current state</h2>
              <p>v0.1 uses bounded deterministic questions. No model call is made.</p>
            </div>
            <form onSubmit={ask}>
              <label className="sr-only" htmlFor="operator-question">Question</label>
              <input
                id="operator-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What needs attention?"
              />
              <button className="button button-primary">Ask</button>
            </form>
            <div className="operator-prompts" aria-label="Supported questions">
              {["What needs attention?", "What am I waiting on?", "What changed recently?", "What should I work on next?"].map((prompt) => (
                <button
                  className="button button-secondary"
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setQuestion(prompt);
                    setAnswer(answerOperatorQuestion(prompt, snapshot));
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
            {answer && <p className="operator-answer" role="status">{answer}</p>}
          </section>

          <div className="command-counts operator-counts">
            <Count label="Needs attention" value={snapshot.needsAttention.length} />
            <Count label="Proposals" value={snapshot.proposals.length} />
            <Count label="Waiting" value={snapshot.waiting.length} />
            <Count label="Active workstreams" value={snapshot.activeWorkstreams.length} />
          </div>

          <div className="operator-layout">
            <section className="panel operator-proposals">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">Suggested actions</div>
                  <h2>Human review queue</h2>
                </div>
                <span className="operator-authority">Human approval required</span>
              </div>
              {snapshot.proposals.length === 0 ? (
                <p className="muted">No current Operator proposals.</p>
              ) : (
                <div className="operator-proposal-list">
                  {snapshot.proposals.slice(0, 10).map((proposal) => (
                    <article className="operator-proposal" key={proposal.id}>
                      <div>
                        <small>{proposal.kind.replaceAll("_", " ")}</small>
                        <h3>{proposal.summary}</h3>
                        <p>{proposal.rationale}</p>
                      </div>
                      {proposal.sourceEntryId ? (
                        <Link className="button button-secondary" href={`/entries/${proposal.sourceEntryId}`}>Review item</Link>
                      ) : proposal.workstreamId ? (
                        <Link className="button button-secondary" href={`/workstreams/${proposal.workstreamId}`}>Review workstream</Link>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="operator-side">
              <Section title="Waiting" href="/entries">
                {snapshot.waiting.slice(0, 5).map((entry) => (
                  <EntryRow key={entry.id} entry={entry} detail={entry.review_on ? `Review ${entry.review_on}` : "Review date missing"} />
                ))}
              </Section>
              <Section title="Workstreams" href="/workstreams">
                {snapshot.activeWorkstreams.slice(0, 5).map((workstream) => (
                  <WorkstreamRow key={workstream.id} workstream={workstream} />
                ))}
              </Section>
              <Section title="Recent changes" href="/entries">
                {snapshot.recentChanges.slice(0, 5).map((entry) => (
                  <EntryRow key={entry.id} entry={entry} detail={`Updated ${formatTimestamp(entry.updated_at)}`} />
                ))}
              </Section>
            </div>
          </div>

          <p className="operator-boundary">
            Operator v0.1 is a read model only: proposals are derived from existing Command Center fields and are not persisted, accepted, sent, or executed.
          </p>
        </>
      )}
    </>
  );
}

function Count({ label: countLabel, value }: { label: string; value: number }) {
  return <div className="summary-card"><span>{countLabel}</span><strong>{value}</strong></div>;
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  const empty = Array.isArray(children) && children.length === 0;
  return (
    <section className="panel command-section">
      <div className="section-heading"><h2>{title}</h2><Link className="text-link" href={href}>View all</Link></div>
      {empty ? <p className="muted">Nothing in this section.</p> : <div className="command-rows">{children}</div>}
    </section>
  );
}

function EntryRow({ entry, detail }: { entry: Entry; detail?: string }) {
  const state = `${stateIcons[entry.command_state]} ${label(entry.command_state)}`;
  return (
    <Link className="command-row" href={`/entries/${entry.id}`}>
      <span><strong>{entry.title}</strong><small>{label(entry.command_type)} · {state}{detail ? ` · ${detail}` : ""}</small></span>
      <span className="badge">Item</span>
    </Link>
  );
}

function WorkstreamRow({ workstream, detail }: { workstream: Workstream; detail?: string }) {
  const health = `${healthIcons[workstream.health]} ${label(workstream.health)}`;
  return (
    <Link className="command-row" href={`/workstreams/${workstream.id}`}>
      <span><strong>{workstream.name}</strong><small>{label(workstream.status)} · {health}{detail ? ` · ${detail}` : ""}</small></span>
      <span className="badge">Workstream</span>
    </Link>
  );
}

function useWorkstreams(session: Session, refreshKey = 0) {
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    api(session, "/api/workstreams").then(async (response) => {
      const payload = await response.json();
      if (active && response.ok) setWorkstreams(workstreamSchema.array().parse(payload.workstreams));
    });
    return () => { active = false; };
  }, [session, version, refreshKey]);
  return { workstreams, reload: () => setVersion((value) => value + 1) };
}

type WorkstreamDraft = {
  name: string; objective: string; status: Workstream["status"]; health: Workstream["health"];
  next_review_on: string; stale_after_days: number; latest_status_update: string;
};
const emptyWorkstream: WorkstreamDraft = {
  name: "", objective: "", status: "proposed", health: "on_track",
  next_review_on: "", stale_after_days: 7, latest_status_update: "",
};

function WorkstreamForm({ session, initial = emptyWorkstream, id, onSaved }: {
  session: Session; initial?: WorkstreamDraft; id?: string; onSaved: (workstream: Workstream) => void;
}) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("");
    const response = await api(session, id ? `/api/workstreams/${id}` : "/api/workstreams", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({
        ...form,
        next_review_on: form.next_review_on || null,
        latest_status_update: form.latest_status_update.trim() || null,
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setStatus(payload.error || "Workstream could not be saved."); return; }
    setStatus("Workstream saved.");
    onSaved(workstreamSchema.parse(payload.workstream));
    if (!id) setForm(emptyWorkstream);
  }
  return (
    <form className="panel form-panel workstream-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Name"><input required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="Status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Workstream["status"] })}>{workstreamStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
      </div>
      <Field label="Objective"><textarea required rows={3} maxLength={2000} value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} /></Field>
      <div className="form-grid command-three">
        <Field label="Health"><select value={form.health} onChange={(event) => setForm({ ...form, health: event.target.value as Workstream["health"] })}>{workstreamHealthValues.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
        <Field label="Next review date"><input type="date" value={form.next_review_on} onChange={(event) => setForm({ ...form, next_review_on: event.target.value })} /></Field>
        <Field label="Stale after days"><input type="number" min={1} max={90} value={form.stale_after_days} onChange={(event) => setForm({ ...form, stale_after_days: Number(event.target.value) })} /></Field>
      </div>
      <Field label="Latest manual status update"><textarea rows={3} maxLength={4000} value={form.latest_status_update} onChange={(event) => setForm({ ...form, latest_status_update: event.target.value })} /></Field>
      {status && <p className="message" role="status">{status}</p>}
      <button className="button button-primary">{id ? "Save workstream" : "Create workstream"}</button>
    </form>
  );
}

function Workstreams({ session }: { session: Session }) {
  const data = useWorkstreams(session);
  return (
    <>
      <Heading eyebrow="Manual portfolio" title="Workstreams">Define bounded responsibility without inferred status or health.</Heading>
      <WorkstreamForm session={session} onSaved={data.reload} />
      <div className="workstream-list">
        {data.workstreams.map((workstream) => <WorkstreamRow key={workstream.id} workstream={workstream} />)}
      </div>
    </>
  );
}

export function EntryCommandFields({ session, entry, onUpdated, compact = false, workstreamVersion = 0 }: {
  session: Session; entry: Entry; onUpdated: (entry: Entry) => void; compact?: boolean; workstreamVersion?: number;
}) {
  const data = useWorkstreams(session, workstreamVersion);
  const [form, setForm] = useState({
    workstream_id: entry.workstream_id || "",
    command_type: entry.command_type,
    command_state: entry.command_state,
    next_action: entry.next_action || "",
    due_on: entry.due_on || "",
    review_on: entry.review_on || "",
  });
  const [status, setStatus] = useState("");
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const needsWarning = form.command_state !== "inbox" && (
      (form.command_state === "active" && !form.next_action.trim() && !form.review_on) ||
      ((form.command_state === "waiting" || form.command_state === "blocked") && !form.review_on)
    );
    if (needsWarning && !warningAcknowledged) {
      setWarningAcknowledged(true);
      setStatus("This state is missing the recommended next action or review date. Review it, then save again to confirm deliberately.");
      return;
    }
    const update: EntryUpdate = {
      workstream_id: form.command_state === "inbox" ? null : form.workstream_id || null,
      command_type: form.command_type,
      command_state: form.command_state,
      next_action: form.next_action.trim() || null,
      due_on: form.due_on || null,
      review_on: form.review_on || null,
    };
    const response = await api(session, `/api/entries/${entry.id}`, { method: "PATCH", body: JSON.stringify(update) });
    const payload = await response.json();
    if (!response.ok) { setStatus(payload.error || "Command fields could not be saved."); return; }
    const nextEntry = entrySchema.parse(payload.entry);
    onUpdated(nextEntry);
    setWarningAcknowledged(false);
    setStatus("Command fields saved.");
  }
  return (
    <form className={`panel form-panel command-fields ${compact ? "compact-fields" : ""}`} onSubmit={submit}>
      <div><div className="eyebrow">Manual command fields</div><h2>Triage and operational context</h2></div>
      <div className="form-grid command-three">
        <Field label="Command type"><select value={form.command_type} onChange={(event) => setForm({ ...form, command_type: event.target.value as Entry["command_type"] })}>{commandTypes.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
        <Field label="Command state"><select value={form.command_state} onChange={(event) => setForm({ ...form, command_state: event.target.value as Entry["command_state"], workstream_id: event.target.value === "inbox" ? "" : form.workstream_id })}>{commandStates.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
        <Field label="Workstream"><select disabled={form.command_state === "inbox"} required={form.command_state !== "inbox"} value={form.workstream_id} onChange={(event) => setForm({ ...form, workstream_id: event.target.value })}><option value="">Select workstream</option>{data.workstreams.map((workstream) => <option key={workstream.id} value={workstream.id}>{workstream.name}</option>)}</select></Field>
      </div>
      <Field label="Next action"><input maxLength={1000} value={form.next_action} onChange={(event) => setForm({ ...form, next_action: event.target.value })} /></Field>
      <div className="form-grid">
        <Field label="Due date"><input type="date" value={form.due_on} onChange={(event) => setForm({ ...form, due_on: event.target.value })} /></Field>
        <Field label="Review date"><input type="date" value={form.review_on} onChange={(event) => setForm({ ...form, review_on: event.target.value })} /></Field>
      </div>
      {status && <p className="message" role="status">{status}</p>}
      <button className="button button-primary">{warningAcknowledged ? "Save deliberately" : compact ? "Save and move to next" : "Save command fields"}</button>
      {entry.triaged_at && <small>First triaged {formatTimestamp(entry.triaged_at)}</small>}
    </form>
  );
}

function Triage({ session }: { session: Session }) {
  const data = useDashboard(session);
  const inbox = useMemo(() => buildCommandCenter(data.entries, data.workstreams, new Date(data.serverNow)).needsTriage, [data]);
  const current = inbox[0];
  const [created, setCreated] = useState(false);
  const [workstreamVersion, setWorkstreamVersion] = useState(0);
  return (
    <>
      <Heading eyebrow="Oldest first" title="Needs triage">One preserved item at a time. You may deliberately leave any item in inbox.</Heading>
      {!current && !data.loading && <section className="empty-state"><h2>Needs triage is clear.</h2><Link className="button button-secondary" href="/dashboard">Return to Command Center</Link></section>}
      {current && (
        <div className="triage-layout">
          <article className="panel preserved-entry"><div className="eyebrow">Preserved capture</div><h2>{current.title}</h2><p>{current.content}</p><dl><dt>Category</dt><dd>{label(current.category)}</dd><dt>Priority</dt><dd>{label(current.priority)}</dd><dt>Phase 1 review</dt><dd>{current.reviewed_at ? "Reviewed" : "Unreviewed"}</dd><dt>Created</dt><dd>{formatTimestamp(current.created_at)}</dd></dl></article>
          <div>
            <EntryCommandFields session={session} entry={current} compact workstreamVersion={workstreamVersion} onUpdated={data.reload} />
            <button className="button button-quiet inline-create" onClick={() => setCreated(!created)}>{created ? "Close workstream creation" : "Create workstream without leaving triage"}</button>
            {created && <WorkstreamForm session={session} onSaved={() => { setCreated(false); setWorkstreamVersion((value) => value + 1); data.reload(); }} />}
          </div>
        </div>
      )}
    </>
  );
}

function AllEntries({ session }: { session: Session }) {
  const data = useDashboard(session);
  return (
    <>
      <Heading eyebrow="Active records" title="All entries">A flat view of non-archived Phase 1 records and additive command fields.</Heading>
      <div className="entry-list">{data.entries.map((entry) => <article className="entry-card" key={entry.id}><div className="entry-card-topline"><span className="badge">{label(entry.command_state)}</span><span className="badge">{label(entry.command_type)}</span></div><h2>{entry.title}</h2><p>{entry.content.slice(0, 240)}</p><Link className="text-link" href={`/entries/${entry.id}`}>Open entry</Link></article>)}</div>
    </>
  );
}

function WorkstreamDetail({ session, workstreamId }: { session: Session; workstreamId: string }) {
  const [workstream, setWorkstream] = useState<Workstream | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [relatedCount, setRelatedCount] = useState(0);
  const [status, setStatus] = useState("");
  const load = useCallback(async () => {
    const response = await api(session, `/api/workstreams/${workstreamId}`);
    const payload = await response.json();
    if (!response.ok) { setStatus(payload.error || "Workstream not found."); return; }
    setWorkstream(workstreamSchema.parse(payload.workstream));
    setEntries(entrySchema.array().parse(payload.entries));
    setRelatedCount(payload.related_entry_count);
  }, [session, workstreamId]);
  useEffect(() => {
    // Data loading is an intentional external synchronization with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  if (!workstream) return <p className="message">{status || "Loading workstream..."}</p>;
  const initial: WorkstreamDraft = {
    name: workstream.name, objective: workstream.objective, status: workstream.status,
    health: workstream.health, next_review_on: workstream.next_review_on || "",
    stale_after_days: workstream.stale_after_days, latest_status_update: workstream.latest_status_update || "",
  };
  const unresolved = entries.filter((entry) => entry.command_state !== "resolved");
  const resolved = entries.filter((entry) => entry.command_state === "resolved");
  const decisions = entries.filter((entry) => entry.command_type === "decision");
  async function changeStatus(nextStatus: Workstream["status"]) {
    const response = await api(session, `/api/workstreams/${workstreamId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = await response.json();
    if (!response.ok) { setStatus(payload.error || "Workstream status could not be changed."); return; }
    setWorkstream(workstreamSchema.parse(payload.workstream));
    setStatus(`Workstream moved to ${label(nextStatus)}.`);
  }
  return (
    <>
      <Heading eyebrow={`${label(workstream.status)} · ${label(workstream.health)}`} title={workstream.name}>{workstream.objective}</Heading>
      <p className="message">Latest status changed: {formatTimestamp(workstream.latest_status_updated_at)}. Workstream updated: {formatTimestamp(workstream.updated_at)}.</p>
      <WorkstreamForm session={session} initial={initial} id={workstream.id} onSaved={setWorkstream} />
      <div className="form-actions workstream-actions">
        {workstream.status === "proposed" && <button className="button button-secondary" onClick={() => changeStatus("active")}>Activate</button>}
        {(workstream.status === "active" || workstream.status === "completed") && <button className="button button-secondary" onClick={() => changeStatus("paused")}>Pause</button>}
        {(workstream.status === "paused" || workstream.status === "completed") && <button className="button button-secondary" onClick={() => changeStatus("active")}>Reopen</button>}
        {workstream.status !== "completed" && <button className="button button-secondary" onClick={() => changeStatus("completed")}>Complete</button>}
      </div>
      {status && <p className="message">{status}</p>}
      <Section title="Unresolved command items" href="/entries">{unresolved.map((entry) => <EntryRow key={entry.id} entry={entry} />)}</Section>
      <Section title="Recent decisions" href="/entries">{decisions.slice(0, 10).map((entry) => <EntryRow key={entry.id} entry={entry} />)}</Section>
      <details className="panel resolved-items"><summary>Resolved items ({resolved.length})</summary>{resolved.map((entry) => <EntryRow key={entry.id} entry={entry} />)}</details>
      <DeleteWorkstream session={session} workstream={workstream} relatedCount={relatedCount} />
    </>
  );
}

function DeleteWorkstream({ session, workstream, relatedCount }: { session: Session; workstream: Workstream; relatedCount: number }) {
  const [open, setOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [status, setStatus] = useState("");
  async function remove() {
    const response = await api(session, `/api/workstreams/${workstream.id}`, {
      method: "DELETE",
      body: JSON.stringify({ confirmation_name: typedName, related_entry_count: relatedCount }),
    });
    const payload = await response.json();
    if (!response.ok) { setStatus(payload.error || "Workstream could not be deleted."); return; }
    window.location.assign("/workstreams");
  }
  return (
    <section className="panel danger-zone">
      <h2>Delete workstream</h2>
      {!open ? <button className="button button-danger" onClick={() => setOpen(true)}>Review deletion</button> : <div className="stack"><p>You are deleting <strong>{workstream.name}</strong>.</p><p><strong>{relatedCount} related entries</strong> will be preserved. No entries will be deleted. Their workstream assignment will be removed and they will return to <strong>Needs triage</strong>.</p><Field label={`Type ${workstream.name} to confirm`}><input value={typedName} onChange={(event) => setTypedName(event.target.value)} /></Field>{status && <p className="message message-error">{status}</p>}<button className="button button-danger" disabled={typedName !== workstream.name} onClick={remove}>Delete only this workstream</button></div>}
    </section>
  );
}

const reviewSteps = [
  "Review every inbox item or deliberately leave it in inbox.",
  "Review each active workstream objective, status, and health.",
  "Confirm one next action or waiting/blocked condition for each active priority.",
  "Review overdue due dates and review dates.",
  "Review waiting and blocked items.",
  "Review recent decisions.",
  "Review stale workstreams.",
  "Resolve or archive completed items deliberately.",
  "Confirm next review date and latest status update for every active workstream.",
  "Explicitly mark the weekly review complete.",
];

function WeeklyReview({ session }: { session: Session }) {
  const data = useDashboard(session);
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    api(session, "/api/preferences").then(async (response) => {
      const payload = await response.json();
      if (response.ok) setLastCompleted(payload.preference?.last_weekly_review_completed_at || null);
    });
  }, [session]);
  async function complete(event: React.FormEvent) {
    event.preventDefault();
    const response = await api(session, "/api/preferences", { method: "POST", body: "{}" });
    const payload = await response.json();
    if (!response.ok) { setStatus(payload.error || "Review completion could not be saved."); return; }
    setLastCompleted(payload.preference.last_weekly_review_completed_at);
    setStatus("Weekly review completion recorded. No item or workstream was changed automatically.");
  }
  const sections = buildCommandCenter(data.entries, data.workstreams, new Date(data.serverNow));
  return (
    <>
      <Heading eyebrow="Guided manual review" title="Weekly review">Last completed: {formatTimestamp(lastCompleted)}</Heading>
      <div className="review-context"><Count label="Needs triage" value={sections.needsTriage.length} /><Count label="Active workstreams" value={sections.activeWorkstreams.length} /><Count label="Waiting" value={sections.waiting.length} /><Count label="Stale" value={sections.staleWorkstreams.length} /></div>
      <form className="panel review-checklist" onSubmit={complete}>{reviewSteps.map((step, index) => <label key={step}><input type="checkbox" required /><span>{index + 1}. {step}</span></label>)}{status && <p className="message">{status}</p>}<button className="button button-primary">Mark weekly review complete</button></form>
    </>
  );
}

function Field({ label: fieldLabel, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{fieldLabel}</span>{children}</label>;
}
