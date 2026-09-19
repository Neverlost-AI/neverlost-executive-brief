"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  categories,
  categoryLabel,
  entryInputSchema,
  priorities,
  type EntryInput,
  type EntryUpdate,
} from "@/lib/entries";
import {
  addDemoEntry,
  blankDemoWorkspace,
  createDemoEntry,
  deleteDemoEntry,
  DEMO_STORAGE_KEY,
  newDemoId,
  parseStoredDemoWorkspace,
  seedDemoWorkspace,
  sortDemoEntries,
  updateDemoEntry,
  type DemoEntry,
  type DemoWorkspace,
} from "@/lib/demo-workspace";
import { DemoCommandCenterView, DemoCommandFields, type DemoCommandView } from "@/components/DemoCommandCenterViews";

type DemoView = DemoCommandView | "brief" | "capture" | "archive" | "detail";
type Props = { view: DemoView; entryId?: string; workstreamId?: string };

const emptyInput: EntryInput = {
  title: "",
  content: "",
  category: "note",
  priority: "normal",
};

export function DemoApp({ view, entryId, workstreamId }: Props) {
  const [workspace, setWorkspace] = useState<DemoWorkspace>(seedDemoWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState("");

  useEffect(() => {
    const stored = parseStoredDemoWorkspace(window.localStorage.getItem(DEMO_STORAGE_KEY));
    // Local storage hydration is intentionally isolated to the public demo.
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkspace(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(workspace));
  }, [hydrated, workspace]);

  function resetDemo() {
    setWorkspace(seedDemoWorkspace());
    setWorkspaceMessage("Demo restored to its original synthetic workspace.");
  }

  function startBlank() {
    if (!window.confirm("Clear this synthetic demo workspace and start blank?")) return;
    setWorkspace(blankDemoWorkspace());
    setWorkspaceMessage("Demo workspace cleared. Add any fictional sample you would like to try.");
  }

  return (
    <div className="app-shell demo-shell">
      <DemoHeader view={view} ready={hydrated} onReset={resetDemo} onBlank={startBlank} />
      <aside className="demo-notice" aria-label="Synthetic demo notice">
        <strong>Demo workspace · Synthetic data</strong>
        <span>No real patient information is present. Changes stay in this browser and never reach Supabase.</span>
      </aside>
      {workspaceMessage && <p className="demo-workspace-message" role="status">{workspaceMessage}</p>}
      <main id="main-content" className="main-content">
        {(["command-dashboard", "operator", "triage", "entries", "workstreams", "workstream-detail"] as DemoCommandView[]).includes(view as DemoCommandView) && (
          <DemoCommandCenterView view={view as DemoCommandView} workspace={workspace} setWorkspace={setWorkspace} ready={hydrated} workstreamId={workstreamId} />
        )}
        {view === "brief" && <DemoBrief entries={workspace.entries} />}
        {view === "capture" && <DemoCapture ready={hydrated} setWorkspace={setWorkspace} />}
        {view === "archive" && <DemoArchive ready={hydrated} workspace={workspace} setWorkspace={setWorkspace} />}
        {view === "detail" && entryId && hydrated && workspace.entries.some((entry) => entry.id === entryId) && (
          <DemoEntryDetail ready={hydrated} workspace={workspace} setWorkspace={setWorkspace} entryId={entryId} />
        )}
        {view === "detail" && entryId && hydrated && !workspace.entries.some((entry) => entry.id === entryId) && (
          <EmptyState title="Demo entry not found." body="It may have been deleted or the demo may have been reset." href="/demo/brief" action="Return to demo brief" />
        )}
        {view === "detail" && !hydrated && <p className="message" role="status">Opening synthetic demo entry…</p>}
      </main>
      <footer className="app-footer">
        Neverlost Command Center · Public portfolio demo · Synthetic data only
      </footer>
    </div>
  );
}

function DemoHeader({
  view,
  ready,
  onReset,
  onBlank,
}: {
  view: DemoView;
  ready: boolean;
  onReset: () => void;
  onBlank: () => void;
}) {
  const activeHref = {
    "command-dashboard": "/demo",
    operator: "/demo/operator",
    brief: "/demo/brief",
    capture: "/demo/capture",
    triage: "/demo/triage",
    entries: "/demo/entries",
    workstreams: "/demo/workstreams",
    "workstream-detail": "/demo/workstreams",
    archive: "/demo/archive",
    detail: "/demo/entries",
  }[view];
  const links = [
    ["/demo", "Command Center"],
    ["/demo/operator", "Operator"],
    ["/demo/brief", "Brief"],
    ["/demo/capture", "Capture"],
    ["/demo/triage", "Triage"],
    ["/demo/workstreams", "Workstreams"],
    ["/demo/archive", "Archive"],
  ] as const;
  return (
    <header className="app-header demo-header">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <DemoBrand />
      <nav aria-label="Demo navigation">
        {links.map(([href, label]) => (
          <Link key={href} href={href} aria-current={activeHref === href ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="demo-header-actions">
        <span className="demo-mode-label">Synthetic Demo</span>
        <button className="button button-quiet" type="button" disabled={!ready} onClick={onReset}>Reset demo</button>
        <button className="button button-quiet" type="button" disabled={!ready} onClick={onBlank}>Start blank</button>
      </div>
    </header>
  );
}

function DemoBrand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Image src="/brand/nvlt-official.png" width={42} height={42} alt="Neverlost logo" priority unoptimized />
      </span>
      <div><strong>Neverlost</strong><span>Command Center</span></div>
    </div>
  );
}

function DemoBrief({ entries }: { entries: DemoEntry[] }) {
  const active = useMemo(() => sortDemoEntries(entries.filter((entry) => !entry.archived_at)), [entries]);
  const unreviewed = active.filter((entry) => !entry.reviewed_at);
  const reviewed = active.filter((entry) => entry.reviewed_at);
  return (
    <>
      <PageHeading
        eyebrow="Recruiter portfolio demo"
        title="Executive Brief"
        description="Review the preserved synthetic capture inbox. Every change is local to this browser."
        action={{ href: "/demo/capture", label: "Capture a demo item" }}
      />
      <div className="summary-grid" aria-label="Demo brief summary">
        <SummaryCard label="Needs review" value={unreviewed.length} tone="amber" />
        <SummaryCard label="Reviewed" value={reviewed.length} tone="green" />
        <SummaryCard label="Active total" value={active.length} tone="slate" />
      </div>
      {active.length === 0 && (
        <EmptyState
          title="This demo workspace is blank."
          body="Capture a fictional item or use Reset demo to restore the seeded examples."
          href="/demo/capture"
          action="Capture a demo item"
        />
      )}
      {unreviewed.length > 0 && <DemoEntrySection title="Needs review" entries={unreviewed} />}
      {reviewed.length > 0 && <DemoEntrySection title="Reviewed" entries={reviewed} />}
    </>
  );
}

function DemoCapture({
  ready,
  setWorkspace,
}: {
  ready: boolean;
  setWorkspace: React.Dispatch<React.SetStateAction<DemoWorkspace>>;
}) {
  const [form, setForm] = useState<EntryInput>(emptyInput);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [createdId, setCreatedId] = useState("");

  function change<K extends keyof EntryInput>(key: K, value: EntryInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = entryInputSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setErrors(Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] || "Invalid value."]),
      ));
      return;
    }
    const now = new Date().toISOString();
    const created = createDemoEntry(parsed.data, newDemoId(), now);
    setWorkspace((current) => addDemoEntry(current, created));
    setForm(emptyInput);
    setErrors({});
    setCreatedId(created.id);
    setStatus("Saved to the synthetic demo workspace.");
  }

  return (
    <>
      <PageHeading
        eyebrow="Synthetic capture"
        title="Capture a demo item"
        description="Try the real manual workflow with fictional content. Nothing is sent to a server."
      />
      <form className="panel form-panel" onSubmit={submit} noValidate>
        <Field label="Title" htmlFor="demo-title" error={errors.title}>
          <input id="demo-title" name="title" value={form.title} maxLength={160} disabled={!ready} onChange={(event) => change("title", event.currentTarget.value)} placeholder="A fictional item to carry forward" />
        </Field>
        <Field label="Content" htmlFor="demo-content" error={errors.content}>
          <textarea id="demo-content" name="content" rows={8} value={form.content} maxLength={20_000} disabled={!ready} onChange={(event) => change("content", event.currentTarget.value)} placeholder="Add synthetic context, a decision, or a follow-up." />
        </Field>
        <div className="form-grid">
          <Field label="Category" htmlFor="demo-category">
            <select id="demo-category" name="category" value={form.category} disabled={!ready} onChange={(event) => change("category", event.currentTarget.value as EntryInput["category"])}>
              {categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}
            </select>
          </Field>
          <Field label="Priority" htmlFor="demo-priority">
            <select id="demo-priority" name="priority" value={form.priority} disabled={!ready} onChange={(event) => change("priority", event.currentTarget.value as EntryInput["priority"])}>
              {priorities.map((priority) => <option key={priority} value={priority}>{capitalize(priority)}</option>)}
            </select>
          </Field>
        </div>
        {status && <p className="message message-success" role="status">{status}</p>}
        <div className="form-actions">
          <button className="button button-primary" disabled={!ready}>Save demo item</button>
          {createdId ? <Link className="button button-secondary" href={`/demo/entries/${createdId}`}>Open saved item</Link> : <Link className="button button-quiet" href="/demo">Return to demo brief</Link>}
        </div>
      </form>
    </>
  );
}

