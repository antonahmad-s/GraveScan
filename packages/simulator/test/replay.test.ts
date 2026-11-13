import { describe, expect, it } from "vitest";
import { scanFixture } from "@gravescan/scanner";
import { replayScenario, SAFETY_NOTICE, SCENARIOS } from "../src/index.ts";

function scanned(id: string) {
  const result = scanFixture(id);
  if (!result.ok) throw new Error(`Could not scan fixture ${id}`);
  return result.value;
}

const scenarios = [
  ["MCP-TOOL-ESCALATION", "unsafe-mcp"],
  ["HOOK-INPUT-EXECUTION", "unbounded-hook"],
  ["STEERING-SECRET-EXPOSURE", "steering-injection"],
  ["STEERING-FILESYSTEM-ESCAPE", "steering-injection"],
] as const;

describe("scenario catalog", () => {
  it("has exactly four bounded scenarios", () => {
    expect(SCENARIOS).toHaveLength(4);
    for (const scenario of SCENARIOS) {
      expect(scenario.steps.length).toBeGreaterThan(0);
      expect(scenario.steps.length).toBeLessThanOrEqual(5);
      expect(scenario.expectedResult).toBe("exposed");
    }
  });
});

describe("replayScenario", () => {
  it.each(scenarios)("replays %s as exposed against %s", (scenarioId, fixture) => {
    const result = replayScenario(scanned(fixture), scenarioId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.result).toBe("exposed");
    expect(result.value.policyDecision).toBe("allowed");
    expect(result.value.evidence.length).toBeGreaterThan(0);
    expect(result.value.steps.length).toBeLessThanOrEqual(5);
    expect(result.value.safetyNotice).toBe(SAFETY_NOTICE);
  });

  it.each(SCENARIOS)("replays %s as blocked with no target finding", (scenario) => {
    const result = replayScenario({ findings: [], diagnostics: [] }, scenario.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.result).toBe("blocked");
    expect(result.value.policyDecision).toBe("blocked");
    expect(result.value.evidence).toEqual([]);
    expect(result.value.steps.length).toBeLessThanOrEqual(5);
  });

  it("returns a typed error for an unknown scenario", () => {
    expect(replayScenario({ findings: [], diagnostics: [] }, "not-real")).toEqual({
      ok: false,
      error: { code: "UNKNOWN_SCENARIO", id: "not-real" },
    });
  });

  it("returns the exact same trace for the same result and scenario", () => {
    const input = scanned("unsafe-mcp");
    expect(replayScenario(input, "MCP-TOOL-ESCALATION")).toEqual(
      replayScenario(input, "MCP-TOOL-ESCALATION"),
    );
  });
});
