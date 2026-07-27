"use client";

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  categories,
  categoryLabel,
  entryInputSchema,
  entrySchema,
  priorities,
  sortActiveEntries,
  type Entry,
  type EntryInput,
  type EntryUpdate,
} from "@/lib/entries";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { CommandCenterView, EntryCommandFields } from "@/components/CommandCenterViews";

type View =
  | "dashboard"
  | "capture"
  | "archive"
  | "detail"
  | "command-dashboard"
  | "triage"
  | "entries"
  | "workstreams"
  | "workstream-detail"
  | "review";
type Props = { view: View; entryId?: string; workstreamId?: string };
const emptyInput: EntryInput = {
  title: "",
  content: "",
  category: "note",
  priority: "normal",
};

async function authorizedFetch(
  session: Session,
  input: RequestInfo,
  init: RequestInit = {},
) {
  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init.headers,
    },
  });
}

export function ExecutiveBriefApp({ view, entryId, workstreamId }: Props) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [configurationError, setConfigurationError] = useState("");

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    getBrowserSupabase()
      .then(async (supabase) => {
        if (!active) return;
        setClient(supabase);
        const { data } = await supabase.auth.getSession();
        if (active) setSession(data.session);
        const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession);
        });
        unsubscribe = () => listener.data.subscription.unsubscribe();
      })
      .catch(() => {
        if (active) {
          setConfigurationError(
            "This review environment needs Supabase project settings before sign-in can be tested.",
          );
        }
      })
      .finally(() => active && setBooting(false));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (booting) return <CenteredState label="Opening your private brief…" />;
  if (!client || configurationError) {
    return <ReviewSetupState message={configurationError} />;
  }
  if (!session) return <SignIn client={client} />;

  return (
    <div className="app-shell">
      <Header client={client} email={session.user.email || "Signed-in user"} view={view} />
      <main id="main-content" className="main-content">
        {view === "dashboard" && <Dashboard session={session} />}
        {view === "capture" && <Capture session={session} />}
        {view === "archive" && <Archive session={session} />}
        {view === "detail" && entryId && (
          <EntryDetail session={session} entryId={entryId} />
        )}
        {view.startsWith("command-") || ["triage", "entries", "workstreams", "workstream-detail", "review"].includes(view) ? (
          <CommandCenterView view={view} session={session} workstreamId={workstreamId} />
        ) : null}
      </main>
      <footer className="app-footer">
        NVLT Command Center · by Neverlost · Review-only manual MVP
      </footer>
    </div>
  );
}

