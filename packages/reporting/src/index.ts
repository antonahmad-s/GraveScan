import type { Finding, ScanResult } from "@gravescan/scanner";

export const PACKAGE = "@gravescan/reporting" as const;

export const SAFETY_NOTICE = "Safe simulation. No arbitrary code or network request was executed.";

export type ScanComparison = {
  readonly resolved: readonly Finding[];
  readonly remaining: readonly Finding[];
  readonly introduced: readonly Finding[];
};

export type AppliedPatchRecord = {
  readonly patchId: string;
  readonly findingId: string;
  readonly ruleId: string;
  readonly file: string;
  readonly reason: string;
  readonly status: string;
  readonly replayResult?: string;
};

export type ReportInput = {
  readonly fixture: string;
  readonly baseline: ScanResult;
  readonly current: ScanResult;
  readonly patches: readonly AppliedPatchRecord[];
};

// Line numbers shift when a patch reformats a file, so findings are matched by rule, file, and evidence text.
function identity(finding: Finding): string {
  return `${finding.ruleId}\u0000${finding.file}\u0000${finding.evidence.trim()}`;
}

function countBy(findings: readonly Finding[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const finding of findings) counts.set(identity(finding), (counts.get(identity(finding)) ?? 0) + 1);
  return counts;
}

function partition(findings: readonly Finding[], available: Map<string, number>): [Finding[], Finding[]] {
  const matched: Finding[] = [];
  const unmatched: Finding[] = [];
  for (const finding of findings) {
    const key = identity(finding);
    const left = available.get(key) ?? 0;
    if (left > 0) {
      available.set(key, left - 1);
      matched.push(finding);
    } else {
      unmatched.push(finding);
    }
  }
  return [matched, unmatched];
}

export function compareScans(baseline: ScanResult, current: ScanResult): ScanComparison {
  const [remaining, introduced] = partition(current.findings, countBy(baseline.findings));
  const [, resolved] = partition(baseline.findings, countBy(current.findings));
  return { resolved, remaining, introduced };
}

function inline(value: string): string {
  return value.replace(/[\r\n]+/g, " ").replace(/\|/g, "\\|");
}

// A fence longer than any backtick run in the evidence cannot be closed by the evidence itself.
function fenced(value: string): string {
  const longestRun = Math.max(0, ...(value.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${value}\n${fence}`;
}

function findingTable(findings: readonly Finding[]): string[] {
  if (findings.length === 0) return ["None.", ""];
  return [
    "| Rule | Severity | Location | Title |",
    "|---|---|---|---|",
    ...findings.map((finding) => `| ${finding.ruleId} | ${finding.severity} | \`${inline(finding.file)}:${finding.line}\` | ${inline(finding.title)} |`),
    "",
  ];
}

export function buildMarkdownReport(input: ReportInput): string {
  const comparison = compareScans(input.baseline, input.current);
  const lines = [
    `# GraveScan report: ${input.fixture}`,
    "",
    `> ${SAFETY_NOTICE}`,
    "> GraveScan reports evidence and verification status. It does not claim that a project is fully secure.",
    "",
    "## Summary",
    "",
    `- Findings before patches: ${input.baseline.findings.length}`,
    `- Findings after patches: ${input.current.findings.length}`,
    `- Resolved: ${comparison.resolved.length}`,
    `- Introduced: ${comparison.introduced.length}`,
    `- Patches applied: ${input.patches.length}`,
    "",
    "## Before",
    "",
    ...findingTable(input.baseline.findings),
    "## After",
    "",
    ...findingTable(input.current.findings),
    "## Resolved",
    "",
    ...findingTable(comparison.resolved),
    "## Introduced",
    "",
    ...findingTable(comparison.introduced),
    "## Patches",
    "",
  ];

  if (input.patches.length === 0) lines.push("No patch was applied.", "");
  for (const patch of input.patches) {
    lines.push(
      `### ${patch.ruleId}: ${inline(patch.file)}`,
      "",
      `- Finding: \`${inline(patch.findingId)}\``,
      `- Reason: ${inline(patch.reason)}`,
      `- Verification: ${patch.status}`,
      ...(patch.replayResult === undefined ? [] : [`- Replay after patch: ${patch.replayResult}`]),
      "",
    );
  }

  lines.push("## Remaining evidence", "");
  if (input.current.findings.length === 0) lines.push("None.", "");
  for (const finding of input.current.findings) {
    lines.push(`### ${finding.ruleId}: ${inline(finding.title)}`, "", `\`${inline(finding.file)}:${finding.line}\``, "", fenced(finding.evidence), "", `Remediation: ${inline(finding.remediation)}`, "");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
