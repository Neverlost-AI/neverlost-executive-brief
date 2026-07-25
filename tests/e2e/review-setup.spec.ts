import { expect, test } from "@playwright/test";

test("shows a clear setup state at phone and desktop widths", async ({ page }) => {
  test.skip(
    Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    "The configured environment shows sign-in instead of the setup state.",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The interface is ready for connection." }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(
    page.getByText("No service-role key is needed or allowed.", { exact: false }),
  ).toBeVisible();
});
