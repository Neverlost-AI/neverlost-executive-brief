import { expect, test, type Page } from "@playwright/test";

const storageKey = "neverlost:portfolio-demo:v2";

function monitorForbiddenTraffic(page: Page) {
  const forbiddenRequests: string[] = [];
  const browserErrors: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    const currentPath = new URL(page.url()).pathname;
    if (currentPath.startsWith("/demo") && (url.pathname.startsWith("/api/") || url.hostname.includes("supabase"))) {
      forbiddenRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    const currentPath = new URL(page.url()).pathname;
    if (
      currentPath.startsWith("/demo") &&
      request.failure()?.errorText !== "net::ERR_ABORTED" &&
      new URL(request.url()).origin === new URL(page.url()).origin
    ) browserErrors.push(request.url());
  });
  page.on("pageerror", (error) => {
    if (new URL(page.url()).pathname.startsWith("/demo")) browserErrors.push(error.message);
  });
  page.on("console", (message) => {
    if (new URL(page.url()).pathname.startsWith("/demo") && message.type() === "error") browserErrors.push(message.text());
  });
  return { forbiddenRequests, browserErrors };
}

const trafficByPage = new WeakMap<Page, ReturnType<typeof monitorForbiddenTraffic>>();

test.beforeEach(async ({ page }) => {
  trafficByPage.set(page, monitorForbiddenTraffic(page));
  await page.goto("/demo");
  await page.evaluate((key) => window.localStorage.removeItem(key), storageKey);
  await page.reload();
});

test.afterEach(async ({ page }) => {
  const traffic = trafficByPage.get(page);
  expect(traffic?.forbiddenRequests || []).toEqual([]);
  expect(traffic?.browserErrors || []).toEqual([]);
});

test("Command Center opens anonymously with the complete deterministic synthetic seed and zero private traffic", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Demo workspace · Synthetic data")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Command Center", exact: true })).toBeVisible();
  await expect(page.getByText("The demo clock is fixed at September 19, 2026.")).toBeVisible();
  for (const heading of ["Needs triage", "Active workstreams", "Next actions", "Recent decisions", "Blocked and at risk", "Stale workstreams", "Waiting on"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /Northstar launch readiness/ }).first()).toBeVisible();
  await expect(page.getByText("Archived discovery notes")).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => Boolean(window.localStorage.getItem(key)), storageKey)).toBe(true);
  expect(await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "null"), storageKey)).toMatchObject({ version: 2, entries: expect.any(Array), workstreams: expect.any(Array) });
});

test("Operator answers every bounded question and remains strictly read-only", async ({ page }) => {
  await page.goto("/demo/operator");
  await expect(page.getByRole("heading", { name: "Neverlost Operator" })).toBeVisible();
  await expect(page.getByText("Human approval required")).toBeVisible();
  const before = await page.evaluate((key) => window.localStorage.getItem(key), storageKey);
  const expected = [
    ["What needs attention?", "need attention"],
    ["What am I waiting on?", "waiting"],
    ["What changed recently?", "Most recently updated"],
    ["What should I work on next?", "Suggested next review"],
  ] as const;
  for (const [question, answer] of expected) {
    await page.getByRole("button", { name: question }).click();
    await expect(page.getByRole("status")).toContainText(answer);
  }
  await page.getByRole("link", { name: "Review item" }).first().click();
  await expect(page).toHaveURL(/\/demo\/entries\//);
  const after = await page.evaluate((key) => window.localStorage.getItem(key), storageKey);
  expect(after).toBe(before);
});

test("Triage command fields persist locally and preserve deliberate incomplete-state warnings", async ({ page }) => {
  await page.goto("/demo/triage");
  await expect(page.getByRole("heading", { name: "Competitive research notes" })).toBeVisible();
  await page.getByLabel("Command type").selectOption("action");
  await page.getByLabel("Command state").selectOption("active");
  await page.getByLabel("Workstream").selectOption({ label: "Client onboarding refresh" });
  await page.getByRole("button", { name: "Save and move to next" }).click();
  await expect(page.getByText("missing the recommended next action or review date", { exact: false })).toBeVisible();
  await page.getByLabel("Next action").fill("Review the fictional comparisons");
  await page.getByLabel("Due date").fill("2026-09-24");
  await page.getByRole("button", { name: "Save deliberately" }).click();
  await expect(page.getByRole("heading", { name: "Needs triage is clear." })).toBeVisible();
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "null"), storageKey);
  const entry = stored.entries.find((value: { title: string }) => value.title === "Competitive research notes");
  expect(entry).toMatchObject({ command_type: "action", command_state: "active", next_action: "Review the fictional comparisons", due_on: "2026-09-24" });
  expect(entry.workstream_id).toBeTruthy();
  expect(entry.triaged_at).toBeTruthy();
});