function DemoArchive({
  ready,
  workspace,
  setWorkspace,
}: {
  ready: boolean;
  workspace: DemoWorkspace;
  setWorkspace: React.Dispatch<React.SetStateAction<DemoWorkspace>>;
}) {
  const archived = workspace.entries.filter((entry) => entry.archived_at).sort((a, b) => Date.parse(b.archived_at || "") - Date.parse(a.archived_at || ""));
  function restore(entry: DemoEntry) {
    setWorkspace((current) => updateDemoEntry(current, entry.id, { archived_at: null }, new Date().toISOString()));
  }
  return (
    <>
      <PageHeading eyebrow="Synthetic archive" title="Archive" description="Archived demo items remain in this browser and can be restored." />
      {archived.length === 0 && <EmptyState title="Nothing is archived." body="Archive an active demo item to see it here." href="/demo" action="Return to demo brief" />}
      <div className="entry-list">
        {archived.map((entry) => (
          <article className="entry-card entry-card-archived" key={entry.id}>
            <div className="entry-card-topline"><Badge>{categoryLabel(entry.category)}</Badge><time>{formatDate(entry.archived_at || entry.updated_at)}</time></div>
            <h2>{entry.title}</h2><p>{preview(entry.content)}</p>
            <div className="card-actions"><Link className="text-link" href={`/demo/entries/${entry.id}`}>Open entry</Link><button className="button button-quiet" type="button" disabled={!ready} onClick={() => restore(entry)}>Restore</button></div>
          </article>
        ))}
      </div>
    </>
  );
}

