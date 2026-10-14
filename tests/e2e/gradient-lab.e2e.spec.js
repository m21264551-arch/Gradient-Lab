import { test, expect } from "@playwright/test";
test("a visitor can step, retain, compare, and reset an experiment", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Function")).toHaveValue("bowl");
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(page.getByText("Paused · Step 1")).toBeVisible();
  await page.getByRole("button", { name: /Add(?:ed)? to comparison/ }).click();
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
  await page.getByRole("button", { name: "Copy current run link" }).click();
  const url = page.url();
  await page.goto(url);
  await expect(page.getByLabel("Optimizer")).toHaveValue("adam");
  await page.goto("/?experiment=" + encodeURIComponent('{"version":2}'));
  await expect(page.getByRole("alert")).toContainText("unsupported version");
});
test("a shared start change clears retained runs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Add(?:ed)? to comparison/ }).click();
  await page.getByText("Starting point", { exact: true }).click();
  await page.getByRole("spinbutton", { name: "x", exact: true }).fill("1");
  await expect(page.getByText("0 of 2 saved · current run also shown")).toBeVisible();
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
  await page.getByText("Step details", {exact:true}).click();
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
  await page.getByRole("button", { name: "Copy current run link" }).click();
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

test("saved comparisons preserve position and can be restored after a start change", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await page.getByRole("button", { name: "Add to comparison", exact: true }).click();
  await expect(page.getByText("Paused · Step 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Added to comparison" })).toBeDisabled();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByLabel("Function").selectOption("saddle");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Function")).toHaveValue("bowl");
  await expect(page.getByText("Paused · Step 1")).toBeVisible();
  await page.getByLabel("Optimizer").selectOption("adam");
  await expect(page.getByRole("table")).toContainText("Adam · α 0.08");
  await page.getByRole("button", { name: "Remove Gradient descent · α 0.08" }).click();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("an exact learning rate is keyboard editable and exposed without a logarithm", async ({ page }) => {
  await page.goto("/");
  const rate = page.getByRole("spinbutton", { name: "Learning rate α" });
  await rate.fill("0.0123"); await rate.press("Tab");
  await expect(page.getByRole("slider", { name: "Learning rate slider" })).toHaveAttribute("aria-valuetext", "0.0123");
  await rate.fill("2"); await rate.press("Tab");
  await expect(page.getByRole("alert")).toContainText("between 0.00001 and 1");
});

for (const [width, height] of [[1280,720],[800,900],[390,844]]) {
  test(`primary feedback and geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({width, height}); await page.goto("/");
    const bounds = await page.locator("canvas").boundingBox();
    expect(bounds.height).toBeGreaterThanOrEqual(320);
    if(width >= 1200) {
      const settings=await page.getByRole("region",{name:"Basic settings"}).boundingBox();
      const results=await page.getByRole("region",{name:"Experiment results"}).boundingBox();
      expect(settings.x+settings.width).toBeLessThanOrEqual(bounds.x);
      expect(results.x).toBeGreaterThanOrEqual(bounds.x+bounds.width);
      expect((await page.locator(".results svg").boundingBox()).y).toBeLessThan(height-200);
    }
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
    expect((await page.getByRole("button", {name:"Run animation"}).boundingBox()).y).toBeLessThan(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({path:`../../outputs/distinct-tested-gradient-${width}.png`});
    await page.getByRole("link", {name:"How to use",exact:true}).click();
    await page.getByRole("heading", {name:"How to use Gradient Lab"}).scrollIntoViewIfNeeded();
    await page.screenshot({path:`../../outputs/distinct-tested-gradient-guide-${width}.png`});
  });
}


test('phone playback has a visible loss trend and nearby comparison action',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.getByRole('button',{name:'Stable descent',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Large learning rate',exact:true})).toBeVisible();
 await expect(page.locator('.mobile-feedback')).toContainText('Run the optimizer or take one Step.');
 await page.getByRole('button',{name:'Step',exact:true}).click();
 await expect(page.locator('.loss-trend svg')).toHaveAttribute('aria-label',/iteration 1/);
 const bowl=await page.locator('canvas').boundingBox();
 const action=await page.getByRole('button',{name:'Add to comparison',exact:true}).boundingBox();
 expect(action.y-bowl.y-bowl.height).toBeLessThan(40);
 await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
 await expect(page.getByText('Paused · Step 1')).toBeVisible();
});

test('comparison explains the lowest displayed loss with iteration and settings',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
 await page.getByLabel('Optimizer').selectOption('momentum');await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
 await page.getByLabel('Optimizer').selectOption('adam');await page.getByLabel('Inspect iteration').fill('17');
 await expect(page.getByLabel('Comparison finding')).toContainText('Momentum · α 0.08');
 await expect(page.getByLabel('Comparison finding')).toContainText('17');
 await expect(page.getByLabel('Comparison finding')).toContainText('0.13681');
 await expect(page.locator('.comparison-scope')).toContainText('the settings and iteration shown');
 await page.getByRole('button',{name:'Reset',exact:true}).click();
 await expect(page.getByLabel('Comparison finding')).toContainText('Starting loss');
});
test('primary action retains legible contrast while hovered',async({page})=>{
 await page.goto('/');const run=page.getByRole('button',{name:'Run animation'});await run.hover();
 const colors=await run.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
 expect(colors).toEqual({background:'rgb(38, 61, 128)',color:'rgb(255, 255, 255)'});
});
