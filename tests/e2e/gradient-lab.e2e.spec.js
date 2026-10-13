import { test, expect } from "@playwright/test";
test("a visitor can step, retain, compare, and reset an experiment", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Function")).toHaveValue("bowl");
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(page.getByText("Paused · Step 1")).toBeVisible();
  await page.getByRole("button", { name: /Add to comparison/ }).click();
  await page.getByLabel("Optimizer").selectOption("adam");
  await expect(page.getByRole("table")).toContainText(
    "Gradient descent · α 0.08",
  );
  await expect(page.getByRole("table")).toContainText("Adam · α 0.08");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByText("Paused · Step 0")).toBeVisible();
});
test("large learning rates produce an explicit failure rather than a bounded fake path", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Large learning rate" }).click();
  await page.getByLabel("Inspect iteration").focus();
  await page.getByLabel("Inspect iteration").press("End");
  await expect(page.getByText(/Stopped: safety limit/)).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "outside the plotted area" }),
  ).toBeVisible();
});
test("URL round trip preserves the experiment and rejects unknown versions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Optimizer").selectOption("adam");
  await page.getByRole("button", { name: "Share experiment" }).click();
  const url = page.url();
  await page.goto(url);
  await expect(page.getByLabel("Optimizer")).toHaveValue("adam");
  await page.goto("/?experiment=" + encodeURIComponent('{"version":2}'));
  await expect(page.getByRole("alert")).toContainText("unsupported version");
});
test("a shared start change clears retained runs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Add to comparison/ }).click();
  await page.getByText("Starting point", { exact: true }).click();
  await page.getByRole("spinbutton", { name: "x", exact: true }).fill("1");
  await expect(
    page.getByRole("button", { name: /Add to comparison/ }),
  ).toContainText("(0/2)");
});

test("rendering and playback controls cannot change downloaded mathematics", async ({
  page,
}) => {
  await page.goto("/");
  async function downloadTrace() {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download traces" }).click();
    const download = await pending;
    const stream = await download.createReadStream();
    let text = "";
    for await (const chunk of stream) text += chunk;
    return JSON.parse(text);
  }
  const before = await downloadTrace();
  await page.getByRole("button", { name: "Contour", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Speed", exact: true })
    .selectOption("4");
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const after = await downloadTrace();
  expect(after).toEqual(before);
});

test("guide navigation preserves a shared experiment and its current step", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Optimizer").selectOption("adam");
  await page.getByRole("button", { name: "Share experiment" }).click();
  const query = new URL(page.url()).search;
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await page.getByRole("link", { name: "How to use", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "How to use Gradient Lab" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to tool ↑" }).click();
  expect(new URL(page.url()).search).toBe(query);
  await expect(page.getByText("Paused · Step 1")).toBeVisible();
  await expect(page.getByLabel("Optimizer")).toHaveValue("adam");
});
