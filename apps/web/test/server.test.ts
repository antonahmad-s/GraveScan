import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createAppServer } from "../src/server.ts";

let server: ReturnType<typeof createAppServer>;
let baseUrl: string;

beforeAll(async () => {
  server = createAppServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function api(route: string, value: unknown) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  return { response, value: await response.json() };
}

describe("GraveScan web server", () => {
  it("serves the accessible application shell and local assets", async () => {
    const page = await fetch(`${baseUrl}/`);
    expect(page.status).toBe(200);
    const markup = await page.text();
    expect(markup).toContain('<html lang="en"');
    expect(markup).toContain('id="theme-toggle"');
    expect(markup).toContain('id="scan-button"');
    expect(markup).toContain('Skip to workspace');

    const css = await fetch(`${baseUrl}/assets/styles.css`);
    expect(css.headers.get("content-type")).toContain("text/css");
    expect(await css.text()).toContain("prefers-reduced-motion");
    const app = await fetch(`${baseUrl}/assets/app.js`);
    expect(app.headers.get("content-type")).toContain("text/javascript");
  });

  it("runs scan, safe replay, patch, verification, and reset", async () => {
    const fixtures = await fetch(`${baseUrl}/api/fixtures`);
    expect(await fixtures.json()).toEqual({ fixtures: ["steering-injection", "unbounded-hook", "unsafe-mcp"] });

    const scan = await api("/api/scan", { fixture: "unsafe-mcp" });
    expect(scan.response.status).toBe(200);
    const finding = scan.value.report.findings.find((item: { ruleId: string }) => item.ruleId === "GRAVE-001");
    expect(finding).toBeDefined();

    const replay = await api("/api/replay", { fixture: "unsafe-mcp", scenarioId: "MCP-TOOL-ESCALATION" });
    expect(replay.value.replay.result).toBe("exposed");
    expect(replay.value.replay.safetyNotice).toBe("Safe simulation. No arbitrary code or network request was executed.");

    const generated = await api("/api/patch/generate", { fixture: "unsafe-mcp", findingId: finding.id });
    expect(generated.value.patch.diff).toContain("--- a/.kiro/settings/mcp.json");
    const applied = await api("/api/patch/apply", { fixture: "unsafe-mcp", patchId: generated.value.patch.id });
    expect(applied.value.verification.status).toBe("Simulation blocked");
    expect(applied.value.verification.replay.result).toBe("blocked");
    expect(applied.value.report.findings.some((item: { ruleId: string }) => item.ruleId === "GRAVE-001")).toBe(false);

    const reset = await api("/api/reset", { fixture: "unsafe-mcp" });
    expect(reset.value.report.findings.some((item: { ruleId: string }) => item.ruleId === "GRAVE-001")).toBe(true);
  });

  it("rejects uploads, paths, unknown fixtures, and routes", async () => {
    const target = await api("/api/scan", { fixture: "../outside", target: "/etc/passwd" });
    expect(target.response.status).toBe(400);
    expect(target.value.error.code).toBe("INVALID_FIXTURE");

    const invalidRoute = await api("/api/not-real", { fixture: "unsafe-mcp" });
    expect(invalidRoute.response.status).toBe(404);
    expect(invalidRoute.value.error.code).toBe("NOT_FOUND");
  });
});
