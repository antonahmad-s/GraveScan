export const PACKAGE = "@gravescan/scanner" as const;

export { parseDocuments } from "./documents.ts";
export type { ScanDocument } from "./documents.ts";
export { remediationContractFindings, RULES } from "./rules.ts";
export type { RuleDefinition } from "./rules.ts";
export { scanFiles, scanFixture } from "./scan.ts";
export {
  ConfidenceSchema,
  DiagnosticCodeSchema,
  DiagnosticSchema,
  FindingSchema,
  RuleIdSchema,
  ScanResultSchema,
  SeveritySchema,
} from "./schemas.ts";
export type {
  Confidence,
  Diagnostic,
  Finding,
  RuleId,
  ScanResult,
  Severity,
} from "./schemas.ts";
