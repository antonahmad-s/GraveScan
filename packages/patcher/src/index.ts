export const PACKAGE = "@gravescan/patcher" as const;

export { applyPatch } from "./apply.ts";
export { unifiedDiff } from "./diff.ts";
export { generatePatch } from "./generate.ts";
export { verifyPatch } from "./verify.ts";
export { PatchSchema, PatchVerificationStatusSchema } from "./schemas.ts";
export type {
  Patch,
  PatchApplyResult,
  PatchError,
  PatchVerification,
  PatchVerificationStatus,
} from "./schemas.ts";