test("Workstream creation and edits persist in browser-local state", async ({ page }) => {
  await page.goto("/demo/workstreams");
  await page.getByLabel("Name").fill("Fictional recruiter launch");
  await page.getByLabel("Objective").fill("Coordinate a synthetic recruiter-facing release.");
  await page.getByLabel("Status", { exact: true }).selectOption("active");
  await page.getByLabel("Health", { exact: true }).selectOption("on_track");
  await page.getByLabel("Next review date").fill("2026-09-28");
  await page.getByLabel("Latest manual status update").fill("The fictional release is ready for review.");
  await page.getByRole("button", { name: "Create workstream" }).click();
  await expect(page.getByText("Synthetic workstream created locally.")).toBeVisible();
  await page.getByRole("link", { name: /Fictional recruiter launch/ }).click();
  await expect(page.getByRole("heading", { name: "Fictional recruiter launch" })).toBeVisible();
  await page.getByLabel("Health", { exact: true }).selectOption("at_risk");
  await page.getByLabel("Latest manual status update").fill("A fictional approval is still outstanding.");
  await page.getByRole("button", { name: "Save workstream" }).click();
  await expect(page.getByText("Workstream changes saved locally.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Health", { exact: true })).toHaveValue("at_risk");
  await expect(page.getByLabel("Latest manual status update")).toHaveValue("A fictional approval is still outstanding.");
});

test("deleting a workstream preserves related entries and returns them to Needs triage", async ({ page }) => {
  await page.goto("/demo/workstreams/a0000000-0000-4000-8000-000000000001");
  await expect(page.getByRole("heading", { name: "Northstar launch readiness" })).toBeVisible();
  await page.getByRole("button", { name: "Review deletion" }).click();
  await page.getByLabel("Type Northstar launch readiness to confirm").fill("Northstar launch readiness");
  await page.getByRole("button", { name: "Delete only this workstream" }).click();
  await expect(page).toHaveURL(/\/demo\/workstreams$/);
  const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "null"), storageKey);
  expect(stored.workstreams.some((workstream: { id: string }) => workstream.id === "a0000000-0000-4000-8000-000000000001")).toBe(false);
  const preserved = stored.entries.filter((entry: { id: string }) => [
    "d0000000-0000-4000-8000-000000000001",
    "d0000000-0000-4000-8000-000000000003",
    "d0000000-0000-4000-8000-000000000004",
  ].includes(entry.id));
  expect(preserved).toHaveLength(3);
  expect(preserved.every((entry: { command_state: string; workstream_id: string | null; resolved_at: string | null }) => entry.command_state === "inbox" && entry.workstream_id === null && entry.resolved_at === null)).toBe(true);
});

test("demo capture, edit, review, command fields, archive, restore, and delete affect only local demo state", async ({ page }) => {
  await page.goto("/demo/capture");
  await page.getByLabel("Title").fill("Recruiter synthetic task");
  await page.getByLabel("Content").fill("A fictional sample created during the portfolio walkthrough.");
  await page.getByLabel("Category").selectOption("follow_up");
  await page.getByLabel("Priority").selectOption("high");
  await page.getByRole("button", { name: "Save demo item" }).click();
  await expect(page.getByText("Saved to the synthetic demo workspace.")).toBeVisible();
  await page.getByRole("link", { name: "Open saved item" }).click();
  await page.waitForURL(/\/demo\/entries\//);
  await page.getByLabel("Title").fill("Recruiter synthetic task — edited");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Demo changes saved locally.")).toBeVisible();
  await expect.poll(() => page.evaluate((key) => {
    const stored = JSON.parse(window.localStorage.getItem(key) || "null");
    return stored.entries.some((entry: { title: string }) => entry.title === "Recruiter synthetic task — edited");
  }, storageKey)).toBe(true);
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page.getByText("Archived.")).toBeVisible();
  await page.goto("/demo/archive");
  const card = page.locator("article", { hasText: "Recruiter synthetic task — edited" });
  await card.getByRole("button", { name: "Restore" }).click();
  await page.goto("/demo/brief");
  await page.getByRole("link", { name: "Recruiter synthetic task — edited" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete demo entry" }).click();
  await expect(page).toHaveURL(/\/demo\/brief$/);
  await expect(page.getByRole("link", { name: "Recruiter synthetic task — edited" })).toHaveCount(0);
});

test("Start blank clears entries and workstreams; Reset restores the complete v2 workspace", async ({ page }) => {
  await page.goto("/demo");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Start blank" }).click();
  await expect(page.getByText("Demo workspace cleared.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /Northstar launch readiness/ })).toHaveCount(0);
  let stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "null"), storageKey);
  expect(stored.entries).toEqual([]);
  expect(stored.workstreams).toEqual([]);
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("link", { name: /Northstar launch readiness/ }).first()).toBeVisible();
  stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "null"), storageKey);
  expect(stored.entries).toHaveLength(8);
  expect(stored.workstreams).toHaveLength(3);
  expect(stored.entries.filter((entry: { archived_at: string | null }) => entry.archived_at)).toHaveLength(1);
});

test("all demo navigation remains namespaced and private mode still requires authentication", async ({ page }) => {
  await page.goto("/demo");
  const navigation = page.getByRole("navigation", { name: "Demo navigation" });
  for (const link of await navigation.getByRole("link").all()) {
    await expect(link).toHaveAttribute("href", /^\/demo(?:\/|$)/);
  }
  for (const name of ["Command Center", "Operator", "Brief", "Capture", "Triage", "Workstreams", "Archive"]) {
    await expect(navigation.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Command Center", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true }).or(page.getByRole("heading", { name: "The interface is ready for connection." }))).toBeVisible();
});

test("major Command Center and Operator functionality remains usable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  const navigation = page.getByRole("navigation", { name: "Demo navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Operator", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Command Center", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await navigation.getByRole("link", { name: "Operator", exact: true }).click();
  await page.getByRole("button", { name: "What needs attention?" }).click();
  await expect(page.getByRole("status")).toContainText("need attention");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Triage", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Competitive research notes" })).toBeVisible();
  await expect(page.getByLabel("Command state")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
