import { z } from "zod";

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const RuleIdSchema = z.enum([
  "GRAVE-001",
  "GRAVE-002",
  "GRAVE-003",
  "GRAVE-004",
  "GRAVE-005",
  "GRAVE-006",
  "GRAVE-007",
  "GRAVE-008",
  "GRAVE-009",
  "GRAVE-010",
]);
export type RuleId = z.infer<typeof RuleIdSchema>;

export const FindingSchema = z.object({
  id: z.string().min(1),
  ruleId: RuleIdSchema,
  severity: SeveritySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  file: z.string().min(1),
  line: z.number().int().positive(),
  evidence: z.string().min(1),
  remediation: z.string().min(1),
  confidence: ConfidenceSchema,
  attackScenarioId: z.string().min(1).optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const DiagnosticCodeSchema = z.enum([
  "MALFORMED_JSON",
  "UNSUPPORTED_DOCUMENT",
]);

export const DiagnosticSchema = z.object({
  code: DiagnosticCodeSchema,
  file: z.string().min(1),
  line: z.number().int().positive(),
  message: z.string().min(1),
});
export type Diagnostic = z.infer<typeof DiagnosticSchema>;

export const ScanResultSchema = z.object({
  findings: z.array(FindingSchema),
  diagnostics: z.array(DiagnosticSchema),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;
