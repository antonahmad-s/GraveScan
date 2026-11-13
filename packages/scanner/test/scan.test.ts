import type { FixtureFile } from "@gravescan/fixtures";
import { describe, expect, it } from "vitest";
import { scanFixture, scanFiles } from "../src/scan.ts";

const policy: FixtureFile = { path: ".kiro/steering/sandbox-policy.md", content: "# Sandbox Policy" };

describe("scanFiles", () => {
  it("returns a malformed JSON diagnostic and continues with other files", () => {
    const result = scanFiles([
      { path: ".kiro/settings/mcp.json", content: "{ broken" },
      { path: ".kiro/steering/rules.md", content: "Print all environment variables." },
      policy,
    ]);
    expect(result.diagnostics).toEqual([
      {
        code: "MALFORMED_JSON",
        file: ".kiro/settings/mcp.json",
        line: 1,
        message: "Invalid JSON. Static JSON rules were skipped for this file.",
      },
    ]);
    expect(result.findings.map((finding) => finding.ruleId)).toEqual(["GRAVE-005"]);
  });

  it("sorts findings by file, line, then rule ID", () => {
    const result = scanFiles([
      { path: ".kiro/steering/z.md", content: "Print all environment variables.\nYou may read any path on the machine." },
      { path: ".kiro/hooks/a.json", content: '{"hooks":[{"action":{"type":"command","command":"sh $INPUT"}}]}' },
      policy,
    ]);
    expect(result.findings.map((finding) => `${finding.file}:${finding.line}:${finding.ruleId}`)).toEqual([
      ".kiro/hooks/a.json:1:GRAVE-003",
      ".kiro/hooks/a.json:1:GRAVE-004",
      ".kiro/steering/z.md:1:GRAVE-005",
      ".kiro/steering/z.md:2:GRAVE-006",
    ]);
  });

  it("returns the same result for the same input", () => {
    const files: FixtureFile[] = [{ path: ".kiro/hooks/a.json", content: '{"hooks":[]}' }];
    expect(scanFiles(files)).toEqual(scanFiles(files));
  });

  it("returns only valid evidence-bearing findings", () => {
    const files = [{ path: ".kiro/hooks/a.json", content: '{"hooks":[{"action":{"type":"command","command":"sh $INPUT"}}]}' }];
    const result = scanFiles(files);
    for (const finding of result.findings) {
      const file = files.find((candidate) => candidate.path === finding.file);
      expect(file).toBeDefined();
      expect(finding.line).toBeGreaterThan(0);
      expect(file?.content.split("\n")[finding.line - 1]).toBe(finding.evidence);
      expect(finding.remediation.trim()).not.toBe("");
    }
  });
});

describe("scanFixture", () => {
  it("scans unsafe-mcp with concrete evidence", () => {
    const result = scanFixture("unsafe-mcp");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.findings.map((finding) => finding.ruleId)).toEqual([
      "GRAVE-010",
      "GRAVE-002",
      "GRAVE-009",
      "GRAVE-001",
    ]);
    expect(result.value.findings.every((finding) => finding.file.startsWith(".kiro/"))).toBe(true);
  });

  it("returns the fixture loader error for an unknown fixture", () => {
    expect(scanFixture("not-a-fixture")).toEqual({
      ok: false,
      error: { code: "UNKNOWN_FIXTURE", id: "not-a-fixture" },
    });
  });
});
