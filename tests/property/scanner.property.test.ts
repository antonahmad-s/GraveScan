import type { FixtureFile } from "@gravescan/fixtures";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { RULES } from "../../packages/scanner/src/rules.ts";
import { scanFiles } from "../../packages/scanner/src/scan.ts";

const knownRules = new Set(RULES.map((rule) => rule.id));
const paths = fc.constantFrom(
  ".kiro/settings/mcp.json",
  ".kiro/hooks/a.json",
  ".kiro/agents/a.json",
  ".kiro/steering/a.md",
  "prompt.txt",
);
const files = fc.array(fc.record({ path: paths, content: fc.string() }), { maxLength: 12 });

describe("scanner properties", () => {
  it("never throws on arbitrary JSON-like, Markdown, or prompt files", () => {
    fc.assert(fc.property(files, (input) => {
      expect(() => scanFiles(input as FixtureFile[])).not.toThrow();
    }));
  });

  it("returns a deterministic result", () => {
    fc.assert(fc.property(files, (input) => {
      const typed = input as FixtureFile[];
      expect(scanFiles(typed)).toEqual(scanFiles(typed));
    }));
  });

  it("returns findings with valid evidence and known rule IDs", () => {
    fc.assert(fc.property(files, (input) => {
      const typed = input as FixtureFile[];
      const result = scanFiles(typed);
      for (const finding of result.findings) {
        const file = typed.find((candidate) => candidate.path === finding.file);
        expect(file).toBeDefined();
        expect(finding.line).toBeGreaterThan(0);
        expect(knownRules.has(finding.ruleId)).toBe(true);
        expect(finding.remediation.trim()).not.toBe("");
        expect(file?.content.split("\n")[finding.line - 1]).toBe(finding.evidence);
      }
    }));
  });
});
