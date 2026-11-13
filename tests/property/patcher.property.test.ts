import fc from "fast-check";
import { afterAll, describe, expect, it } from "vitest";
import { createWorkCopy, readWorkCopy, type FixtureId } from "@gravescan/fixtures";
import { applyPatch, generatePatch, verifyPatch } from "@gravescan/patcher";
import { scanFiles, type RuleId } from "@gravescan/scanner";
import { makeTempDir, removeDir } from "../../packages/fixtures/test/helpers.ts";

const PATCHABLE: readonly (readonly [FixtureId, RuleId])[] = [
  ["unsafe-mcp", "GRAVE-001"],
  ["unsafe-mcp", "GRAVE-002"],
  ["unsafe-mcp", "GRAVE-009"],
  ["unsafe-mcp", "GRAVE-010"],
  ["unbounded-hook", "GRAVE-003"],
  ["unbounded-hook", "GRAVE-004"],
  ["steering-injection", "GRAVE-005"],
  ["steering-injection", "GRAVE-006"],
];

const bases: string[] = [];
afterAll(() => bases.forEach(removeDir));

function patchedCopy(fixture: FixtureId, ruleId: RuleId) {
  const base = makeTempDir();
  bases.push(base);
  const copy = createWorkCopy(fixture, base);
  if (!copy.ok) throw new Error(copy.error.code);
  const files = readWorkCopy(copy.value, base);
  if (!files.ok) throw new Error(files.error.code);
  const finding = scanFiles(files.value).findings.find((item) => item.ruleId === ruleId);
  if (finding === undefined) throw new Error(`fixture ${fixture} has no ${ruleId}`);
  const patch = generatePatch(copy.value, finding, base);
  if (!patch.ok) throw new Error(patch.error.code);
  return { base, copy: copy.value, patch: patch.value };
}

function snapshot(copy: Parameters<typeof readWorkCopy>[0], base: string) {
  const files = readWorkCopy(copy, base);
  if (!files.ok) throw new Error(files.error.code);
  return files.value;
}

describe("patcher properties", () => {
  it("is idempotent: applying a patch any number of times equals applying it once", () => {
    fc.assert(
      fc.property(fc.constantFrom(...PATCHABLE), fc.integer({ min: 2, max: 5 }), ([fixture, ruleId], times) => {
        const { base, copy, patch } = patchedCopy(fixture, ruleId);
        expect(applyPatch(copy, patch, base).ok).toBe(true);
        const once = snapshot(copy, base);
        for (let i = 1; i < times; i += 1) {
          expect(applyPatch(copy, patch, base)).toEqual({ ok: true, value: { applied: false, patch } });
        }
        expect(snapshot(copy, base)).toEqual(once);
      }),
      { numRuns: 40 },
    );
  });

  it("never reports success for a patch that adds High or Critical findings", () => {
    fc.assert(
      fc.property(fc.constantFrom(...PATCHABLE), ([fixture, ruleId]) => {
        const { base, copy, patch } = patchedCopy(fixture, ruleId);
        expect(applyPatch(copy, patch, base).ok).toBe(true);
        const verification = verifyPatch(copy, patch, base);
        expect(verification.ok).toBe(true);
        if (!verification.ok) return;
        const success = verification.value.status === "Verified" || verification.value.status === "Simulation blocked";
        if (success) {
          expect(verification.value.highCriticalAfter).toBeLessThanOrEqual(verification.value.highCriticalBefore);
          expect(verification.value.targetFindingPresent).toBe(false);
        }
      }),
      { numRuns: 40 },
    );
  });
});
