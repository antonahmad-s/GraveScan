import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { makeTempDir, removeDir } from "../../fixtures/test/helpers.ts";
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

  it("scans the .kiro folder of a chosen directory and redacts secrets in the output", () => {
    const root = makeTempDir();
    try {
      mkdirSync(path.join(root, ".kiro/settings"), { recursive: true });
      writeFileSync(path.join(root, ".kiro/settings/mcp.json"), '{\n  "mcpServers": {\n    "x": { "command": "node", "tools": ["a"], "env": { "API_KEY": "real-looking-value-123" } }\n  }\n}\n');
      const result = capture(["scan", "--path", root, "--format", "json", "--fail-on", "high"]);
      expect(result.code).toBe(1);
      expect(result.out[0]).toContain("GRAVE-009");
      expect(result.out[0]).toContain("[REDACTED]");
      expect(result.out[0]).not.toContain("real-looking-value-123");
    } finally {
      removeDir(root);
    }
  });

  it("explains a directory without a .kiro folder", () => {
    const root = makeTempDir();
    try {
      const result = capture(["scan", "--path", root, "--format", "json"]);
      expect(result.code).toBe(1);
      expect(result.err[0]).toContain("Expected a readable .kiro/ folder");
    } finally {
      removeDir(root);
    }
  });

  it("requires exactly one of --fixture and --path", () => {
    expect(capture(["scan", "--format", "json"]).code).toBe(1);
    expect(capture(["scan", "--fixture", "unsafe-mcp", "--path", ".", "--format", "json"]).err[0]).toBe("Use exactly one of --fixture <id> or --path <dir>.");
  });

  it("writes redacted SARIF for a project path and still honors --fail-on", () => {
    const root = makeTempDir();
    try {
      mkdirSync(path.join(root, ".kiro/settings"), { recursive: true });
      writeFileSync(path.join(root, ".kiro/settings/mcp.json"), '{\n  "mcpServers": {\n    "x": { "command": "node", "tools": ["a"], "env": { "API_KEY": "real-looking-value-123" } }\n  }\n}\n');
      const result = capture(["scan", "--path", root, "--format", "sarif", "--fail-on", "high"]);
      expect(result.code).toBe(1);
      const log = JSON.parse(result.out[0] ?? "{}");
      expect(log.version).toBe("2.1.0");
      expect(log.runs[0].results.map((item: { ruleId: string }) => item.ruleId)).toContain("GRAVE-009");
      expect(result.out[0]).not.toContain("real-looking-value-123");
    } finally {
      removeDir(root);
    }
  });

  it("writes an empty SARIF run for this repository's self-scan", () => {
    const result = capture(["self-scan", "--format", "sarif", "--fail-on", "medium"]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out[0] ?? "{}").runs[0].results).toEqual([]);
  });

  it("rejects unknown formats", () => {
    expect(capture(["scan", "--fixture", "unsafe-mcp", "--format", "xml"]).err[0]).toBe("--format must be json or sarif.");
  });

  it("rejects prototype keys as option names and levels", () => {
    expect(capture(["scan", "--fixture", "unsafe-mcp", "--format", "json", "--fail-on", "constructor"]).code).toBe(1);
    expect(capture(["scan", "constructor", "x", "--format", "json"]).code).toBe(1);
  });

  it("does not let self-scan accept a target path", () => {
    expect(capture(["self-scan", "--format", "json", "--fixture", "unsafe-mcp"]).code).toBe(1);
  });
});