function Header({ client, email, view }: { client: SupabaseClient; email: string; view: View }) {
  const activeHref = {
    dashboard: "/",
    capture: "/capture",
    archive: "/archive",
    detail: "/entries",
    "command-dashboard": "/dashboard",
    triage: "/triage",
    entries: "/entries",
    workstreams: "/workstreams",
    "workstream-detail": "/workstreams",
    review: "/review",
  }[view];
  const links = [
    ["/", "Brief"],
    ["/dashboard", "Command Center"],
    ["/capture", "Capture"],
    ["/triage", "Triage"],
    ["/workstreams", "Workstreams"],
    ["/review", "Review"],
    ["/archive", "Archive"],
  ] as const;
  return (
    <header className="app-header">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Brand />
      <nav aria-label="Primary navigation">
        {links.map(([href, label]) => (
          <Link key={href} href={href} aria-current={activeHref === href ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="account">
        <span title={email}>{email}</span>
        <button className="button button-quiet" onClick={() => client.auth.signOut()}>
          Sign out
        </button>
      </div>
    </header>
  );
}

function SignIn({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    const { error } = await client.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) setStatus("Sign-in failed. Check your email and password.");
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <div className="eyebrow">Manual continuity, across devices</div>
        <h1>Keep the important thing from getting lost.</h1>
        <p>
          Capture a note on your phone. Review it deliberately at your desk.
          Nothing is summarized, prioritized, or changed for you.
        </p>
        <ul>
          <li>Private to your authenticated account</li>
          <li>Manual review and archive controls</li>
          <li>Protected by Supabase Row Level Security</li>
        </ul>
      </section>
      <section className="auth-card" aria-labelledby="sign-in-title">
        <Brand />
        <div>
          <div className="eyebrow">Review environment</div>
          <h2 id="sign-in-title">Sign in</h2>
          <p>Use the same account on your phone and computer.</p>
        </div>
        <form onSubmit={submit} className="stack">
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          {status && (
            <p className="message message-error" role="alert">
              {status}
            </p>
          )}
          <button className="button button-primary" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in securely"}
          </button>
        </form>
        <p className="fine-print">
          No account data is shared publicly. There is no AI processing.
        </p>
      </section>
    </main>
  );
}

function ReviewSetupState({ message }: { message: string }) {
  return (
    <main className="setup-layout">
      <Brand />
      <section className="setup-card">
        <div className="status-dot" aria-hidden="true" />
        <div>
          <div className="eyebrow">Review-only setup</div>
          <h1>The interface is ready for connection.</h1>
          <p>{message || "This review environment needs Supabase project settings."}</p>
          <p>
            Add the project URL and anon key to the documented environment
            variables, then refresh. No service-role key is needed or allowed.
          </p>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ session }: { session: Session }) {
  const { entries, loading, error } = useEntries(session, "active");
  const ordered = sortActiveEntries(entries);
  const unreviewed = ordered.filter((entry) => !entry.reviewed_at);
  const reviewed = ordered.filter((entry) => entry.reviewed_at);

  return (
    <>
      <PageHeading
        eyebrow="Today’s continuity"
        title="Executive Brief"
        description="Unreviewed items come first. You decide what changes."
        action={{ href: "/capture", label: "Capture an item" }}
      />
      <div className="summary-grid" aria-label="Brief summary">
        <SummaryCard label="Needs review" value={unreviewed.length} tone="amber" />
        <SummaryCard label="Reviewed" value={reviewed.length} tone="green" />
        <SummaryCard label="Active total" value={ordered.length} tone="slate" />
      </div>
      {loading && <CenteredState label="Loading your brief…" compact />}
      {error && <ErrorState message={error} />}
      {!loading && !error && ordered.length === 0 && (
        <EmptyState
          title="Your brief is clear."
          body="Capture the next item you want to carry across devices."
          href="/capture"
          action="Capture your first item"
        />
      )}
      {unreviewed.length > 0 && (
        <EntrySection title="Needs review" entries={unreviewed} />
      )}
      {reviewed.length > 0 && (
        <EntrySection title="Reviewed" entries={reviewed} />
      )}
    </>
  );
}

function Capture({ session }: { session: Session }) {
  const [form, setForm] = useState<EntryInput>(emptyInput);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof EntryInput>(key: K, value: EntryInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("");
    const parsed = entryInputSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [
            key,
            value?.[0] || "Invalid value.",
          ]),
        ),
      );
      return;
    }
    setErrors({});
    setSubmitting(true);
    const response = await authorizedFetch(session, "/api/entries", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    const payload = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setStatus(payload.error || "The entry could not be saved.");
      return;
    }
    setForm(emptyInput);
    setStatus("Saved. This item is now waiting in your Executive Brief.");
  }

  return (
    <>
      <PageHeading
        eyebrow="Phone-friendly capture"
        title="Capture what matters"
        description="Four fields, one deliberate save. You can refine it later."
      />
      <form className="panel form-panel" onSubmit={submit} noValidate>
        <Field label="Title" htmlFor="title" error={errors.title}>
          <input
            id="title"
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            maxLength={160}
            placeholder="What should future-you see first?"
          />
          <small>Required · up to 160 characters</small>
        </Field>
        <Field label="Content" htmlFor="content" error={errors.content}>
          <textarea
            id="content"
            rows={8}
            value={form.content}
            onChange={(event) => update("content", event.target.value)}
            maxLength={20_000}
            placeholder="Record the detail, decision, or thread without summarizing it."
          />
        </Field>
        <div className="form-grid">
          <CategoryField
            id="category"
            value={form.category}
            onChange={(value) => update("category", value)}
          />
          <PriorityField
            id="priority"
            value={form.priority}
            onChange={(value) => update("priority", value)}
          />
        </div>
        {status && (
          <p
            className={`message ${
              status.startsWith("Saved") ? "message-success" : "message-error"
            }`}
            role="status"
          >
            {status}
          </p>
        )}
        <div className="form-actions">
          <button className="button button-primary" disabled={submitting}>
            {submitting ? "Saving…" : "Save to Executive Brief"}
          </button>
          <Link className="button button-quiet" href="/">
            Return to brief
          </Link>
        </div>
      </form>
    </>
  );
}

