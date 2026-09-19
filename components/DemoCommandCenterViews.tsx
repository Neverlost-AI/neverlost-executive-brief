"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buildCommandCenter, PRODUCT_TIMEZONE } from "@/lib/command-center";
import {
  addDemoEntry,
  createDemoEntry,
  createDemoWorkstream,
  deleteDemoWorkstream,
  newDemoId,
  updateDemoEntry,
  updateDemoWorkstream,
  type DemoWorkspace,
} from "@/lib/demo-workspace";
import {
  commandStates,
  commandTypes,
  deriveQuickCapture,
  type Entry,
  type EntryUpdate,
} from "@/lib/entries";
import { answerOperatorQuestion, buildOperatorSnapshot } from "@/lib/operator";
import {
  workstreamHealthValues,
  workstreamInputSchema,
  workstreamStatuses,
  type Workstream,
  type WorkstreamInput,
} from "@/lib/workstreams";

export type DemoCommandView =
  | "command-dashboard"
  | "operator"
  | "triage"
  | "entries"
  | "workstreams"
  | "workstream-detail";

type SetWorkspace = React.Dispatch<React.SetStateAction<DemoWorkspace>>;

export function DemoCommandCenterView({
  view,
  workspace,
  setWorkspace,
  ready,
  workstreamId,
}: {
  view: DemoCommandView;
  workspace: DemoWorkspace;
  setWorkspace: SetWorkspace;
  ready: boolean;
  workstreamId?: string;
}) {
  if (view === "command-dashboard") {
    return <DemoCommandDashboard workspace={workspace} setWorkspace={setWorkspace} ready={ready} />;
  }
  if (view === "operator") return <DemoOperator workspace={workspace} />;
  if (view === "triage") {
    return <DemoTriage workspace={workspace} setWorkspace={setWorkspace} ready={ready} />;
  }
  if (view === "entries") return <DemoAllEntries workspace={workspace} />;
  if (view === "workstreams") {
    return <DemoWorkstreams workspace={workspace} setWorkspace={setWorkspace} ready={ready} />;
  }
  if (view === "workstream-detail" && workstreamId) {
    return (
      <DemoWorkstreamDetail
        key={workstreamId}
        workspace={workspace}
        setWorkspace={setWorkspace}
        ready={ready}
        workstreamId={workstreamId}
      />
    );
  }
  return <p className="message message-error">Synthetic Command Center view not found.</p>;
}

function DemoCommandDashboard({
  workspace,
  setWorkspace,
  ready,
}: {
  workspace: DemoWorkspace;
  setWorkspace: SetWorkspace;
  ready: boolean;
}) {
  const sections = useMemo(
    () => buildCommandCenter(workspace.entries, workspace.workstreams, new Date(workspace.reference_now)),
    [workspace],
  );
  return (
    <>
      <Heading eyebrow="Synthetic Phase 2A workspace" title="Command Center">
        A browser-local view of triage, action, waiting, risk, decisions, and review. The demo clock is fixed at September 19, 2026.
      </Heading>
      <div className="phone-first-capture">
        <DemoQuickCapture ready={ready} setWorkspace={setWorkspace} />
      </div>
      <div className="command-counts">
        <Count label="Needs triage" value={sections.needsTriage.length} />
        <Count label="Next actions" value={sections.nextActions.length} />
        <Count label="Waiting" value={sections.waiting.length} />
        <Count label="Blocked / at risk" value={sections.blockedEntries.length + sections.atRiskWorkstreams.length} />
        <Count label="Stale workstreams" value={sections.staleWorkstreams.length} />
      </div>
      <div className="command-grid">
        <Section title="Needs triage" href="/demo/triage">
          {sections.needsTriage.slice(0, 5).map((entry) => <EntryRow key={entry.id} entry={entry} />)}
        </Section>
        <Section title="Active workstreams" href="/demo/workstreams">
          {sections.activeWorkstreams.slice(0, 5).map((workstream) => <WorkstreamRow key={workstream.id} workstream={workstream} />)}
        </Section>
        <Section title="Next actions" href="/demo/entries">
          {sections.nextActions.slice(0, 5).map((entry) => <EntryRow key={entry.id} entry={entry} detail={entry.next_action || ""} />)}
        </Section>
        <Section title="Recent decisions" href="/demo/entries">
          {sections.recentDecisions.slice(0, 10).map((entry) => <EntryRow key={entry.id} entry={entry} />)}
        </Section>
        <Section title="Blocked and at risk" href="/demo/entries">
          {sections.blockedEntries.slice(0, 5).map((entry) => <EntryRow key={entry.id} entry={entry} detail="Blocked item" />)}
          {sections.atRiskWorkstreams.slice(0, 5).map((workstream) => <WorkstreamRow key={workstream.id} workstream={workstream} />)}
        </Section>
        <Section title="Stale workstreams" href="/demo/workstreams">
          {sections.staleWorkstreams.slice(0, 5).map((workstream) => <WorkstreamRow key={workstream.id} workstream={workstream} detail="Stale review signal" />)}
        </Section>
        <Section title="Waiting on" href="/demo/entries">
          {sections.waiting.slice(0, 5).map((entry) => <EntryRow key={entry.id} entry={entry} detail={entry.review_on ? `Review ${entry.review_on}` : "Review date missing"} />)}
        </Section>
      </div>
      <div className="desktop-capture">
        <DemoQuickCapture ready={ready} setWorkspace={setWorkspace} />
      </div>
    </>
  );
}

