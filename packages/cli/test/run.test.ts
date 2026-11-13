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
});
