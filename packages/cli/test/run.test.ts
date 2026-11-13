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

  it("does not run commands that scan, because scanning is not built yet", () => {
    expect(capture(["scan", "--target", ".kiro"]).code).toBe(1);
  });
});