function DemoQuickCapture({ ready, setWorkspace }: { ready: boolean; setWorkspace: SetWorkspace }) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const derived = deriveQuickCapture(content);
    const entry = createDemoEntry(
      { title: derived.title, content: derived.content, category: derived.category, priority: derived.priority },
      newDemoId(),
      new Date().toISOString(),
    );
    setWorkspace((current) => addDemoEntry(current, entry));
    setContent("");
    setStatus("Saved locally to Needs triage.");
  }
  return (
    <section className="panel quick-capture" aria-labelledby="demo-quick-capture-title">
      <div>
        <div className="eyebrow">One-field synthetic capture</div>
        <h2 id="demo-quick-capture-title">Hold the development now</h2>
        <p>Stored only in this browser. Classification stays manual.</p>
      </div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="demo-quick-capture">Capture text</label>
        <textarea id="demo-quick-capture" required maxLength={20_000} rows={5} value={content} disabled={!ready} onChange={(event) => setContent(event.target.value)} placeholder="Add a fictional development..." />
        <button className="button button-primary" disabled={!ready}>Save to Needs triage</button>
      </form>
      {status && <p className="message message-success" role="status">{status}</p>}
    </section>
  );
}

function DemoOperator({ workspace }: { workspace: DemoWorkspace }) {
  const snapshot = useMemo(
    () => buildOperatorSnapshot(workspace.entries, workspace.workstreams, new Date(workspace.reference_now)),
    [workspace],
  );
  const [question, setQuestion] = useState("What needs attention?");
  const [answer, setAnswer] = useState("");
  function ask(event: React.FormEvent) {
    event.preventDefault();
    setAnswer(answerOperatorQuestion(question, snapshot));
  }
  return (
    <>
      <Heading eyebrow="Operator v0.1 · read-only synthetic state" title="Neverlost Operator">
        Deterministic proposals over the browser-local Command Center. Operator never writes, accepts, sends, or executes an action.
      </Heading>
      <section className="panel operator-ask" aria-labelledby="demo-ask-neverlost-title">
        <div>
          <div className="eyebrow">Ask Neverlost</div>
          <h2 id="demo-ask-neverlost-title">Ask the current state</h2>
          <p>Four bounded deterministic questions are supported. No model call is made.</p>
        </div>
        <form onSubmit={ask}>
          <label className="sr-only" htmlFor="demo-operator-question">Question</label>
          <input id="demo-operator-question" value={question} onChange={(event) => setQuestion(event.target.value)} />
          <button className="button button-primary">Ask</button>
        </form>
        <div className="operator-prompts" aria-label="Supported questions">
          {["What needs attention?", "What am I waiting on?", "What changed recently?", "What should I work on next?"].map((prompt) => (
            <button className="button button-secondary" key={prompt} type="button" onClick={() => { setQuestion(prompt); setAnswer(answerOperatorQuestion(prompt, snapshot)); }}>{prompt}</button>
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
            <div><div className="eyebrow">Suggested actions</div><h2>Human review queue</h2></div>
            <span className="operator-authority">Human approval required</span>
          </div>
          {snapshot.proposals.length === 0 ? <p className="muted">No current Operator proposals.</p> : (
            <div className="operator-proposal-list">
              {snapshot.proposals.slice(0, 10).map((proposal) => (
                <article className="operator-proposal" key={proposal.id}>
                  <div><small>{label(proposal.kind)}</small><h3>{proposal.summary}</h3><p>{proposal.rationale}</p></div>
                  {proposal.sourceEntryId ? <Link className="button button-secondary" href={`/demo/entries/${proposal.sourceEntryId}`}>Review item</Link> : proposal.workstreamId ? <Link className="button button-secondary" href={`/demo/workstreams/${proposal.workstreamId}`}>Review workstream</Link> : null}
                </article>
              ))}
            </div>
          )}
        </section>
        <div className="operator-side">
          <Section title="Waiting" href="/demo/entries">{snapshot.waiting.slice(0, 5).map((entry) => <EntryRow key={entry.id} entry={entry} detail={entry.review_on ? `Review ${entry.review_on}` : "Review date missing"} />)}</Section>
          <Section title="Workstreams" href="/demo/workstreams">{snapshot.activeWorkstreams.slice(0, 5).map((workstream) => <WorkstreamRow key={workstream.id} workstream={workstream} />)}</Section>
          <Section title="Recent changes" href="/demo/entries">{snapshot.recentChanges.slice(0, 5).map((entry) => <EntryRow key={entry.id} entry={entry} detail={`Updated ${formatTimestamp(entry.updated_at)}`} />)}</Section>
        </div>
      </div>
      <p className="operator-boundary">Operator is strictly read-only. Every proposal requires human approval and changes no source state.</p>
    </>
  );
}

function DemoTriage({ workspace, setWorkspace, ready }: { workspace: DemoWorkspace; setWorkspace: SetWorkspace; ready: boolean }) {
  const inbox = useMemo(
    () => buildCommandCenter(workspace.entries, workspace.workstreams, new Date(workspace.reference_now)).needsTriage,
    [workspace],
  );
  const current = inbox[0];
  return (
    <>
      <Heading eyebrow="Oldest first · browser-local" title="Needs triage">One preserved synthetic item at a time. You may deliberately leave any item in Inbox.</Heading>
      {!current ? <EmptyState title="Needs triage is clear." body="Capture another fictional item or reset the demo workspace." href="/demo" action="Return to Command Center" /> : (
        <div className="triage-layout">
          <article className="panel preserved-entry">
            <div className="eyebrow">Preserved synthetic capture</div><h2>{current.title}</h2><p>{current.content}</p>
            <dl><dt>Category</dt><dd>{label(current.category)}</dd><dt>Priority</dt><dd>{label(current.priority)}</dd><dt>Created</dt><dd>{formatTimestamp(current.created_at)}</dd></dl>
          </article>
          <DemoCommandFields key={current.id} entry={current} workspace={workspace} setWorkspace={setWorkspace} ready={ready} compact />
        </div>
      )}
    </>
  );
}

export function DemoCommandFields({ entry, workspace, setWorkspace, ready, compact = false }: { entry: Entry; workspace: DemoWorkspace; setWorkspace: SetWorkspace; ready: boolean; compact?: boolean }) {
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
  function submit(event: React.FormEvent) {
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
    try {
      const now = new Date().toISOString();
      updateDemoEntry(workspace, entry.id, update, now);
      setWorkspace((current) => updateDemoEntry(current, entry.id, update, now));
      setWarningAcknowledged(false);
      setStatus("Command fields saved locally.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Command fields could not be saved.");
    }
  }
  return (
    <form className={`panel form-panel command-fields ${compact ? "compact-fields" : ""}`} onSubmit={submit}>
      <div><div className="eyebrow">Manual command fields</div><h2>Triage and operational context</h2></div>
      <div className="form-grid command-three">
        <Field label="Command type" htmlFor={`demo-command-type-${entry.id}`}><select id={`demo-command-type-${entry.id}`} value={form.command_type} disabled={!ready} onChange={(event) => setForm({ ...form, command_type: event.target.value as Entry["command_type"] })}>{commandTypes.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
        <Field label="Command state" htmlFor={`demo-command-state-${entry.id}`}><select id={`demo-command-state-${entry.id}`} value={form.command_state} disabled={!ready} onChange={(event) => setForm({ ...form, command_state: event.target.value as Entry["command_state"], workstream_id: event.target.value === "inbox" ? "" : form.workstream_id })}>{commandStates.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
        <Field label="Workstream" htmlFor={`demo-command-workstream-${entry.id}`}><select id={`demo-command-workstream-${entry.id}`} disabled={!ready || form.command_state === "inbox"} required={form.command_state !== "inbox"} value={form.workstream_id} onChange={(event) => setForm({ ...form, workstream_id: event.target.value })}><option value="">Select workstream</option>{workspace.workstreams.map((workstream) => <option key={workstream.id} value={workstream.id}>{workstream.name}</option>)}</select></Field>
      </div>
      <Field label="Next action" htmlFor={`demo-next-action-${entry.id}`}><input id={`demo-next-action-${entry.id}`} maxLength={1000} value={form.next_action} disabled={!ready} onChange={(event) => setForm({ ...form, next_action: event.target.value })} /></Field>
      <div className="form-grid">
        <Field label="Due date" htmlFor={`demo-due-${entry.id}`}><input id={`demo-due-${entry.id}`} type="date" value={form.due_on} disabled={!ready} onChange={(event) => setForm({ ...form, due_on: event.target.value })} /></Field>
        <Field label="Review date" htmlFor={`demo-review-${entry.id}`}><input id={`demo-review-${entry.id}`} type="date" value={form.review_on} disabled={!ready} onChange={(event) => setForm({ ...form, review_on: event.target.value })} /></Field>
      </div>
      {status && <p className="message" role="status">{status}</p>}
      <button className="button button-primary" disabled={!ready}>{warningAcknowledged ? "Save deliberately" : compact ? "Save and move to next" : "Save command fields"}</button>
    </form>
  );
}

function DemoAllEntries({ workspace }: { workspace: DemoWorkspace }) {
  const entries = workspace.entries.filter((entry) => !entry.archived_at);
  return (
    <>
      <Heading eyebrow="Synthetic active records" title="All entries">A flat browser-local view of preserved captures and additive command fields.</Heading>
      {entries.length === 0 ? <EmptyState title="No active demo entries." body="Capture a fictional item or reset the demo." href="/demo/capture" action="Capture a demo item" /> : (
        <div className="entry-list">{entries.map((entry) => <article className="entry-card" key={entry.id}><div className="entry-card-topline"><span className="badge">{label(entry.command_state)}</span><span className="badge">{label(entry.command_type)}</span></div><h2>{entry.title}</h2><p>{entry.content.slice(0, 240)}</p><Link className="text-link" href={`/demo/entries/${entry.id}`}>Open entry</Link></article>)}</div>
      )}
    </>
  );
}

type WorkstreamDraft = {
  name: string;
  objective: string;
  status: Workstream["status"];
  health: Workstream["health"];
  next_review_on: string;
  stale_after_days: number;
  latest_status_update: string;
};

const emptyWorkstream: WorkstreamDraft = {
  name: "",
  objective: "",
  status: "proposed",
  health: "on_track",
  next_review_on: "",
  stale_after_days: 7,
  latest_status_update: "",
};

function DemoWorkstreams({ workspace, setWorkspace, ready }: { workspace: DemoWorkspace; setWorkspace: SetWorkspace; ready: boolean }) {
  return (
    <>
      <Heading eyebrow="Synthetic manual portfolio" title="Workstreams">Create and edit fictional bounded responsibilities without inferred status or health.</Heading>
      <DemoWorkstreamForm workspace={workspace} setWorkspace={setWorkspace} ready={ready} />
      {workspace.workstreams.length === 0 ? <EmptyState title="No demo workstreams." body="Create a fictional workstream above or reset the demo." href="/demo" action="Return to Command Center" /> : (
        <div className="workstream-list">{workspace.workstreams.map((workstream) => <WorkstreamRow key={workstream.id} workstream={workstream} />)}</div>
      )}
    </>
  );
}

function DemoWorkstreamForm({ workspace, setWorkspace, ready, workstream }: { workspace: DemoWorkspace; setWorkspace: SetWorkspace; ready: boolean; workstream?: Workstream }) {
  const [form, setForm] = useState<WorkstreamDraft>(workstream ? {
    name: workstream.name,
    objective: workstream.objective,
    status: workstream.status,
    health: workstream.health,
    next_review_on: workstream.next_review_on || "",
    stale_after_days: workstream.stale_after_days,
    latest_status_update: workstream.latest_status_update || "",
  } : emptyWorkstream);
  const [status, setStatus] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const input: WorkstreamInput = {
      ...form,
      next_review_on: form.next_review_on || null,
      latest_status_update: form.latest_status_update.trim() || null,
    };
    const parsed = workstreamInputSchema.safeParse(input);
    if (!parsed.success) {
      setStatus("Name, objective, status, health, review date, and stale threshold must be valid.");
      return;
    }
    try {
      const now = new Date().toISOString();
      if (workstream) {
        updateDemoWorkstream(workspace, workstream.id, parsed.data, now);
        setWorkspace((current) => updateDemoWorkstream(current, workstream.id, parsed.data, now));
      } else {
        const id = newDemoId();
        createDemoWorkstream(workspace, parsed.data, id, now);
        setWorkspace((current) => createDemoWorkstream(current, parsed.data, id, now));
        setForm(emptyWorkstream);
      }
      setStatus(workstream ? "Workstream changes saved locally." : "Synthetic workstream created locally.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Workstream could not be saved.");
    }
  }
  const suffix = workstream?.id || "new";
  return (
    <form className="panel form-panel workstream-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Name" htmlFor={`demo-workstream-name-${suffix}`}><input id={`demo-workstream-name-${suffix}`} required maxLength={160} value={form.name} disabled={!ready} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="Status" htmlFor={`demo-workstream-status-${suffix}`}><select id={`demo-workstream-status-${suffix}`} value={form.status} disabled={!ready} onChange={(event) => setForm({ ...form, status: event.target.value as Workstream["status"] })}>{workstreamStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
      </div>
      <Field label="Objective" htmlFor={`demo-workstream-objective-${suffix}`}><textarea id={`demo-workstream-objective-${suffix}`} required rows={3} maxLength={2000} value={form.objective} disabled={!ready} onChange={(event) => setForm({ ...form, objective: event.target.value })} /></Field>
      <div className="form-grid command-three">
        <Field label="Health" htmlFor={`demo-workstream-health-${suffix}`}><select id={`demo-workstream-health-${suffix}`} value={form.health} disabled={!ready} onChange={(event) => setForm({ ...form, health: event.target.value as Workstream["health"] })}>{workstreamHealthValues.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
        <Field label="Next review date" htmlFor={`demo-workstream-review-${suffix}`}><input id={`demo-workstream-review-${suffix}`} type="date" value={form.next_review_on} disabled={!ready} onChange={(event) => setForm({ ...form, next_review_on: event.target.value })} /></Field>
        <Field label="Stale after days" htmlFor={`demo-workstream-stale-${suffix}`}><input id={`demo-workstream-stale-${suffix}`} type="number" min={1} max={90} value={form.stale_after_days} disabled={!ready} onChange={(event) => setForm({ ...form, stale_after_days: Number(event.target.value) })} /></Field>
      </div>
      <Field label="Latest manual status update" htmlFor={`demo-workstream-update-${suffix}`}><textarea id={`demo-workstream-update-${suffix}`} rows={3} maxLength={4000} value={form.latest_status_update} disabled={!ready} onChange={(event) => setForm({ ...form, latest_status_update: event.target.value })} /></Field>
      {status && <p className="message" role="status">{status}</p>}
      <button className="button button-primary" disabled={!ready}>{workstream ? "Save workstream" : "Create workstream"}</button>
    </form>
  );
}

function DemoWorkstreamDetail({ workspace, setWorkspace, ready, workstreamId }: { workspace: DemoWorkspace; setWorkspace: SetWorkspace; ready: boolean; workstreamId: string }) {
  const router = useRouter();
  const workstream = workspace.workstreams.find((value) => value.id === workstreamId);
  const [open, setOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [status, setStatus] = useState("");
  if (!workstream) return <EmptyState title="Demo workstream not found." body="It may have been deleted or the demo may have been reset." href="/demo/workstreams" action="Return to workstreams" />;
  const entries = workspace.entries.filter((entry) => entry.workstream_id === workstreamId && !entry.archived_at);
  const unresolved = entries.filter((entry) => entry.command_state !== "resolved");
  const resolved = entries.filter((entry) => entry.command_state === "resolved");
  const decisions = entries.filter((entry) => entry.command_type === "decision");
  const relatedCount = workspace.entries.filter((entry) => entry.workstream_id === workstreamId).length;
  const currentWorkstreamId = workstream.id;
  function remove() {
    try {
      const now = new Date().toISOString();
      deleteDemoWorkstream(workspace, currentWorkstreamId, typedName, relatedCount, now);
      setWorkspace((current) => deleteDemoWorkstream(current, currentWorkstreamId, typedName, relatedCount, now));
      router.push("/demo/workstreams");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Workstream could not be deleted.");
    }
  }
  return (
    <>
      <Heading eyebrow={`${label(workstream.status)} · ${label(workstream.health)} · synthetic`} title={workstream.name}>{workstream.objective}</Heading>
      <p className="message">Latest status changed: {formatTimestamp(workstream.latest_status_updated_at)}. Workstream updated: {formatTimestamp(workstream.updated_at)}.</p>
      <DemoWorkstreamForm key={workstream.id} workspace={workspace} setWorkspace={setWorkspace} ready={ready} workstream={workstream} />
      <Section title="Unresolved command items" href="/demo/entries">{unresolved.map((entry) => <EntryRow key={entry.id} entry={entry} />)}</Section>
      <Section title="Recent decisions" href="/demo/entries">{decisions.slice(0, 10).map((entry) => <EntryRow key={entry.id} entry={entry} />)}</Section>
      <details className="panel resolved-items"><summary>Resolved items ({resolved.length})</summary>{resolved.map((entry) => <EntryRow key={entry.id} entry={entry} />)}</details>
      <section className="panel danger-zone">
        <h2>Delete synthetic workstream</h2>
        {!open ? <button className="button button-danger" type="button" disabled={!ready} onClick={() => setOpen(true)}>Review deletion</button> : (
          <div className="stack"><p>You are deleting <strong>{workstream.name}</strong>.</p><p><strong>{relatedCount} related entries</strong> will be preserved, unassigned, and returned to Needs triage.</p><Field label={`Type ${workstream.name} to confirm`} htmlFor="demo-delete-workstream-confirmation"><input id="demo-delete-workstream-confirmation" value={typedName} onChange={(event) => setTypedName(event.target.value)} /></Field>{status && <p className="message message-error">{status}</p>}<button className="button button-danger" type="button" disabled={typedName !== workstream.name} onClick={remove}>Delete only this workstream</button></div>
        )}
      </section>
    </>
  );
}

function Heading({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div className="page-heading command-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{children}</p></div></div>;
}

function Count({ label: countLabel, value }: { label: string; value: number }) {
  return <div className="summary-card"><span>{countLabel}</span><strong>{value}</strong></div>;
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  const empty = Array.isArray(children) && children.length === 0;
  return <section className="panel command-section"><div className="section-heading"><h2>{title}</h2><Link className="text-link" href={href}>View all</Link></div>{empty ? <p className="muted">Nothing in this section.</p> : <div className="command-rows">{children}</div>}</section>;
}

function EntryRow({ entry, detail }: { entry: Entry; detail?: string }) {
  const state = `${stateIcons[entry.command_state]} ${label(entry.command_state)}`;
  return <Link className="command-row" href={`/demo/entries/${entry.id}`}><span><strong>{entry.title}</strong><small>{label(entry.command_type)} · {state}{detail ? ` · ${detail}` : ""}</small></span><span className="badge">Item</span></Link>;
}

function WorkstreamRow({ workstream, detail }: { workstream: Workstream; detail?: string }) {
  const health = `${healthIcons[workstream.health]} ${label(workstream.health)}`;
  return <Link className="command-row" href={`/demo/workstreams/${workstream.id}`}><span><strong>{workstream.name}</strong><small>{label(workstream.status)} · {health}{detail ? ` · ${detail}` : ""}</small></span><span className="badge">Workstream</span></Link>;
}

function Field({ label: fieldLabel, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="field"><label htmlFor={htmlFor}>{fieldLabel}</label>{children}</div>;
}

function EmptyState({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return <section className="empty-state"><div className="empty-symbol" aria-hidden="true">○</div><h2>{title}</h2><p>{body}</p><Link className="button button-secondary" href={href}>{action}</Link></section>;
}

const stateIcons: Record<Entry["command_state"], string> = { inbox: "○", active: "▶", waiting: "◷", blocked: "■", resolved: "✓" };
const healthIcons: Record<Workstream["health"], string> = { on_track: "✓", at_risk: "▲", off_track: "!" };

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatTimestamp(value: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-US", { timeZone: PRODUCT_TIMEZONE, dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
