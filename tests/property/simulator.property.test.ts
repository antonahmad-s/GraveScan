import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { ScanResult } from "../../packages/scanner/src/index.ts";
import { replayScenario, SCENARIOS } from "../../packages/simulator/src/index.ts";

const ruleIds = SCENARIOS.map((scenario) => scenario.targetRuleId);
const input = fc.array(
  fc.record({
    ruleId: fc.constantFrom(...ruleIds),
    file: fc.stringMatching(/^\.kiro\/[a-z]{1,8}\.md$/),
    line: fc.integer({ min: 1, max: 100 }),
    evidence: fc.string({ minLength: 1, maxLength: 50 }),
  }),
  { maxLength: 20 },
);

describe("simulator properties", () => {
  it("is deterministic and always keeps its step limit", () => {
    fc.assert(fc.property(input, (evidence) => {
      const scan: ScanResult = {
        findings: evidence.map((item, index) => ({
          id: `${item.ruleId}:${index}`,
          ruleId: item.ruleId,
          severity: "high",
          title: "test",
          description: "test",
          file: item.file,
          line: item.line,
          evidence: item.evidence,
          remediation: "test",
          confidence: "high",
        })),
        diagnostics: [],
      };
      for (const scenario of SCENARIOS) {
        const first = replayScenario(scan, scenario.id);
        expect(first).toEqual(replayScenario(scan, scenario.id));
        if (first.ok) expect(first.value.steps.length).toBeLessThanOrEqual(5);
      }
    }));
  });
});