function DemoEntryDetail({
  ready,
  workspace,
  setWorkspace,
  entryId,
}: {
  ready: boolean;
  workspace: DemoWorkspace;
  setWorkspace: React.Dispatch<React.SetStateAction<DemoWorkspace>>;
  entryId: string;
}) {
  const router = useRouter();
  const entry = workspace.entries.find((value) => value.id === entryId) || null;
  const [status, setStatus] = useState("");
  const [editForm, setEditForm] = useState<EntryInput>(() => entry ? {
    title: entry.title,
    content: entry.content,
    category: entry.category,
    priority: entry.priority,
  } : emptyInput);

  if (!entry) return <EmptyState title="Demo entry not found." body="It may have been deleted or the demo may have been reset." href="/demo" action="Return to demo brief" />;

  function patch(update: EntryUpdate, message: string) {
    try {
      const now = new Date().toISOString();
      updateDemoEntry(workspace, entryId, update, now);
      setWorkspace((current) => updateDemoEntry(current, entryId, update, now));
      setStatus(message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Demo changes could not be saved.");
    }
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = entryInputSchema.safeParse(editForm);
    if (!parsed.success) { setStatus("Title, content, category, and priority must be valid."); return; }
    patch(parsed.data, "Demo changes saved locally.");
  }

  function remove() {
    if (!window.confirm("Delete this synthetic demo entry?")) return;
    setWorkspace((current) => deleteDemoEntry(current, entryId));
    router.push("/demo/brief");
  }

  return (
    <>
      <PageHeading
        eyebrow={entry.archived_at ? "Archived demo entry" : entry.reviewed_at ? "Reviewed demo entry" : "Demo entry · Needs review"}
        title="Entry detail"
        description={`Synthetic record · Updated ${formatDate(entry.updated_at)}`}
      />
      <form className="panel form-panel" onSubmit={save}>
        <Field label="Title" htmlFor="demo-detail-title"><input id="demo-detail-title" name="title" required maxLength={160} value={editForm.title} disabled={!ready} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} /></Field>
        <Field label="Content" htmlFor="demo-detail-content"><textarea id="demo-detail-content" name="content" required rows={12} maxLength={20_000} value={editForm.content} disabled={!ready} onChange={(event) => setEditForm({ ...editForm, content: event.target.value })} /></Field>
        <div className="form-grid">
          <Field label="Category" htmlFor="demo-detail-category"><select id="demo-detail-category" name="category" value={editForm.category} disabled={!ready} onChange={(event) => setEditForm({ ...editForm, category: event.target.value as EntryInput["category"] })}>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></Field>
          <Field label="Priority" htmlFor="demo-detail-priority"><select id="demo-detail-priority" name="priority" value={editForm.priority} disabled={!ready} onChange={(event) => setEditForm({ ...editForm, priority: event.target.value as EntryInput["priority"] })}>{priorities.map((priority) => <option key={priority} value={priority}>{capitalize(priority)}</option>)}</select></Field>
        </div>
        {status && <p className="message" role="status">{status}</p>}
        <div className="form-actions">
          <button className="button button-primary" disabled={!ready}>Save changes</button>
          <button type="button" className="button button-secondary" disabled={!ready} onClick={() => patch({ reviewed_at: entry.reviewed_at ? null : new Date().toISOString() }, entry.reviewed_at ? "Restored to unreviewed." : "Marked reviewed.")}>{entry.reviewed_at ? "Restore to unreviewed" : "Mark reviewed"}</button>
          <button type="button" className="button button-quiet" disabled={!ready} onClick={() => patch({ archived_at: entry.archived_at ? null : new Date().toISOString() }, entry.archived_at ? "Restored from archive." : "Archived.")}>{entry.archived_at ? "Restore from archive" : "Archive"}</button>
          <button type="button" className="button button-danger" disabled={!ready} onClick={remove}>Delete demo entry</button>
        </div>
      </form>
      <DemoCommandFields key={`${entry.id}-${entry.updated_at}`} entry={entry} workspace={workspace} setWorkspace={setWorkspace} ready={ready} />
    </>
  );
}

