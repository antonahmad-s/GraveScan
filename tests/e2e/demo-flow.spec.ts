import { expect, test, type Page } from "@playwright/test";

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function scanUnsafeMcp(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: /Unsafe MCP/ }).click();
  await page.getByRole("button", { name: "Run scan" }).click();
  await expect(page.getByRole("status").first()).toContainText("Scan complete. 4 evidence-based findings");
}

test("demo flow: scan, replay, patch, verify, compare, export, reset", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await expect(page.getByText("Select a fixture, then run a scan.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run scan" })).toBeDisabled();

  await scanUnsafeMcp(page);
  await page.getByRole("button", { name: /GRAVE-001/ }).click();
  await expect(page.locator(".evidence").first()).toContainText("autoApprove");

  await page.getByRole("button", { name: "Run safe replay" }).click();
  await expect(page.getByText("Capability exposure reproduced safely.")).toBeVisible();
  await expect(page.getByText("Safe simulation. No arbitrary code or network request was executed.").last()).toBeVisible();

  await page.getByRole("button", { name: "Generate patch" }).click();
  await expect(page.locator(".diff")).toContainText("--- a/.kiro/settings/mcp.json");

  await page.getByRole("button", { name: "Apply to isolated copy" }).click();
  await expect(page.getByText("Simulation blocked", { exact: true })).toBeVisible();
  const comparison = page.getByLabel("Findings compared with the first scan");
  await expect(comparison).toContainText("Resolved since first scan (1)");
  await expect(comparison).toContainText("GRAVE-001");
  await expect(comparison).toContainText("Introduced since first scan (0)");
  await expect(page.locator("#finding-list")).not.toContainText("GRAVE-001");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Markdown" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("gravescan-unsafe-mcp.md");
  const stream = await file.createReadStream();
  let markdown = "";
  for await (const chunk of stream) markdown += String(chunk);
  expect(markdown).toContain("- Findings before patches: 4");
  expect(markdown).toContain("- Findings after patches: 3");
  expect(markdown).toContain("- Verification: Simulation blocked");

  await page.getByRole("button", { name: "Reset isolated copy" }).click();
  await expect(page.getByRole("button", { name: /GRAVE-001/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("filters show an empty state when nothing matches", async ({ page }) => {
  await scanUnsafeMcp(page);
  await page.selectOption("#severity-filter", "critical");
  await expect(page.getByText("No findings match the selected filters.")).toBeVisible();
  await page.selectOption("#severity-filter", "all");
  await page.selectOption("#rule-filter", "GRAVE-001");
  await expect(page.locator("#finding-list li")).toHaveCount(1);
});

test("light and dark themes both apply", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("keyboard: skip link first, Enter activates controls, focus is visible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to workspace" })).toBeFocused();
  const fixture = page.getByRole("button", { name: /Unsafe MCP/ });
  await fixture.focus();
  await page.keyboard.press("Enter");
  await expect(fixture).toHaveAttribute("aria-pressed", "true");
  // Re-rendering the list must not drop keyboard focus to <body>.
  await expect(fixture).toBeFocused();
  expect(await fixture.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");

  await page.getByRole("button", { name: "Run scan" }).click();
  const finding = page.getByRole("button", { name: /GRAVE-002/ });
  await finding.focus();
  await page.keyboard.press("Enter");
  await expect(finding).toHaveAttribute("aria-current", "true");
  await expect(finding).toBeFocused();
});

for (const width of [390, 768, 1060, 1440]) {
  test(`no horizontal overflow and 44px tap targets at ${width}px after a full flow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await scanUnsafeMcp(page);
    await page.getByRole("button", { name: /GRAVE-001/ }).click();
    await page.getByRole("button", { name: "Generate patch" }).click();
    await page.getByRole("button", { name: "Apply to isolated copy" }).click();
    await expect(page.getByText("Simulation blocked", { exact: true })).toBeVisible();
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(size.scroll).toBeLessThanOrEqual(size.viewport);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .filter((button) => (button as HTMLElement).offsetParent !== null && button.getBoundingClientRect().height < 44)
        .map((button) => button.textContent?.trim()),
    );
    expect(small).toEqual([]);
  });
}

test("one visitor's patch does not change another visitor's copy", async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alice = await aliceContext.newPage();

  await scanUnsafeMcp(alice);
  await alice.getByRole("button", { name: /GRAVE-001/ }).click();
  await alice.getByRole("button", { name: "Generate patch" }).click();
  await alice.getByRole("button", { name: "Apply to isolated copy" }).click();
  await expect(alice.getByText("Simulation blocked", { exact: true })).toBeVisible();

  // Bob never scans, so a shared copy would already contain Alice's patch and replay as blocked.
  const response = await bobContext.request.post("/api/replay", { data: { fixture: "unsafe-mcp", scenarioId: "MCP-TOOL-ESCALATION" } });
  expect((await response.json()).replay.result).toBe("exposed");

  await aliceContext.close();
  await bobContext.close();
});
