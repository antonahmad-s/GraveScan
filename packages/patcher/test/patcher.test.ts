import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWorkCopy, FIXTURES_DATA_ROOT, readWorkCopy, type WorkCopy } from "@gravescan/fixtures";
import { scanFiles } from "@gravescan/scanner";
import { applyPatch, generatePatch, unifiedDiff, verifyPatch } from "../src/index.ts";
import { hashTree, makeTempDir, removeDir } from "../../fixtures/test/helpers.ts";

let base: string;
beforeEach(() => { base = makeTempDir(); });
afterEach(() => removeDir(base));

function copy(id: string): WorkCopy {
  const result = createWorkCopy(id, base);
  if (!result.ok) throw new Error(`Could not create ${id}`);
  return result.value;
}

function finding(workCopy: WorkCopy, ruleId: string) {
  const result = scanFiles(readFiles(workCopy));
  const value = result.findings.find((item) => item.ruleId === ruleId);
  if (value === undefined) throw new Error(`Could not find ${ruleId}`);
  return value;
}

function readFiles(workCopy: WorkCopy) {
  const result = readWorkCopy(workCopy, base);
  if (!result.ok) throw new Error("Could not read work copy");
  return result.value;
}

describe("unifiedDiff", () => {
  it("renders file headers and changed lines", () => {
    expect(unifiedDiff("a.txt", "one\ntwo\n", "one\nthree\n")).toContain("--- a/a.txt\n+++ b/a.txt");
    expect(unifiedDiff("a.txt", "one\ntwo\n", "one\nthree\n")).toContain("-two\n+three");
  });
});

function changedLines(diff: string): string[] {
  return diff.split("\n").filter((line) => /^[-+](?![-+]{2} )/.test(line));
}

describe("minimal diffs", () => {
  it.each([
    ["unsafe-mcp", "GRAVE-001", ['-      "autoApprove": ["run_command", "read_file", "write_file"],', '+      "autoApprove": ["read_file", "write_file"],']],
    ["unsafe-mcp", "GRAVE-009", ['-        "API_TOKEN": "GRAVESCAN_CANARY_DO_NOT_USE_123"', '+        "API_TOKEN": "${API_TOKEN}"']],
    ["unbounded-hook", "GRAVE-003", ['-      "action": { "type": "command", "command": "sh $SAVED_FILE_PATH" }', '+      "action": { "type": "command", "command": "pnpm test" }']],
  ] as const)("%s %s changes only the risky line", (fixture, ruleId, expected) => {
    const workCopy = copy(fixture);
    const patch = generatePatch(workCopy, finding(workCopy, ruleId), base);
    if (!patch.ok) throw new Error("patch failed");
    expect(changedLines(patch.value.diff)).toEqual(expected);
  });

  it("GRAVE-002 adds one tools line and leaves the rest of the server untouched", () => {
    const workCopy = copy("unsafe-mcp");
    const patch = generatePatch(workCopy, finding(workCopy, "GRAVE-002"), base);
    if (!patch.ok) throw new Error("patch failed");
    expect(changedLines(patch.value.diff)).toEqual(['-      "disabled": false', '+      "disabled": false,', '+      "tools": ["read_file"]']);
  });
});

describe("allowlisted patches", () => {
  const cases = [
    ["unsafe-mcp", "GRAVE-001", "Simulation blocked"],
    ["unsafe-mcp", "GRAVE-002", "Verified"],
    ["unsafe-mcp", "GRAVE-009", "Verified"],
    ["unsafe-mcp", "GRAVE-010", "Verified"],
    ["unbounded-hook", "GRAVE-003", "Simulation blocked"],
    ["unbounded-hook", "GRAVE-004", "Simulation blocked"],
    ["steering-injection", "GRAVE-005", "Simulation blocked"],
    ["steering-injection", "GRAVE-006", "Simulation blocked"],
  ] as const;

  it.each(cases)("generates, applies, and verifies %s %s", (fixture, ruleId, expectedStatus) => {
    const workCopy = copy(fixture);
    const originalHash = hashTree(FIXTURES_DATA_ROOT);
    const patch = generatePatch(workCopy, finding(workCopy, ruleId), base);
    expect(patch.ok).toBe(true);
    if (!patch.ok) return;
    expect(patch.value.diff).toContain(`--- a/${patch.value.file}`);
    expect(patch.value.before).not.toBe(patch.value.after);

    const applied = applyPatch(workCopy, patch.value, base);
    expect(applied).toEqual({ ok: true, value: { applied: true, patch: patch.value } });
    expect(hashTree(FIXTURES_DATA_ROOT)).toBe(originalHash);

    const verification = verifyPatch(workCopy, patch.value, base);
    expect(verification.ok).toBe(true);
    if (!verification.ok) return;
    expect(verification.value.status).toBe(expectedStatus);
    expect(verification.value.targetFindingPresent).toBe(false);
    if (expectedStatus === "Simulation blocked") expect(verification.value.replay?.result).toBe("blocked");
  });

  it("applies the same patch twice without changing the result", () => {
    const workCopy = copy("unsafe-mcp");
    const patch = generatePatch(workCopy, finding(workCopy, "GRAVE-001"), base);
    if (!patch.ok) throw new Error("patch failed");
    expect(applyPatch(workCopy, patch.value, base).ok).toBe(true);
    const once = readFileSync(path.join(workCopy.root, patch.value.file), "utf8");
    expect(applyPatch(workCopy, patch.value, base)).toEqual({ ok: true, value: { applied: false, patch: patch.value } });
    expect(readFileSync(path.join(workCopy.root, patch.value.file), "utf8")).toBe(once);
  });

  it("rejects a patch with a changed before state", () => {
    const workCopy = copy("unsafe-mcp");
    const patch = generatePatch(workCopy, finding(workCopy, "GRAVE-001"), base);
    if (!patch.ok) throw new Error("patch failed");
    const changed = { ...patch.value, before: "other" };
    expect(!applyPatch(workCopy, changed, base).ok).toBe(true);
  });

  it("still detects the target finding when a patch only moves it to another line", () => {
    const workCopy = copy("unsafe-mcp");
    const target = finding(workCopy, "GRAVE-001");
    const patch = generatePatch(workCopy, target, base);
    if (!patch.ok) throw new Error("patch failed");
    const movedOnly = { ...patch.value, after: `\n\n${patch.value.before}` };
    expect(applyPatch(workCopy, movedOnly, base).ok).toBe(true);
    const verification = verifyPatch(workCopy, movedOnly, base);
    expect(verification.ok && verification.value.targetFindingPresent).toBe(true);
    expect(verification.ok && verification.value.status).toBe("Needs review");
  });

  it("rejects a traversal patch path", () => {
    const workCopy = copy("unsafe-mcp");
    const patch = generatePatch(workCopy, finding(workCopy, "GRAVE-001"), base);
    if (!patch.ok) throw new Error("patch failed");
    expect(applyPatch(workCopy, { ...patch.value, file: "../outside" }, base)).toEqual({
      ok: false,
      error: { code: "PATCH_PATH_REJECTED", file: "../outside" },
    });
  });
});
