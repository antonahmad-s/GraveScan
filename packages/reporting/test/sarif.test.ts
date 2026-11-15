import { describe, expect, it } from "vitest";
import { redactDeep, scanFiles, type ScanResult } from "@gravescan/scanner";
import { scanFixture } from "@gravescan/scanner";
import { buildSarif } from "../src/index.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function fixture(id: string): ScanResult {
  const result = scanFixture(id);
  if (!result.ok) throw new Error(id);
  return result.value;
}

describe("buildSarif", () => {
  const sarif: Json = buildSarif(redactDeep(fixture("unsafe-mcp")));
  const run = sarif.runs[0];

  it("writes a SARIF 2.1.0 log with one GraveScan run", () => {
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.$schema).toContain("sarif-2.1.0");
    expect(sarif.runs).toHaveLength(1);
    expect(run.tool.driver.name).toBe("GraveScan");
  });

  it("describes each reported rule once, sorted, with GitHub security-severity", () => {
    const ids = run.tool.driver.rules.map((rule: Json) => rule.id);
    expect(ids).toEqual([...new Set(ids)].sort());
    for (const rule of run.tool.driver.rules) {
      expect(Number(rule.properties["security-severity"])).toBeGreaterThan(0);
      expect(rule.shortDescription.text.length).toBeGreaterThan(0);
      expect(rule.fullDescription.text).not.toContain("shell-helper");
    }
  });

  it("maps every finding to a result with a valid rule index, level, and repo-relative location", () => {
    expect(run.results).toHaveLength(4);
    for (const result of run.results) {
      expect(run.tool.driver.rules[result.ruleIndex].id).toBe(result.ruleId);
      expect(["error", "warning", "note"]).toContain(result.level);
      const location = result.locations[0].physicalLocation;
      expect(location.artifactLocation.uri.startsWith(".kiro/")).toBe(true);
      expect(location.region.startLine).toBeGreaterThan(0);
    }
    const levels = Object.fromEntries(run.results.map((result: Json) => [result.ruleId, result.level]));
    expect(levels).toEqual({ "GRAVE-001": "error", "GRAVE-002": "error", "GRAVE-009": "error", "GRAVE-010": "warning" });
  });

  it("keeps fingerprints stable when a line moves and unique when evidence repeats", () => {
    const content = '{\n  "mcpServers": {\n    "a": { "command": "node", "tools": ["x"], "env": { "API_KEY": "value-one-123" } }\n  }\n}\n';
    const moved = `\n\n${content}`;
    const fingerprint = (text: string) => {
      const log: Json = buildSarif(redactDeep(scanFiles([{ path: ".kiro/settings/mcp.json", content: text }])));
      return log.runs[0].results.find((result: Json) => result.ruleId === "GRAVE-009").partialFingerprints["gravescanFinding/v1"];
    };
    expect(fingerprint(moved)).toBe(fingerprint(content));

    const twice: Json = buildSarif({ ...fixture("unsafe-mcp"), findings: [fixture("unsafe-mcp").findings[0], fixture("unsafe-mcp").findings[0]].filter(Boolean) as ScanResult["findings"] });
    const prints = twice.runs[0].results.map((result: Json) => result.partialFingerprints["gravescanFinding/v1"]);
    expect(new Set(prints).size).toBe(2);
  });

  it("carries no secret value when given redacted input", () => {
    expect(JSON.stringify(sarif)).not.toContain("GRAVESCAN_CANARY");
    expect(JSON.stringify(sarif)).toContain("[REDACTED]");
  });

  it("reports parse diagnostics as tool notifications", () => {
    const log: Json = buildSarif(scanFiles([{ path: ".kiro/settings/mcp.json", content: "{ broken" }]));
    expect(log.runs[0].invocations[0].toolExecutionNotifications[0].message.text).toContain("MALFORMED_JSON");
  });
});
