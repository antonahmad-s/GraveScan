export const PACKAGE = "@gravescan/simulator" as const;

export { replayScenario, SAFETY_NOTICE } from "./replay.ts";
export type { ReplayResponse } from "./replay.ts";
export { getScenario, SCENARIOS } from "./scenarios.ts";
export {
  AttackScenarioIdSchema,
  AttackScenarioSchema,
  AttackStepSchema,
  ReplayEvidenceSchema,
  ReplayResultSchema,
  ReplayStepSchema,
} from "./schemas.ts";
export type {
  AttackScenario,
  AttackScenarioId,
  AttackStep,
  ReplayEvidence,
  ReplayResult,
  ReplayStep,
  SimulatorError,
} from "./schemas.ts";
