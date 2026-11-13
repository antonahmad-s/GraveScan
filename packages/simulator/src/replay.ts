import type { ScanResult } from "@gravescan/scanner";
import { getScenario } from "./scenarios.ts";
import type { ReplayEvidence, ReplayResult, SimulatorError } from "./schemas.ts";

export type ReplayResponse =
  | { readonly ok: true; readonly value: ReplayResult }
  | { readonly ok: false; readonly error: SimulatorError };

export const SAFETY_NOTICE = "Safe simulation. No arbitrary code or network request was executed." as const;

function compareEvidence(a: ReplayEvidence, b: ReplayEvidence): number {
  return a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line;
}

export function replayScenario(scanResult: ScanResult, id: string): ReplayResponse {
  const scenario = getScenario(id);
  if (scenario === undefined) return { ok: false, error: { code: "UNKNOWN_SCENARIO", id } };

  const evidence = scanResult.findings
    .filter((finding) => finding.ruleId === scenario.targetRuleId)
    .map(({ ruleId, file, line, evidence: text }) => ({ ruleId, file, line, evidence: text }))
    .sort(compareEvidence);
  const exposed = evidence.length > 0;

  return {
    ok: true,
    value: {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      capabilityRequest: scenario.capabilityRequest,
      policyDecision: exposed ? "allowed" : "blocked",
      result: exposed ? "exposed" : "blocked",
      expectedResult: scenario.expectedResult,
      steps: scenario.steps.map((step) => ({
        id: step.id,
        label: step.label,
        detail: exposed ? step.exposedDetail : step.blockedDetail,
      })),
      evidence,
      safetyNotice: SAFETY_NOTICE,
    },
  };
}
