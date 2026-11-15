// Entry point without Node built-ins, for code bundled into the browser.
export { unifiedDiff } from "./diff.ts";
export { generatePatchForFiles } from "./generate.ts";
export { applyPatchToFiles } from "./memory.ts";
export type { MemoryApplyResult } from "./memory.ts";
export { verifyPatchFiles } from "./verify.ts";
export { PatchSchema, PatchVerificationStatusSchema } from "./schemas.ts";
export type {
  Patch,
  PatchApplyResult,
  PatchError,
  PatchVerification,
  PatchVerificationStatus,
} from "./schemas.ts";