function Archive({ session }: { session: Session }) {
  const { entries, loading, error, reload } = useEntries(session, "archive");
  async function restore(entry: Entry) {
    await authorizedFetch(session, `/api/entries/${entry.id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived_at: null }),
    });
    reload();
  }
  return (
    <>
      <PageHeading
        eyebrow="Held outside the active brief"
        title="Archive"
        description="Archived items remain private and restorable."
      />
      {loading && <CenteredState label="Loading archive…" compact />}
      {error && <ErrorState message={error} />}
      {!loading && !error && entries.length === 0 && (
        <EmptyState
          title="Nothing is archived."
          body="Items you archive will stay here until you restore or delete them."
          href="/"
          action="Return to brief"
        />
      )}
      <div className="entry-list">
        {entries.map((entry) => (
          <article className="entry-card entry-card-archived" key={entry.id}>
            <div className="entry-card-topline">
              <Badge>{categoryLabel(entry.category)}</Badge>
              <time>{formatDate(entry.archived_at || entry.updated_at)}</time>
            </div>
            <h2>{entry.title}</h2>
            <p>{preview(entry.content)}</p>
            <div className="card-actions">
              <a className="text-link" href={`/entries/${entry.id}`}>
                Open entry
              </a>
              <button className="button button-quiet" onClick={() => restore(entry)}>
                Restore
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function EntryDetail({ session, entryId }: { session: Session; entryId: string }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [form, setForm] = useState<EntryInput>(emptyInput);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const response = await authorizedFetch(session, `/api/entries/${entryId}`);
    const payload = await response.json();
    if (response.ok) {
      const parsed = entrySchema.parse(payload.entry);
      setEntry(parsed);
      setForm({
        title: parsed.title,
        content: parsed.content,
        category: parsed.category,
        priority: parsed.priority,
      });
    } else setStatus(payload.error || "Entry not found.");
    setLoading(false);
  }, [entryId, session]);

  useEffect(() => {
    // Data loading is an intentional external synchronization with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function patch(update: EntryUpdate, message: string) {
    const response = await authorizedFetch(session, `/api/entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify(update),
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error || "The entry could not be updated.");
      return;
    }
    setEntry(entrySchema.parse(payload.entry));
    setStatus(message);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = entryInputSchema.safeParse(form);
    if (!parsed.success) {
      setStatus("Title, content, category, and priority must be valid.");
      return;
    }
    await patch(parsed.data, "Changes saved.");
  }

  async function remove() {
    if (!window.confirm("Permanently delete this entry? This cannot be undone.")) return;
    const response = await authorizedFetch(session, `/api/entries/${entryId}`, {
      method: "DELETE",
    });
    if (response.ok) window.location.assign(entry?.archived_at ? "/archive" : "/");
    else setStatus("The entry could not be deleted.");
  }

  if (loading) return <CenteredState label="Opening entry…" compact />;
  if (!entry) return <ErrorState message={status || "Entry not found."} />;

  return (
    <>
      <PageHeading
        eyebrow={entry.archived_at ? "Archived entry" : entry.reviewed_at ? "Reviewed entry" : "Needs review"}
        title="Entry detail"
        description={`Created ${formatDate(entry.created_at)} · Updated ${formatDate(entry.updated_at)}`}
      />
      <form className="panel form-panel" onSubmit={save}>
        <Field label="Title" htmlFor="detail-title">
          <input
            id="detail-title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            maxLength={160}
            required
          />
        </Field>
        <Field label="Content" htmlFor="detail-content">
          <textarea
            id="detail-content"
            rows={12}
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
            maxLength={20_000}
            required
          />
        </Field>
        <div className="form-grid">
          <CategoryField
            id="detail-category"
            value={form.category}
            onChange={(category) => setForm({ ...form, category })}
          />
          <PriorityField
            id="detail-priority"
            value={form.priority}
            onChange={(priority) => setForm({ ...form, priority })}
          />
        </div>
        {status && (
          <p className="message" role="status">
            {status}
          </p>
        )}
        <div className="form-actions">
          <button className="button button-primary">Save changes</button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              patch(
                { reviewed_at: entry.reviewed_at ? null : new Date().toISOString() },
                entry.reviewed_at ? "Restored to unreviewed." : "Marked reviewed.",
              )
            }
          >
            {entry.reviewed_at ? "Restore to unreviewed" : "Mark reviewed"}
          </button>
          <button
            type="button"
            className="button button-quiet"
            onClick={() =>
              patch(
                { archived_at: entry.archived_at ? null : new Date().toISOString() },
                entry.archived_at ? "Restored from archive." : "Archived.",
              )
            }
          >
            {entry.archived_at ? "Restore from archive" : "Archive"}
          </button>
          <button type="button" className="button button-danger" onClick={remove}>
            Delete
          </button>
        </div>
      </form>
      {!entry.archived_at && (
        <EntryCommandFields session={session} entry={entry} onUpdated={setEntry} />
      )}
    </>
  );
}

