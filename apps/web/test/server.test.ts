import { existsSync, readdirSync } from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeTempDir, removeDir } from "../../../packages/fixtures/test/helpers.ts";
import { createAppServer } from "../src/server.ts";

let server: ReturnType<typeof createAppServer>;
let baseUrl: string;
let parent: string;
let workRoot: string;

beforeAll(async () => {
  parent = makeTempDir();
  workRoot = path.join(parent, "sessions");
  server = createAppServer({ workRoot, maxSessions: 3 });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  removeDir(parent);
});

type Finding = { id: string; ruleId: string };
// Response shapes differ per route and are asserted field by field in each test.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function client() {
  let cookie: string | undefined;
  return async (route: string, body: unknown) => {
    const response = await fetch(`${baseUrl}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie === undefined ? {} : { Cookie: cookie }) },
      body: JSON.stringify(body),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie !== null) cookie = setCookie.split(";")[0];
    const value: Json = await response.json();
    return { response, value, setCookie };
  };
}

describe("GraveScan web server", () => {
  it("serves the application shell with a strict content security policy", async () => {
    const page = await fetch(`${baseUrl}/`);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-security-policy")).toContain("script-src 'self'");
    const markup = await page.text();
    expect(markup).toContain('<html lang="en"');
    expect(markup).toContain("Skip to workspace");
    expect((await fetch(`${baseUrl}/assets/styles.css`)).headers.get("content-type")).toContain("text/css");
    expect((await fetch(`${baseUrl}/assets/app.js`)).headers.get("content-type")).toContain("text/javascript");
    expect(await (await fetch(`${baseUrl}/healthz`)).json()).toEqual({ status: "ok" });
  });

  it("issues an HttpOnly, SameSite=Strict session cookie", async () => {
    const { setCookie } = await client()("/api/scan", { fixture: "unsafe-mcp" });
    expect(setCookie).toMatch(/^gravescan_session=[0-9a-f-]{36}; Path=\/; HttpOnly; SameSite=Strict$/);
  });

  it("runs scan, safe replay, patch, verification, report, and reset", async () => {
    const api = client();
    const scan = await api("/api/scan", { fixture: "unsafe-mcp" });
    const finding = scan.value.report.findings.find((item: Finding) => item.ruleId === "GRAVE-001");
    expect(finding).toBeDefined();

    const replay = await api("/api/replay", { fixture: "unsafe-mcp", scenarioId: "MCP-TOOL-ESCALATION" });
    expect(replay.value.replay.result).toBe("exposed");

    const generated = await api("/api/patch/generate", { fixture: "unsafe-mcp", findingId: finding.id });
    expect(generated.value.patch.diff).toContain("--- a/.kiro/settings/mcp.json");

    const applied = await api("/api/patch/apply", { fixture: "unsafe-mcp", patchId: generated.value.patch.id });
    expect(applied.value.verification.status).toBe("Simulation blocked");
    expect(applied.value.comparison.resolved.map((item: Finding) => item.ruleId)).toEqual(["GRAVE-001"]);
    expect(applied.value.comparison.introduced).toEqual([]);

    const report = await api("/api/report", { fixture: "unsafe-mcp" });
    expect(report.value.filename).toBe("gravescan-unsafe-mcp.md");
    expect(report.value.markdown).toContain("- Findings before patches: 4");
    expect(report.value.markdown).toContain("- Findings after patches: 3");
    expect(report.value.markdown).toContain("- Verification: Simulation blocked");

    const reset = await api("/api/reset", { fixture: "unsafe-mcp" });
    expect(reset.value.report.findings.some((item: Finding) => item.ruleId === "GRAVE-001")).toBe(true);
    const afterReset = await api("/api/report", { fixture: "unsafe-mcp" });
    expect(afterReset.value.markdown).toContain("No patch was applied.");
  });

  it("isolates one visitor's patches from another visitor", async () => {
    const alice = client();
    const bob = client();
    const scan = await alice("/api/scan", { fixture: "unsafe-mcp" });
    await bob("/api/scan", { fixture: "unsafe-mcp" });
    const finding = scan.value.report.findings.find((item: Finding) => item.ruleId === "GRAVE-001");
    const patch = await alice("/api/patch/generate", { fixture: "unsafe-mcp", findingId: finding.id });

    const stolen = await bob("/api/patch/apply", { fixture: "unsafe-mcp", patchId: patch.value.patch.id });
    expect(stolen.response.status).toBe(404);
    expect(stolen.value.error.code).toBe("PATCH_NOT_FOUND");

    await alice("/api/patch/apply", { fixture: "unsafe-mcp", patchId: patch.value.patch.id });
    const bobReplay = await bob("/api/replay", { fixture: "unsafe-mcp", scenarioId: "MCP-TOOL-ESCALATION" });
    expect(bobReplay.value.replay.result).toBe("exposed");
  });

  it("evicts the oldest session and deletes its isolated copy beyond the limit", async () => {
    const clients = Array.from({ length: 4 }, () => client());
    for (const api of clients) await api("/api/scan", { fixture: "unbounded-hook" });
    expect(readdirSync(workRoot).length).toBeLessThanOrEqual(3);
  });

  it("rejects paths, unknown fixtures, malformed bodies, and unknown routes", async () => {
    const api = client();
    const target = await api("/api/scan", { fixture: "../outside", target: "/etc/passwd" });
    expect(target.response.status).toBe(400);
    expect(target.value.error.code).toBe("INVALID_FIXTURE");

    const malformed = await fetch(`${baseUrl}/api/scan`, { method: "POST", body: "{not json" });
    expect(malformed.status).toBe(400);
    const malformedBody: Json = await malformed.json();
    expect(malformedBody.error.code).toBe("INVALID_REQUEST");

    const unknown = await api("/api/not-real", { fixture: "unsafe-mcp" });
    expect(unknown.response.status).toBe(404);
  });

  it("refuses a work root outside .gravescan-work and the temp directory", () => {
    expect(() => createAppServer({ workRoot: "/" })).toThrow(/workRoot/);
    expect(existsSync("/")).toBe(true);
  });
});
