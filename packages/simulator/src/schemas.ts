import { z } from "zod";
import { FindingSchema, RuleIdSchema } from "@gravescan/scanner";

export const AttackScenarioIdSchema = z.enum([
  "MCP-TOOL-ESCALATION",
  "HOOK-INPUT-EXECUTION",
  "STEERING-SECRET-EXPOSURE",
  "STEERING-FILESYSTEM-ESCAPE",
]);
export type AttackScenarioId = z.infer<typeof AttackScenarioIdSchema>;

export const AttackStepSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  exposedDetail: z.string().min(1),
  blockedDetail: z.string().min(1),
});
export type AttackStep = z.infer<typeof AttackStepSchema>;

export const AttackScenarioSchema = z.object({
  id: AttackScenarioIdSchema,
  name: z.string().min(1),
  targetRuleId: RuleIdSchema,
  preconditions: z.array(z.string().min(1)).min(1),
  steps: z.array(AttackStepSchema).min(1).max(5),
  expectedResult: z.literal("exposed"),
  capabilityRequest: z.string().min(1),
});
export type AttackScenario = z.infer<typeof AttackScenarioSchema>;

export const ReplayEvidenceSchema = FindingSchema.pick({
  ruleId: true,
  file: true,
  line: true,
  evidence: true,
});
export type ReplayEvidence = z.infer<typeof ReplayEvidenceSchema>;

export const ReplayStepSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
});
export type ReplayStep = z.infer<typeof ReplayStepSchema>;

export const ReplayResultSchema = z.object({
  scenarioId: AttackScenarioIdSchema,
  scenarioName: z.string().min(1),
  capabilityRequest: z.string().min(1),
  policyDecision: z.enum(["allowed", "blocked"]),
  result: z.enum(["exposed", "blocked"]),
  expectedResult: z.literal("exposed"),
  steps: z.array(ReplayStepSchema).min(1).max(5),
  evidence: z.array(ReplayEvidenceSchema),
  safetyNotice: z.literal("Safe simulation. No arbitrary code or network request was executed."),
});
export type ReplayResult = z.infer<typeof ReplayResultSchema>;

export type SimulatorError = { readonly code: "UNKNOWN_SCENARIO"; readonly id: string };