function useEntries(session: Session, scope: "active" | "archive") {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    authorizedFetch(session, `/api/entries?scope=${scope}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Entries could not be loaded.");
        if (active) setEntries(entrySchema.array().parse(payload.entries));
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [scope, session, version]);
  return {
    entries,
    loading,
    error,
    reload: () => {
      setLoading(true);
      setError("");
      setVersion((value) => value + 1);
    },
  };
}

function EntrySection({ title, entries }: { title: string; entries: Entry[] }) {
  return (
    <section className="entry-section" aria-labelledby={`section-${title}`}>
      <div className="section-heading">
        <h2 id={`section-${title}`}>{title}</h2>
        <span>{entries.length}</span>
      </div>
      <div className="entry-list">
        {entries.map((entry) => (
          <article className={`entry-card priority-${entry.priority}`} key={entry.id}>
            <div className="entry-card-topline">
              <div>
                <Badge>{categoryLabel(entry.category)}</Badge>
                <Badge tone={entry.priority}>{entry.priority} priority</Badge>
              </div>
              <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
            </div>
            <h3>
              <a href={`/entries/${entry.id}`}>{entry.title}</a>
            </h3>
            <p>{preview(entry.content)}</p>
            <a className="text-link" href={`/entries/${entry.id}`}>
              Review entry <span aria-hidden="true">→</span>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function CategoryField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: EntryInput["category"];
  onChange: (value: EntryInput["category"]) => void;
}) {
  return (
    <Field label="Category" htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as EntryInput["category"])}
      >
        {categories.map((category) => (
          <option key={category} value={category}>
            {categoryLabel(category)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function PriorityField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: EntryInput["priority"];
  onChange: (value: EntryInput["priority"]) => void;
}) {
  return (
    <Field label="Priority" htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as EntryInput["priority"])}
      >
        {priorities.map((priority) => (
          <option key={priority} value={priority}>
            {priority[0].toUpperCase() + priority.slice(1)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Image src="/favicon.svg" width={42} height={42} alt="NVLT logo" priority />
      </span>
      <div>
        <strong>NVLT Command Center</strong>
        <span>by Neverlost</span>
      </div>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && (
        <a className="button button-primary" href={action.href}>
          {action.label}
        </a>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`summary-card summary-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function EmptyState({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <section className="empty-state">
      <div className="empty-symbol" aria-hidden="true">
        ✓
      </div>
      <h2>{title}</h2>
      <p>{body}</p>
      <a className="button button-secondary" href={href}>
        {action}
      </a>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="message message-error" role="alert">
      {message}
    </div>
  );
}

function CenteredState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <main className={compact ? "centered-state compact" : "centered-state"}>
      <div className="loading-ring" aria-hidden="true" />
      <p role="status">{label}</p>
    </main>
  );
}

function preview(content: string) {
  return content.length > 210 ? `${content.slice(0, 207)}…` : content;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
