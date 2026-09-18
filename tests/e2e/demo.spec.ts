import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await page.evaluate(() => window.localStorage.clear());
});

test("/demo opens without authentication, renders synthetic seed data, and stays off authenticated APIs", async ({ page }) => {
  const forbiddenRequests: string[] = [];
  const browserErrors: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) forbiddenRequests.push(request.url());
  });
  page.on("requestfailed", (request) => {
    if (
      request.failure()?.errorText !== "net::ERR_ABORTED" &&
      new URL(request.url()).origin === new URL(page.url()).origin
    ) browserErrors.push(request.url());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/demo");
  await expect(page.getByText("Demo workspace · Synthetic data")).toBeVisible();
  await expect(page.getByText("No real patient information is present.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Executive Brief" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review launch-readiness checklist" })).toBeVisible();
  await expect(page.getByText("Archived discovery notes")).toHaveCount(0);
  expect(forbiddenRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
});

test("demo capture, edit, review, archive, restore, and delete affect only demo state", async ({ page }) => {
  await page.goto("/demo/capture");
  await page.getByLabel("Title").fill("Recruiter synthetic task");
  await page.getByLabel("Content").fill("A fictional sample created during the portfolio walkthrough.");
  await page.getByLabel("Category").selectOption("follow_up");
  await page.getByLabel("Priority").selectOption("high");
  await page.getByRole("button", { name: "Save demo item" }).click();
  await expect(page.getByText("Saved to the synthetic demo workspace.")).toBeVisible();
  await page.getByRole("link", { name: "Open saved item" }).click();
  await page.waitForURL(/\/demo\/entries\//);
  await page.waitForLoadState("networkidle");

  const detailTitle = page.getByLabel("Title");
  await detailTitle.fill("Recruiter synthetic task — edited");
  await expect(detailTitle).toHaveValue("Recruiter synthetic task — edited");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Demo changes saved locally.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const stored = window.localStorage.getItem("neverlost:portfolio-demo:v1");
    return Boolean(stored && (JSON.parse(stored) as Array<{ title: string }>).some((item) => item.title === "Recruiter synthetic task — edited"));
  })).toBe(true);
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.getByText("Marked reviewed.")).toBeVisible();
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const stored = window.localStorage.getItem("neverlost:portfolio-demo:v1");
    if (!stored) return false;
    const entry = (JSON.parse(stored) as Array<{ title: string; archived_at: string | null }>).find((item) => item.title === "Recruiter synthetic task — edited");
    return Boolean(entry?.archived_at);
  })).toBe(true);

  await page.goto("/demo/archive");
  const card = page.locator("article", { hasText: "Recruiter synthetic task — edited" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Restore" }).click();
  await expect(card).toHaveCount(0);

  await page.goto("/demo");
  await page.getByRole("link", { name: "Recruiter synthetic task — edited" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete demo entry" }).click();
  await page.waitForURL("/demo");
  await expect(page.getByRole("link", { name: "Recruiter synthetic task — edited" })).toHaveCount(0);
});

test("start blank and reset restore the original synthetic workspace", async ({ page }) => {
  await page.goto("/demo");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Start blank" }).click();
  await expect(page.getByRole("heading", { name: "This demo workspace is blank." })).toBeVisible();
  await expect(page.getByText("Archived discovery notes")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("link", { name: "Review launch-readiness checklist" })).toBeVisible();
  await page.getByRole("link", { name: "Archive" }).click();
  await expect(page).toHaveURL(/\/demo\/archive$/);
  await expect(page.getByText("Archived discovery notes")).toBeVisible();
});

test("demo navigation remains namespaced and private mode still does not open without authentication", async ({ page }) => {
  await page.goto("/demo");
  const navigation = page.getByRole("navigation", { name: "Demo navigation" });
  for (const link of await navigation.getByRole("link").all()) {
    await expect(link).toHaveAttribute("href", /^\/demo(?:\/|$)/);
  }
  await navigation.getByRole("link", { name: "Capture", exact: true }).click();
  await expect(page).toHaveURL(/\/demo\/capture$/);
  await navigation.getByRole("link", { name: "Brief", exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Executive Brief" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }).or(
      page.getByRole("heading", { name: "The interface is ready for connection." }),
    ),
  ).toBeVisible();
});

test("demo remains usable at a compact mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await expect(page.getByText("Demo workspace · Synthetic data")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Demo navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset demo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review launch-readiness checklist" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole("link", { name: "Review launch-readiness checklist" }).click();
  await expect(page.getByRole("button", { name: "Mark reviewed" })).toBeVisible();
});
