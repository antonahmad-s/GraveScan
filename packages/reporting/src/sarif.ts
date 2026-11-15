import type { Finding, ScanResult, Severity } from "@gravescan/scanner/browser";

// SARIF 2.1.0 output for GitHub code scanning and other SARIF consumers. Pure and browser-safe.
// Callers must redact the result before writing it anywhere (the CLI applies redactDeep).

export const SARIF_SCHEMA = "https://json.schemastore.org/sarif-2.1.0.json";
export const TOOL_URI = "https://github.com/antonahmad-s/GraveScan";

type SarifLevel = "error" | "warning" | "note";

const LEVEL: Record<Severity, SarifLevel> = { critical: "error", high: "error", medium: "warning", low: "note" };
// GitHub buckets security-severity as critical >= 9.0, high >= 7.0, medium >= 4.0, low > 0.
const SECURITY_SEVERITY: Record<Severity, string> = { critical: "9.5", high: "8.0", medium: "5.0", low: "2.0" };

// FNV-1a, 32-bit. Only needs to be stable across runs, not cryptographic.
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function ruleDescriptor(finding: Finding) {
  return {
    id: finding.ruleId,
    name: finding.title.replace(/[^A-Za-z0-9]+(.)?/g, (_, next: string | undefined) => (next ?? "").toUpperCase()).replace(/^./, (first) => first.toUpperCase()),
    shortDescription: { text: finding.title },
    // Rule text must be generic; per-finding detail (server names, commands) belongs in results.
    fullDescription: { text: `${finding.title}. ${finding.remediation}` },
    help: { text: finding.remediation, markdown: `**Remediation:** ${finding.remediation}` },
    helpUri: `${TOOL_URI}#what-it-does`,
    defaultConfiguration: { level: LEVEL[finding.severity] },
    properties: {
      tags: ["security", "kiro", ...(finding.attackScenarioId === undefined ? [] : ["replayable"])],
      precision: finding.confidence,
      "security-severity": SECURITY_SEVERITY[finding.severity],
    },
  };
}

export function buildSarif(result: ScanResult): Record<string, unknown> {
  const rules = new Map<string, ReturnType<typeof ruleDescriptor>>();
  for (const finding of result.findings) if (!rules.has(finding.ruleId)) rules.set(finding.ruleId, ruleDescriptor(finding));
  const ruleIds = [...rules.keys()].sort();
  const seen = new Map<string, number>();

  const results = result.findings.map((finding) => {
    // Matches the before/after report's identity: rule, file, and evidence, not the line number,
    // so an alert survives a reformat that moves the line. Repeats get an ordinal suffix.
    const identity = `${finding.ruleId}\u0000${finding.file}\u0000${finding.evidence.trim()}`;
    const ordinal = seen.get(identity) ?? 0;
    seen.set(identity, ordinal + 1);
    return {
      ruleId: finding.ruleId,
      ruleIndex: ruleIds.indexOf(finding.ruleId),
      level: LEVEL[finding.severity],
      message: { text: `${finding.description} ${finding.remediation}` },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: finding.file, uriBaseId: "%SRCROOT%" },
            region: { startLine: finding.line, snippet: { text: finding.evidence } },
          },
        },
      ],
      partialFingerprints: { "gravescanFinding/v1": `${fnv1a(identity)}:${ordinal}` },
      properties: {
        severity: finding.severity,
        ...(finding.attackScenarioId === undefined ? {} : { attackScenarioId: finding.attackScenarioId }),
      },
    };
  });

  return {
    $schema: SARIF_SCHEMA,
    version: "2.1.0",
    runs: [
      {
        tool: { driver: { name: "GraveScan", informationUri: TOOL_URI, rules: ruleIds.map((id) => rules.get(id)) } },
        originalUriBaseIds: { "%SRCROOT%": { description: { text: "The scanned project root; findings are under .kiro/." } } },
        invocations: [
          {
            executionSuccessful: true,
            toolExecutionNotifications: result.diagnostics.map((diagnostic) => ({
              level: "warning",
              message: { text: `${diagnostic.code}: ${diagnostic.message}` },
              locations: [{ physicalLocation: { artifactLocation: { uri: diagnostic.file, uriBaseId: "%SRCROOT%" }, region: { startLine: diagnostic.line } } }],
            })),
          },
        ],
        results,
      },
    ],
  };
}
