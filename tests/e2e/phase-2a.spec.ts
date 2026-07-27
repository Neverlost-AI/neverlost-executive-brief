import { expect, test, type Page, type Route } from "@playwright/test";

const ownerId = "00000000-0000-4000-8000-000000000001";
const now = "2026-07-26T18:00:00.000Z";

type RecordValue = Record<string, unknown>;

function baseEntry(overrides: RecordValue = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    user_id: ownerId,
    title: "Oldest inbox item",
    content: "Preserved source wording for deliberate triage.",
    category: "note",
    priority: "normal",
    created_at: "2026-07-20T12:00:00.000Z",
    updated_at: "2026-07-20T12:00:00.000Z",
    reviewed_at: null,
    archived_at: null,
    workstream_id: null,
    command_type: "note",
    command_state: "inbox",
    next_action: null,
    due_on: null,
    review_on: null,
    triaged_at: null,
    resolved_at: null,
    ...overrides,
  };
}

function baseWorkstream(overrides: RecordValue = {}) {
  return {
    id: "20000000-0000-4000-8000-000000000001",
    user_id: ownerId,
    name: "Neverlost command center",
    objective: "Hold consequential context and the next deliberate move.",
    status: "active",
    health: "at_risk",
    next_review_on: "2026-07-24",
    stale_after_days: 7,
    latest_status_update: "Manual review is required before the next move.",
    latest_status_updated_at: "2026-07-15T12:00:00.000Z",
    completed_at: null,
    created_at: "2026-07-01T12:00:00.000Z",
    updated_at: "2026-07-15T12:00:00.000Z",
    ...overrides,
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function installMockBackend(page: Page) {
  const entries: RecordValue[] = [
    baseEntry(),
    baseEntry({ id: "10000000-0000-4000-8000-000000000002", title: "Publish bounded evidence", workstream_id: "20000000-0000-4000-8000-000000000001", command_type: "action", command_state: "active", next_action: "Finish the verification report", due_on: "2026-07-25", triaged_at: "2026-07-21T12:00:00.000Z" }),
    baseEntry({ id: "10000000-0000-4000-8000-000000000003", title: "Waiting for protected review", workstream_id: "20000000-0000-4000-8000-000000000001", command_state: "waiting", review_on: null, triaged_at: "2026-07-22T12:00:00.000Z" }),
    baseEntry({ id: "10000000-0000-4000-8000-000000000004", title: "Migration authorization blocked", workstream_id: "20000000-0000-4000-8000-000000000001", command_state: "blocked", review_on: "2026-07-27", triaged_at: "2026-07-23T12:00:00.000Z" }),
    baseEntry({ id: "10000000-0000-4000-8000-000000000005", title: "Keep Phase 1 root", workstream_id: "20000000-0000-4000-8000-000000000001", command_type: "decision", command_state: "resolved", triaged_at: "2026-07-24T12:00:00.000Z", resolved_at: "2026-07-24T12:00:00.000Z" }),
  ];
  const workstreams: RecordValue[] = [baseWorkstream()];
  let preference: RecordValue | null = null;
  let sequence = 20;

  await page.route("https://mock.supabase.test/auth/v1/**", async (route) => {
    const request = route.request();
    if (request.url().includes("logout")) return json(route, {});
    const user = {
      id: ownerId,
      aud: "authenticated",
      role: "authenticated",
      email: "reviewer@example.test",
      email_confirmed_at: now,
      app_metadata: {},
      user_metadata: {},
      created_at: now,
    };
    if (request.url().includes("/user")) return json(route, user);
    return json(route, {
      access_token: "local-test-access-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "local-test-refresh-token",
      user,
    });
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body = method === "GET" ? {} : request.postDataJSON() as RecordValue;
    if (url.pathname === "/api/config") {
      return json(route, { url: "https://mock.supabase.test", anonKey: "local-test-publishable-key" });
    }
    if (url.pathname === "/api/dashboard") return json(route, { entries: entries.filter((entry) => !entry.archived_at), workstreams, server_now: now });
    if (url.pathname === "/api/entries/quick" && method === "POST") {
      const content = String(body.content).trim();
      const firstLine = content.split(/\r?\n/).find((line) => line.trim())!.trim();
      const created = baseEntry({ id: `10000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`, title: Array.from(firstLine).slice(0, 160).join(""), content, created_at: now, updated_at: now });
      entries.push(created);
      return json(route, { entry: created }, 201);
    }
    if (url.pathname === "/api/entries" && method === "GET") {
      const archived = url.searchParams.get("scope") === "archive";
      return json(route, { entries: entries.filter((entry) => archived ? entry.archived_at : !entry.archived_at) });
    }
    if (url.pathname === "/api/entries" && method === "POST") {
      const created = baseEntry({ ...body, id: `10000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`, created_at: now, updated_at: now });
      entries.push(created);
      return json(route, { entry: created }, 201);
    }
    const entryMatch = url.pathname.match(/^\/api\/entries\/([^/]+)$/);
    if (entryMatch) {
      const entry = entries.find((item) => item.id === entryMatch[1]);
      if (!entry) return json(route, { error: "Entry not found." }, 404);
      if (method === "GET") return json(route, { entry });
      if (method === "DELETE") {
        entries.splice(entries.indexOf(entry), 1);
        return json(route, { deleted: true });
      }
      Object.assign(entry, body, { updated_at: now });
      if (body.command_state && body.command_state !== "inbox" && !entry.triaged_at) entry.triaged_at = now;
      if (body.command_state === "resolved") entry.resolved_at = now;
      if (body.command_state && body.command_state !== "resolved") entry.resolved_at = null;
      return json(route, { entry });
    }
    if (url.pathname === "/api/workstreams" && method === "GET") return json(route, { workstreams });
    if (url.pathname === "/api/workstreams" && method === "POST") {
      const created = baseWorkstream({ ...body, id: `20000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`, created_at: now, updated_at: now, latest_status_updated_at: body.latest_status_update ? now : null });
      workstreams.push(created);
      return json(route, { workstream: created }, 201);
    }
    const workstreamMatch = url.pathname.match(/^\/api\/workstreams\/([^/]+)$/);
    if (workstreamMatch) {
      const workstream = workstreams.find((item) => item.id === workstreamMatch[1]);
      if (!workstream) return json(route, { error: "Workstream not found." }, 404);
      if (method === "GET") {
        const related = entries.filter((entry) => entry.workstream_id === workstream.id);
        return json(route, { workstream, entries: related.filter((entry) => !entry.archived_at), related_entry_count: related.length });
      }
      if (method === "PATCH") {
        Object.assign(workstream, body, { updated_at: now });
        return json(route, { workstream });
      }
      for (const entry of entries.filter((item) => item.workstream_id === workstream.id)) {
        entry.workstream_id = null;
        entry.command_state = "inbox";
        entry.resolved_at = null;
        entry.updated_at = now;
      }
      workstreams.splice(workstreams.indexOf(workstream), 1);
      return json(route, { deleted: true, preserved_entries: body.related_entry_count });
    }
    if (url.pathname === "/api/preferences" && method === "GET") return json(route, { preference });
    if (url.pathname === "/api/preferences" && method === "POST") {
      preference = { user_id: ownerId, last_weekly_review_completed_at: now, created_at: now, updated_at: now };
      return json(route, { preference });
    }
    return json(route, { error: "Unhandled test route." }, 500);
  });

  return { entries, workstreams };
}

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("reviewer@example.test");
  await page.getByLabel("Password").fill("local-test-only");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page.getByRole("heading", { name: "Executive Brief" })).toBeVisible();
}

