import { expect, test } from "@playwright/test";

test("shows a clear setup state at phone and desktop widths", async ({ page }) => {
  const configured = Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (process.env.SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    configured
      ? page.getByRole("heading", { name: "Sign in", exact: true })
      : page.getByRole("heading", {
          name: "The interface is ready for connection.",
        }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(
    configured
      ? page.getByLabel("Password")
      : page.getByText("No service-role key is needed or allowed.", {
          exact: false,
        }),
  ).toBeVisible();
});
