import { test, expect } from "@playwright/test";
for (const [name, width, height] of [
  ["desktop", 1280, 720],
  ["mobile", 390, 844],
])
  test(`${name} research bench`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(
      page.getByRole("img", { name: "Loss landscape visualization" }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot(`${name}-research-bench.png`, {
      fullPage: true,
    });
  });