test("Phase 1 phone-to-desktop lifecycle remains intact", async ({ page }) => {
  await installMockBackend(page);
  await signIn(page);
  const title = "Phase 1 regression record";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/capture");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Content").fill("Captured on the phone-sized Phase 1 form.");
  await page.getByLabel("Category").selectOption("follow_up");
  await page.getByLabel("Priority").selectOption("high");
  await page.getByRole("button", { name: "Save to Executive Brief" }).click();
  await expect(page.getByText("Saved. This item is now waiting in your Executive Brief.")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("link", { name: title }).click();
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.getByText("Marked reviewed.")).toBeVisible();
  await page.getByRole("button", { name: "Archive" }).click();
  await page.goto("/archive");
  await expect(page.getByText(title)).toBeVisible();
});

test("dashboard quick capture and deterministic sections render on phone and desktop", async ({ page }) => {
  await installMockBackend(page);
  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Command Center" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Waiting on" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Blocked and at risk" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stale workstreams" })).toBeVisible();
  await page.screenshot({ path: "evidence/phase-2a/dashboard-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.getByLabel("Capture text").first().fill("Unicode 🧭 command update\nPreserve the entire second line.");
  await page.getByRole("button", { name: "Save to Needs triage" }).first().click();
  await expect(page.getByText("Saved to Needs triage.")).toBeVisible();
  await page.screenshot({ path: "evidence/phase-2a/dashboard-phone-quick-capture.png", fullPage: true });
});

test("triage, workstream detail, deletion confirmation, and weekly review render", async ({ page }) => {
  await installMockBackend(page);
  await signIn(page);
  await page.goto("/triage");
  await expect(page.getByRole("heading", { name: "Needs triage" })).toBeVisible();
  await page.screenshot({ path: "evidence/phase-2a/triage.png", fullPage: true });
  await page.getByRole("button", { name: "Create workstream without leaving triage" }).click();
  const creationForm = page.locator("form.workstream-form");
  await creationForm.locator('input[required]').fill("Phase 2A evidence");
  await creationForm.locator("textarea[required]").fill("Verify manual command-center behavior.");
  await page.getByRole("button", { name: "Create workstream" }).click();

  await page.goto("/workstreams");
  await page.screenshot({ path: "evidence/phase-2a/workstream-list.png", fullPage: true });
  await page.getByRole("link", { name: /Neverlost command center/ }).click();
  await page.screenshot({ path: "evidence/phase-2a/workstream-detail.png", fullPage: true });
  await page.getByRole("button", { name: "Review deletion" }).click();
  await expect(page.getByText("No entries will be deleted.")).toBeVisible();
  await page.screenshot({ path: "evidence/phase-2a/workstream-deletion-confirmation.png", fullPage: true });

  await page.goto("/review");
  await page.waitForLoadState("networkidle");
  const checkboxes = page.getByRole("checkbox");
  for (let index = 0; index < await checkboxes.count(); index += 1) {
    await checkboxes.nth(index).check();
    await expect(checkboxes.nth(index)).toBeChecked();
  }
  await page.getByRole("button", { name: "Mark weekly review complete" }).click();
  await expect(page.getByText("Weekly review completion recorded.", { exact: false })).toBeVisible();
  await page.screenshot({ path: "evidence/phase-2a/weekly-review.png", fullPage: true });
});
