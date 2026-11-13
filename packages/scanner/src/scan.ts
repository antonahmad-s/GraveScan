import { loadFixture, type FixtureError, type FixtureFile, type Result } from "@gravescan/fixtures";
import { compareDiagnostic, compareText, parseDocuments } from "./documents.ts";
import { remediationContractFindings, RULES } from "./rules.ts";
import type { Finding, ScanResult } from "./schemas.ts";

function compareFinding(a: Finding, b: Finding): number {
  return (
    compareText(a.file, b.file) ||
    a.line - b.line ||
    compareText(a.ruleId, b.ruleId) ||
    compareText(a.id, b.id)
  );
}

export function scanFiles(files: readonly FixtureFile[]): ScanResult {
  const parsed = parseDocuments(files);
  const findings = RULES.flatMap((rule) => rule.evaluate(parsed.documents));
  const completed = [...findings, ...remediationContractFindings(findings)];
  const unique = new Map<string, Finding>();
  for (const finding of completed) unique.set(finding.id, finding);
  return {
    findings: [...unique.values()].sort(compareFinding),
    diagnostics: parsed.diagnostics.sort(compareDiagnostic),
  };
}

export function scanFixture(id: string): Result<ScanResult, FixtureError> {
  const fixture = loadFixture(id);
  return fixture.ok
    ? { ok: true, value: scanFiles(fixture.value) }
    : fixture;
}
