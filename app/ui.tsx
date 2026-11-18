"use client";

import { useMemo, useState } from "react";
import { commandItems, workstreams } from "@/src/data/seed";
import { buildOperatorView } from "@/src/operator/buildOperatorView";
import type { CommandItem, OperatorProposal, Workstream } from "@/src/domain/operator";

const demoNow = new Date("2026-08-22T22:30:00Z");

type PromptKey = "attention" | "waiting" | "changed";

function statusClass(value: string) {
  return value.toLowerCase().replaceAll("_", "-");
}

function ItemCard({ item, workstream }: { item: CommandItem; workstream?: Workstream }) {
  return (
    <article className="item-card">
      <div className="item-topline">
        <span className={`pill ${statusClass(item.state)}`}>{item.state}</span>
        <span className={`priority ${item.priority}`}>{item.priority}</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.content}</p>
      <div className="item-meta">
        {workstream ? <span>{workstream.name}</span> : null}
        {item.dueOn ? <span>Due {item.dueOn}</span> : null}
        {item.reviewOn ? <span>Review {item.reviewOn}</span> : null}
      </div>
      {item.nextAction ? <div className="next-action"><strong>Next:</strong> {item.nextAction}</div> : null}
    </article>
  );
}

function ProposalCard({ proposal }: { proposal: OperatorProposal }) {
  const [state, setState] = useState(proposal.state);
  return (
    <article className="proposal-card">
      <div className="proposal-head">
        <span className="pill proposed">{proposal.kind}</span>
        <span className="authority">HUMAN APPROVAL REQUIRED</span>
      </div>
      <h3>{proposal.summary}</h3>
      <p>{proposal.rationale}</p>
      <div className="proposal-actions">
        <button onClick={() => setState("ACCEPTED")}>Accept</button>
        <button className="secondary" onClick={() => setState("HELD")}>Hold</button>
        <button className="ghost" onClick={() => setState("REJECTED")}>Reject</button>
        <span className={`proposal-state ${state.toLowerCase()}`}>{state}</span>
      </div>
      <small>Demo only: this changes local UI state and performs no external action.</small>
    </article>
  );
}

export function CommandCenter() {
  const view = useMemo(() => buildOperatorView(commandItems, workstreams, demoNow), []);
  const workstreamMap = useMemo(() => new Map(workstreams.map((w) => [w.id, w])), []);
  const [prompt, setPrompt] = useState<PromptKey>("attention");

  const answers: Record<PromptKey, string> = {
    attention: `${view.needsAttention.length} item(s) need attention. The highest-priority due work is shown below; waiting items are intentionally excluded unless their review date is reached.`,
    waiting: `${view.waiting.length} item(s) are waiting on outside people or events. No action is implied until the configured review condition is reached.`,
    changed: `Recent accepted state includes the Command Center / Operator architecture decision and current Career workstream updates. This demo does not ingest external changes automatically yet.`,
  };

  return (
    <main>
      <header className="topbar">
        <div>
          <div className="eyebrow">NEVERLOST SYSTEMS</div>
          <h1>Command Center</h1>
          <p>Operator v0.1 • deterministic first • human authority preserved</p>
        </div>
        <div className="memory-indicator"><span /> Persistent state layer: DEMO</div>
      </header>

      <section className="hero-grid">
        <div className="operator-panel">
          <div className="section-label">ASK NEVERLOST</div>
          <h2>What should I know right now?</h2>
          <div className="prompt-row">
            <button className={prompt === "attention" ? "selected" : ""} onClick={() => setPrompt("attention")}>What needs attention?</button>
            <button className={prompt === "waiting" ? "selected" : ""} onClick={() => setPrompt("waiting")}>What am I waiting on?</button>
            <button className={prompt === "changed" ? "selected" : ""} onClick={() => setPrompt("changed")}>What changed?</button>
          </div>
          <div className="operator-answer">{answers[prompt]}</div>
        </div>

        <div className="metric-grid">
          <div className="metric"><strong>{view.needsAttention.length}</strong><span>Needs attention</span></div>
          <div className="metric"><strong>{view.waiting.length}</strong><span>Waiting</span></div>
          <div className="metric"><strong>{view.blocked.length}</strong><span>Blocked</span></div>
          <div className="metric"><strong>{view.staleWorkstreams.length}</strong><span>Stale workstreams</span></div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><div className="section-label">NOW</div><h2>Needs Attention</h2></div>
          <span>{view.needsAttention.length} active</span>
        </div>
        <div className="cards">
          {view.needsAttention.map((item) => <ItemCard key={item.id} item={item} workstream={item.workstreamId ? workstreamMap.get(item.workstreamId) : undefined} />)}
        </div>
      </section>

      <section className="split">
        <div className="section">
          <div className="section-heading"><div><div className="section-label">EXTERNAL DEPENDENCIES</div><h2>Waiting</h2></div></div>
          <div className="cards compact">
            {view.waiting.map((item) => <ItemCard key={item.id} item={item} workstream={item.workstreamId ? workstreamMap.get(item.workstreamId) : undefined} />)}
          </div>
        </div>
        <div className="section">
          <div className="section-heading"><div><div className="section-label">SYSTEM CONTEXT</div><h2>Workstreams</h2></div></div>
          <div className="workstreams">
            {workstreams.map((workstream) => (
              <article key={workstream.id} className="workstream-card">
                <div className="workstream-head"><h3>{workstream.name}</h3><span className={`health ${workstream.health}`}>{workstream.health.replaceAll("_", " ")}</span></div>
                <p>{workstream.objective}</p>
                <small>{workstream.latestStatusUpdate}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading"><div><div className="section-label">OPERATOR</div><h2>Suggested Actions</h2></div><span>No automatic execution</span></div>
        <div className="cards proposals">
          {view.proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} />)}
        </div>
      </section>

      <footer>
        <strong>Operator v0.1 boundary:</strong> Read structured state → surface attention → propose bounded next actions → require human approval.
      </footer>
    </main>
  );
}
