import { readWorkCopy, type Result, type WorkCopy } from "@gravescan/fixtures";
import { scanFiles } from "@gravescan/scanner";
import { replayScenario } from "@gravescan/simulator";
import type { Patch, PatchError, PatchVerification } from "./schemas.ts";

export function verifyPatch(
  copy: WorkCopy,
  patch: Patch,
  base?: string,
): Result<PatchVerification, PatchError> {
  const loaded = readWorkCopy(copy, base);
  if (!loaded.ok) return { ok: false, error: { code: "WORK_COPY_INVALID", detail: loaded.error.code } };
  const scan = scanFiles(loaded.value);
  const highCriticalAfter = scan.findings.filter((finding) => finding.severity === "high" || finding.severity === "critical").length;
  const targetFindingPresent = scan.findings.some((finding) => finding.id === patch.findingId);
  if (highCriticalAfter > patch.baselineHighCritical) {
    return { ok: true, value: { status: "Regression detected", targetFindingPresent, highCriticalBefore: patch.baselineHighCritical, highCriticalAfter } };
  }
  if (patch.attackScenarioId === undefined) {
    return { ok: true, value: { status: targetFindingPresent ? "Needs review" : "Verified", targetFindingPresent, highCriticalBefore: patch.baselineHighCritical, highCriticalAfter } };
  }
  const replay = replayScenario(scan, patch.attackScenarioId);
  if (!replay.ok) return { ok: false, error: { code: "WORK_COPY_INVALID", detail: replay.error.code } };
  return {
    ok: true,
    value: {
      status: !targetFindingPresent && replay.value.result === "blocked" ? "Simulation blocked" : "Needs review",
      targetFindingPresent,
      highCriticalBefore: patch.baselineHighCritical,
      highCriticalAfter,
      replay: replay.value,
    },
  };
}
