import { describe, expect, it } from "vitest";
import { USAGE, run } from "../src/run.ts";

function capture(argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = run(argv, { out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out, err };
}

describe("run", () => {
  it("prints fixture IDs for list", () => {
    expect(capture(["list"])).toEqual({
      code: 0,
      out: ["steering-injection", "unbounded-hook", "unsafe-mcp"],
      err: [],
    });
  });

  it("prints usage on stdout for help", () => {
    expect(capture(["help"])).toEqual({ code: 0, out: [USAGE], err: [] });
  });

  it("prints usage on stderr and exits non-zero for an unknown command", () => {
    const result = capture(["frobnicate"]);
    expect(result.code).toBe(1);
    expect(result.out).toEqual([]);
    expect(result.err).toEqual(['Unknown command: "frobnicate"', USAGE]);
  });

  it("exits non-zero when no command is given", () => {
    const result = capture([]);
    expect(result.code).toBe(1);
    expect(result.err[0]).toBe("Missing command.");
  });

  it("prints a deterministic JSON scan report for a controlled fixture", () => {
    const result = capture(["scan", "--fixture", "unsafe-mcp", "--format", "json"]);
    expect(result.code).toBe(0);
    expect(result.err).toEqual([]);
    expect(JSON.parse(result.out[0] ?? "{}").findings.map((finding: { ruleId: string }) => finding.ruleId)).toEqual([
      "GRAVE-010", "GRAVE-002", "GRAVE-009", "GRAVE-001",
    ]);
  });

  it("rejects arbitrary targets, unknown options, invalid formats, and unknown fixtures", () => {
    expect(capture(["scan", "--target", ".kiro"]).code).toBe(1);
    expect(capture(["scan", "--fixture", "unsafe-mcp", "--format", "text"]).code).toBe(1);
    expect(capture(["scan", "--fixture", "not-a-fixture", "--format", "json"]).code).toBe(1);
  });

  it("fails a fixture scan with --fail-on when a finding meets the threshold", () => {
    const result = capture(["scan", "--fixture", "unsafe-mcp", "--format", "json", "--fail-on", "high"]);
    expect(result.code).toBe(1);
    expect(result.err[0]).toMatch(/^3 finding\(s\) at or above high: /);
  });

  it("rejects an unknown --fail-on level", () => {
    expect(capture(["scan", "--fixture", "unsafe-mcp", "--format", "json", "--fail-on", "severe"]).code).toBe(1);
  });

  it("self-scans this project's .kiro with no medium or higher findings", () => {
    const result = capture(["self-scan", "--format", "json", "--fail-on", "medium"]);
    expect(result.err).toEqual([]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out[0] ?? "{}")).toEqual({ findings: [], diagnostics: [] });
  });

  it("does not let self-scan accept a target path", () => {
    expect(capture(["self-scan", "--format", "json", "--fixture", "unsafe-mcp"]).code).toBe(1);
  });
});
