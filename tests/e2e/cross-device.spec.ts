import { expect, test } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test.describe("manual cross-device acceptance", () => {
  test.skip(!email || !password, "Dedicated Supabase test credentials are required.");

  test("capture on phone, review and archive on desktop", async ({ page }) => {
    const uniqueTitle = `Cross-device acceptance ${Date.now()}`;

    await page.goto("/");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in securely" }).click();
    for (const label of ["Email", "Password"]) {
      const field = page.getByLabel(label);
      if (await field.count()) await field.fill("");
    }
    await expect(page.getByRole("heading", { name: "Executive Brief" })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/capture");
    await page.getByLabel("Title").fill(uniqueTitle);
    await page.getByLabel("Content").fill("Created manually from the phone-sized acceptance workflow.");
    await page.getByLabel("Category").selectOption("follow_up");
    await page.getByLabel("Priority").selectOption("high");
    await page.getByRole("button", { name: "Save to Executive Brief" }).click();
    await expect(page.getByText("Saved. This item is now waiting in your Executive Brief.")).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("link", { name: uniqueTitle })).toBeVisible();
    await page.getByRole("link", { name: uniqueTitle }).click();
    await page.getByRole("button", { name: "Mark reviewed" }).click();
    await expect(page.getByText("Marked reviewed.")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Restore to unreviewed" })).toBeVisible();
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("Archived.")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: uniqueTitle })).toHaveCount(0);
    await page.goto("/archive");
    await expect(page.getByText(uniqueTitle)).toBeVisible();

    const archivedCard = page.locator("article", { hasText: uniqueTitle });
    await archivedCard.getByRole("link", { name: "Open entry" }).click();
    await page.getByLabel("Title").fill(`${uniqueTitle} edited`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Changes saved.")).toBeVisible();
    await page.getByRole("button", { name: "Restore to unreviewed" }).click();
    await expect(page.getByText("Restored to unreviewed.")).toBeVisible();
    await page.getByRole("button", { name: "Restore from archive" }).click();
    await expect(page.getByText("Restored from archive.")).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: `${uniqueTitle} edited` })).toBeVisible();
    await page.getByRole("link", { name: `${uniqueTitle} edited` }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();
    await page.waitForURL("/");
    await expect(
      page.getByRole("link", { name: `${uniqueTitle} edited` }),
    ).toHaveCount(0);
  });
});
