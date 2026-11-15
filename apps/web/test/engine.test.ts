import { listFixtures, loadFixture, type FixtureFile, type FixtureId } from "@gravescan/fixtures";
import { describe, expect, it } from "vitest";
import { createEngine, EngineError, type FixtureBundle } from "../src/engine.ts";

function bundle(): FixtureBundle {
  const entries = listFixtures().map((id): [FixtureId, FixtureFile[]] => {
    const files = loadFixture(id);
    if (!files.ok) throw new Error(`fixture ${id} failed to load`);
    return [id, files.value];
  });
  return Object.fromEntries(entries) as unknown as FixtureBundle;
}

type Finding = { id: string; ruleId: string };
// Response shapes differ per route and are asserted field by field in each test.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function client(engine = createEngine(bundle())) {
  return (route: string, payload: Record<string, unknown>): Json => engine.call(route, payload);
}

function errorCode(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof EngineError) return error.code;
    throw error;
  }
  return undefined;
}

describe("GraveScan browser engine", () => {
  it("lists the controlled fixtures in a stable order", () => {
    expect(createEngine(bundle()).fixtures()).toEqual([...listFixtures()].sort());
  });

  it("runs scan, safe replay, patch, verification, report, and reset", () => {
    const api = client();
    const scan = api("/api/scan", { fixture: "unsafe-mcp" });
    const finding = scan.report.findings.find((item: Finding) => item.ruleId === "GRAVE-001");
    expect(finding).toBeDefined();

    const replay = api("/api/replay", { fixture: "unsafe-mcp", scenarioId: "MCP-TOOL-ESCALATION" });
    expect(replay.replay.result).toBe("exposed");

    const generated = api("/api/patch/generate", { fixture: "unsafe-mcp", findingId: finding.id });
    expect(generated.patch.diff).toContain("--- a/.kiro/settings/mcp.json");

    const applied = api("/api/patch/apply", { fixture: "unsafe-mcp", patchId: generated.patch.id });
    expect(applied.applied.applied).toBe(true);
    expect(applied.verification.status).toBe("Simulation blocked");
    expect(applied.comparison.resolved.map((item: Finding) => item.ruleId)).toEqual(["GRAVE-001"]);
    expect(applied.comparison.introduced).toEqual([]);

    const again = api("/api/patch/apply", { fixture: "unsafe-mcp", patchId: generated.patch.id });
    expect(again.applied.applied).toBe(false);

    const report = api("/api/report", { fixture: "unsafe-mcp" });
    expect(report.filename).toBe("gravescan-unsafe-mcp.md");
    expect(report.markdown).toContain("- Findings before patches: 4");
    expect(report.markdown).toContain("- Findings after patches: 3");
    expect(report.markdown).toContain("- Verification: Simulation blocked");

    const reset = api("/api/reset", { fixture: "unsafe-mcp" });
    expect(reset.report.findings.some((item: Finding) => item.ruleId === "GRAVE-001")).toBe(true);
    expect(api("/api/report", { fixture: "unsafe-mcp" }).markdown).toContain("No patch was applied.");
    expect(errorCode(() => api("/api/patch/apply", { fixture: "unsafe-mcp", patchId: generated.patch.id }))).toBe("PATCH_NOT_FOUND");
  });

  it("keeps two engines isolated from each other", () => {
    const alice = client();
    const bob = client();
    const scan = alice("/api/scan", { fixture: "unsafe-mcp" });
    bob("/api/scan", { fixture: "unsafe-mcp" });
    const finding = scan.report.findings.find((item: Finding) => item.ruleId === "GRAVE-001");
    const patch = alice("/api/patch/generate", { fixture: "unsafe-mcp", findingId: finding.id });

    expect(errorCode(() => bob("/api/patch/apply", { fixture: "unsafe-mcp", patchId: patch.patch.id }))).toBe("PATCH_NOT_FOUND");

    alice("/api/patch/apply", { fixture: "unsafe-mcp", patchId: patch.patch.id });
    expect(bob("/api/replay", { fixture: "unsafe-mcp", scenarioId: "MCP-TOOL-ESCALATION" }).replay.result).toBe("exposed");
  });

  it("does not let a caller change engine state by editing a response or the bundle", () => {
    const source = bundle();
    const api = client(createEngine(source));
    const scan = api("/api/scan", { fixture: "unsafe-mcp" });
    const finding = scan.report.findings.find((item: Finding) => item.ruleId === "GRAVE-001");
    const generated = api("/api/patch/generate", { fixture: "unsafe-mcp", findingId: finding.id });
    generated.patch.after = "{}";
    for (const file of source["unsafe-mcp"]) (file as { content: string }).content = "";

    const applied = api("/api/patch/apply", { fixture: "unsafe-mcp", patchId: generated.patch.id });
    expect(applied.verification.status).toBe("Simulation blocked");
    expect(applied.applied.patch.after).not.toBe("{}");
    const reset = api("/api/reset", { fixture: "unsafe-mcp" });
    expect(reset.report.findings.some((item: Finding) => item.ruleId === "GRAVE-001")).toBe(true);
  });

  it("rejects paths, unknown fixtures, unknown findings, scenarios, and routes", () => {
    const api = client();
    expect(errorCode(() => api("/api/scan", { fixture: "../outside", target: "/etc/passwd" }))).toBe("INVALID_FIXTURE");
    expect(errorCode(() => api("/api/scan", { fixture: "__proto__" }))).toBe("INVALID_FIXTURE");
    expect(errorCode(() => api("/api/scan", {}))).toBe("INVALID_FIXTURE");
    expect(errorCode(() => api("/api/replay", { fixture: "unsafe-mcp", scenarioId: 7 }))).toBe("INVALID_SCENARIO");
    expect(errorCode(() => api("/api/patch/generate", { fixture: "unsafe-mcp", findingId: "nope" }))).toBe("FINDING_NOT_FOUND");
    expect(errorCode(() => api("/api/not-real", { fixture: "unsafe-mcp" }))).toBe("NOT_FOUND");
  });

  it("only serves fixtures that are both known and present in the bundle", () => {
    const partial = { "unsafe-mcp": bundle()["unsafe-mcp"] } as unknown as FixtureBundle;
    const engine = createEngine(partial);
    expect(engine.fixtures()).toEqual(["unsafe-mcp"]);
    expect(errorCode(() => engine.call("/api/scan", { fixture: "unbounded-hook" }))).toBe("INVALID_FIXTURE");
  });
});
