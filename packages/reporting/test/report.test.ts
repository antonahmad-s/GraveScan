import { describe, expect, it } from "vitest";
import type { Finding, ScanResult } from "@gravescan/scanner";
import { buildMarkdownReport, compareScans, SAFETY_NOTICE } from "../src/index.ts";

function finding(ruleId: Finding["ruleId"], line: number, evidence = "line"): Finding {
  return {
    id: `${ruleId}:.kiro/a.json:${line}`,
    ruleId,
    severity: "high",
    title: `Title ${ruleId}`,
    description: "d",
    file: ".kiro/a.json",
    line,
    evidence,
    remediation: "Fix it.",
    confidence: "high",
  };
}

const scan = (...findings: Finding[]): ScanResult => ({ findings, diagnostics: [] });

describe("compareScans", () => {
  it("splits findings into resolved, remaining, and introduced by stable ID", () => {
    const a = finding("GRAVE-001", 1);
    const b = finding("GRAVE-002", 2);
    const c = finding("GRAVE-003", 3);
    expect(compareScans(scan(a, b), scan(b, c))).toEqual({ resolved: [a], remaining: [b], introduced: [c] });
  });
});

describe("compareScans with moved findings", () => {
  it("treats a finding that only moved to another line as remaining, not resolved", () => {
    const before = finding("GRAVE-009", 7);
    const moved = { ...before, id: "GRAVE-009:.kiro/a.json:6", line: 6 };
    expect(compareScans(scan(before), scan(moved))).toEqual({ resolved: [], remaining: [moved], introduced: [] });
  });
});

describe("buildMarkdownReport", () => {
  it("includes the safety notice, before/after sections, and patch status", () => {
    const report = buildMarkdownReport({
      fixture: "unsafe-mcp",
      baseline: scan(finding("GRAVE-001", 9), finding("GRAVE-002", 3)),
      current: scan(finding("GRAVE-002", 3)),
      patches: [{ patchId: "P1", findingId: "GRAVE-001:.kiro/a.json:9", ruleId: "GRAVE-001", file: ".kiro/a.json", reason: "Removes approval.", status: "Simulation blocked", replayResult: "blocked" }],
    });
    expect(report).toContain(SAFETY_NOTICE);
    expect(report).toContain("- Findings before patches: 2");
    expect(report).toContain("- Findings after patches: 1");
    expect(report).toContain("- Resolved: 1");
    expect(report).toContain("- Verification: Simulation blocked");
    expect(report).toContain("- Replay after patch: blocked");
    expect(report.indexOf("## Before")).toBeLessThan(report.indexOf("## After"));
  });

  it("keeps evidence containing backticks inside its code fence", () => {
    const report = buildMarkdownReport({ fixture: "x", baseline: scan(), current: scan(finding("GRAVE-001", 1, "a ``` b")), patches: [] });
    expect(report).toContain("````text\na ``` b\n````");
  });

  it("escapes table separators in titles and paths", () => {
    const tricky = { ...finding("GRAVE-001", 1), title: "a | b" };
    expect(buildMarkdownReport({ fixture: "x", baseline: scan(tricky), current: scan(), patches: [] })).toContain("a \\| b");
  });

  it("never includes process environment values", () => {
    process.env.GRAVESCAN_REPORT_SENTINEL = "SENTINEL_VALUE_DO_NOT_EXPORT";
    try {
      const report = buildMarkdownReport({ fixture: "x", baseline: scan(finding("GRAVE-001", 1)), current: scan(), patches: [] });
      expect(report).not.toContain("SENTINEL_VALUE_DO_NOT_EXPORT");
    } finally {
      delete process.env.GRAVESCAN_REPORT_SENTINEL;
    }
  });
});