function DemoEntrySection({ title, entries }: { title: string; entries: DemoEntry[] }) {
  return (
    <section className="entry-section" aria-labelledby={`demo-section-${title.replaceAll(" ", "-")}`}>
      <div className="section-heading"><h2 id={`demo-section-${title.replaceAll(" ", "-")}`}>{title}</h2><span>{entries.length}</span></div>
      <div className="entry-list">
        {entries.map((entry) => (
          <article className={`entry-card priority-${entry.priority}`} key={entry.id}>
            <div className="entry-card-topline"><div><Badge>{categoryLabel(entry.category)}</Badge><Badge tone={entry.priority}>{entry.priority} priority</Badge></div><time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time></div>
            <h3><Link href={`/demo/entries/${entry.id}`}>{entry.title}</Link></h3>
            <p>{preview(entry.content)}</p>
            <Link className="text-link" href={`/demo/entries/${entry.id}`}>Review demo entry <span aria-hidden="true">→</span></Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: { href: string; label: string } }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <Link className="button button-primary" href={action.href}>{action.label}</Link>}</div>;
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return <div className="field"><label htmlFor={htmlFor}>{label}</label>{children}{error && <small className="field-error">{error}</small>}</div>;
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "amber" | "green" | "slate" }) {
  return <div className={`summary-card summary-${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: DemoEntry["priority"] }) {
  return <span className={`badge ${tone ? `badge-${tone}` : ""}`}>{children}</span>;
}

function EmptyState({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return <section className="empty-state"><div className="empty-symbol" aria-hidden="true">○</div><h2>{title}</h2><p>{body}</p><Link className="button button-secondary" href={href}>{action}</Link></section>;
}

function preview(content: string) { return content.length <= 180 ? content : `${content.slice(0, 177)}…`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)); }
function capitalize(value: string) { return value[0].toUpperCase() + value.slice(1); }
