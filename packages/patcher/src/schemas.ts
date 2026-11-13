import { z } from "zod";
import { RuleIdSchema } from "@gravescan/scanner";
import { ReplayResultSchema } from "@gravescan/simulator";

export const PatchSchema = z.object({
  id: z.string().min(1),
  findingId: z.string().min(1),
  ruleId: RuleIdSchema,
  file: z.string().min(1),
  before: z.string(),
  after: z.string(),
  diff: z.string().min(1),
  reason: z.string().min(1),
  riskNote: z.string().min(1),
  baselineHighCritical: z.number().int().nonnegative(),
  attackScenarioId: z.string().min(1).optional(),
});
export type Patch = z.infer<typeof PatchSchema>;

export type PatchError =
  | { readonly code: "PATCH_UNSUPPORTED"; readonly ruleId: string }
  | { readonly code: "PATCH_FILE_MISSING"; readonly file: string }
  | { readonly code: "PATCH_CONFLICT"; readonly file: string }
  | { readonly code: "PATCH_PATH_REJECTED"; readonly file: string }
  | { readonly code: "WORK_COPY_INVALID"; readonly detail: string };

export type PatchApplyResult = {
  readonly applied: boolean;
  readonly patch: Patch;
};

export const PatchVerificationStatusSchema = z.enum([
  "Verified",
  "Needs review",
  "Regression detected",
  "Simulation blocked",
]);
export type PatchVerificationStatus = z.infer<typeof PatchVerificationStatusSchema>;

export type PatchVerification = {
  readonly status: PatchVerificationStatus;
  readonly targetFindingPresent: boolean;
  readonly highCriticalBefore: number;
  readonly highCriticalAfter: number;
  readonly replay?: z.infer<typeof ReplayResultSchema>;
};
