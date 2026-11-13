import type { Finding, RuleId, Severity } from "./schemas.ts";
import {
  asStringArray,
  escapeRegExp,
  isRecord,
  lineWith,
  type ScanDocument,
} from "./documents.ts";

export type RuleDefinition = {
  readonly id: RuleId;
  readonly severity: Severity;
  readonly evaluate: (documents: readonly ScanDocument[]) => Finding[];
};

type FindingFields = Omit<Finding, "id" | "ruleId">;

function createFinding(ruleId: RuleId, fields: FindingFields): Finding {
  return { id: `${ruleId}:${fields.file}:${fields.line}`, ruleId, ...fields };
}

function hasKiroPath(document: ScanDocument): boolean {
  return document.file.startsWith(".kiro/");
}

function getMcpServers(document: ScanDocument): Record<string, unknown> | undefined {
  if (!hasKiroPath(document) || !document.file.endsWith("mcp.json")) return undefined;
  if (!isRecord(document.json) || !isRecord(document.json.mcpServers)) return undefined;
  return document.json.mcpServers;
}

function isEnabledServer(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.disabled !== true;
}

function sourceFinding(
  ruleId: RuleId,
  severity: Severity,
  document: ScanDocument,
  expression: RegExp,
  fields: Omit<FindingFields, "file" | "line" | "evidence" | "severity">,
): Finding {
  const source = lineWith(document, expression);
  return createFinding(ruleId, { severity, file: document.file, ...source, ...fields });
}

const shellCapability = /(?:run[_-]?command|shell|terminal|(?:^|[_-])exec(?:ute)?(?:$|[_-])|bash|powershell|(?:^|[_-])cmd(?:$|[_-]))/i;
const configuredToolLists = ["tools", "toolAllowlist", "allowedTools"] as const;
// Full match: an approved script plus plain arguments. Any shell syntax (&&, ;, |, $, `, >) fails.
const approvedHookCommand = /^pnpm (?:lint|typecheck|test|verify|self-scan|docs:check|repo:check|gravescan|vitest run)(?: [A-Za-z0-9_./:=-]+)*$/;
const unsafeHookInput = /\$(?:SAVED_FILE(?:_PATH)?|INPUT)|\{\{\s*input\s*\}\}/i;
const secretRequest = /\b(?:print|export|send|reveal)\b[^\n]{0,100}\b(?:secret|credential|environment variable|env(?:ironment)?\s+variable)/i;
const broadFilesystemGrant = /(?:\byou may\b[^\n]{0,100}\b(?:any path|outside the workspace|outside workspace)|\bany path on the machine\b|\baccess outside the workspace\b)/i;
const secretAssignment = /(?:["']?[a-z0-9_]*(?:token|secret|password|api_?key)[a-z0-9_]*["']?\s*[:=]\s*["'])([^"'\s]{6,})/i;
const sandboxPolicyHeading = /^#{1,6}\s*sandbox policy\b/im;
const explicitDenial = /\b(?:never|do not|don't|must not|forbidden|dilarang)\b/i;

function riskyLine(document: ScanDocument, expression: RegExp): { line: number; evidence: string } | undefined {
  const index = document.lines.findIndex((line) => expression.test(line) && !explicitDenial.test(line));
  return index === -1 ? undefined : { line: index + 1, evidence: document.lines[index] ?? "(empty file)" };
}

function concreteSecretAssignment(document: ScanDocument): { line: number; evidence: string } | undefined {
  const index = document.lines.findIndex((line) => {
    const value = secretAssignment.exec(line)?.[1];
    return value !== undefined && !/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/.test(value);
  });
  return index === -1 ? undefined : { line: index + 1, evidence: document.lines[index] ?? "(empty file)" };
}

const rule001: RuleDefinition = {
  id: "GRAVE-001",
  severity: "high",
  evaluate(documents) {
    const findings: Finding[] = [];
    for (const document of documents) {
      const servers = getMcpServers(document);
      if (!servers) continue;
      for (const [serverName, server] of Object.entries(servers)) {
        if (!isEnabledServer(server)) continue;
        for (const tool of asStringArray(server.autoApprove) ?? []) {
          if (!shellCapability.test(tool)) continue;
          findings.push(
            sourceFinding(this.id, this.severity, document, new RegExp(escapeRegExp(tool)), {
              title: "Auto-approved shell-capable MCP tool",
              description: `Enabled MCP server "${serverName}" auto-approves the shell-capable tool "${tool}".`,
              remediation: "Remove the auto-approval and require explicit approval for this capability.",
              confidence: "high",
              attackScenarioId: "MCP-TOOL-ESCALATION",
            }),
          );
        }
      }
    }
    return findings;
  },
};

const rule002: RuleDefinition = {
  id: "GRAVE-002",
  severity: "high",
  evaluate(documents) {
    const findings: Finding[] = [];
    for (const document of documents) {
      const servers = getMcpServers(document);
      if (!servers) continue;
      for (const [serverName, server] of Object.entries(servers)) {
        if (!isEnabledServer(server)) continue;
        const hasAllowlist = configuredToolLists.some((key) => {
          const list = asStringArray(server[key]);
          return list !== undefined && list.length > 0;
        });
        if (hasAllowlist) continue;
        findings.push(
          sourceFinding(this.id, this.severity, document, new RegExp(escapeRegExp(serverName)), {
            title: "MCP server has no tool allowlist",
            description: `Enabled MCP server "${serverName}" has no explicit tool allowlist.`,
            remediation: "Define the minimum required tools in a non-empty tool allowlist.",
            confidence: "high",
          }),
        );
      }
    }
    return findings;
  },
};

function hookCommands(document: ScanDocument): string[] {
  if (!hasKiroPath(document) || !document.file.includes("/hooks/") || !isRecord(document.json)) return [];
  const hooks = document.json.hooks;
  if (!Array.isArray(hooks)) return [];
  return hooks.flatMap((hook) => {
    if (!isRecord(hook) || !isRecord(hook.action) || hook.action.type !== "command") return [];
    return typeof hook.action.command === "string" ? [hook.action.command] : [];
  });
}

const rule003: RuleDefinition = {
  id: "GRAVE-003",
  severity: "high",
  evaluate(documents) {
    return documents.flatMap((document) =>
      hookCommands(document)
        .filter((command) => !approvedHookCommand.test(command))
        .map((command) =>
          sourceFinding(this.id, this.severity, document, new RegExp(escapeRegExp(command)), {
            title: "Hook runs a command outside the allowlist",
            description: `The hook command "${command}" is not in GraveScan's fixed command allowlist.`,
            remediation: "Replace it with a fixed approved command; do not invoke shells or interpolated commands.",
            confidence: "high",
            attackScenarioId: "HOOK-INPUT-EXECUTION",
          }),
        ),
    );
  },
};

const rule004: RuleDefinition = {
  id: "GRAVE-004",
  severity: "medium",
  evaluate(documents) {
    return documents.flatMap((document) =>
      hookCommands(document)
        .filter((command) => unsafeHookInput.test(command))
        .map((command) =>
          sourceFinding(this.id, this.severity, document, new RegExp(escapeRegExp(command)), {
            title: "Hook interpolates unvalidated input",
            description: `The hook command interpolates an event value: "${command}".`,
            remediation: "Remove input interpolation or validate against a fixed allowlist before use.",
            confidence: "high",
            attackScenarioId: "HOOK-INPUT-EXECUTION",
          }),
        ),
    );
  },
};

function steeringDocuments(documents: readonly ScanDocument[]): readonly ScanDocument[] {
  return documents.filter((document) => document.file.startsWith(".kiro/steering/") && document.file.endsWith(".md"));
}

const rule005: RuleDefinition = {
  id: "GRAVE-005",
  severity: "critical",
  evaluate(documents) {
    return steeringDocuments(documents).flatMap((document) => {
      const source = riskyLine(document, secretRequest);
      return source === undefined
        ? []
        : [
            createFinding(this.id, {
              severity: this.severity,
              file: document.file,
              ...source,
              title: "Steering requests secrets or credentials",
              description: "Steering instructs an agent to print, export, send, or reveal sensitive data.",
              remediation: "Remove the instruction and state that secrets and environment values must never be exposed.",
              confidence: "high",
              attackScenarioId: "STEERING-SECRET-EXPOSURE",
            }),
          ];
    });
  },
};

const rule006: RuleDefinition = {
  id: "GRAVE-006",
  severity: "high",
  evaluate(documents) {
    return steeringDocuments(documents).flatMap((document) => {
      const source = lineWith(document, broadFilesystemGrant);
      return broadFilesystemGrant.test(document.content)
        ? [
            createFinding(this.id, {
              severity: this.severity,
              file: document.file,
              ...source,
              title: "Steering grants filesystem access outside the workspace",
              description: "Steering permits broad filesystem access beyond the workspace boundary.",
              remediation: "Restrict file access to workspace-relative paths and reject paths outside it.",
              confidence: "high",
              attackScenarioId: "STEERING-FILESYSTEM-ESCAPE",
            }),
          ]
        : [];
    });
  },
};

function agentHasNetworkWithoutReason(document: ScanDocument): boolean {
  if (!document.file.startsWith(".kiro/agents/") || !document.file.endsWith(".json") || !isRecord(document.json)) return false;
  const tools = asStringArray(document.json.tools) ?? [];
  const networkEnabled = tools.includes("web") || tools.includes("network") || tools.includes("*");
  const prompt = typeof document.json.prompt === "string" ? document.json.prompt : "";
  const description = typeof document.json.description === "string" ? document.json.description : "";
  return networkEnabled && !/\b(?:reason|because|business need|network justification)\b/i.test(`${prompt}\n${description}`);
}

const rule007: RuleDefinition = {
  id: "GRAVE-007",
  severity: "medium",
  evaluate(documents) {
    return documents.flatMap((document) =>
      agentHasNetworkWithoutReason(document)
        ? [
            sourceFinding(this.id, this.severity, document, /"(?:web|network|\*)"/, {
              title: "Agent has network capability without a reason",
              description: "The agent profile enables network-capable tools but provides no stated business reason.",
              remediation: "Remove the network capability or document the narrow business reason and allowed use.",
              confidence: "medium",
              attackScenarioId: "AGENT-NETWORK-ESCALATION",
            }),
          ]
        : [],
    );
  },
};

const rule009: RuleDefinition = {
  id: "GRAVE-009",
  severity: "high",
  evaluate(documents) {
    return documents.flatMap((document) => {
      if (!document.file.startsWith(".kiro/") || !document.file.endsWith(".json")) return [];
      const source = concreteSecretAssignment(document);
      return source === undefined
        ? []
        : [
            createFinding(this.id, {
              severity: this.severity,
              file: document.file,
              ...source,
              title: "Configuration contains a secret-like value",
              description: "A configuration assignment contains a token, secret, password, or API key value.",
              remediation: "Remove the value or replace it with a runtime environment reference. Do not commit credentials.",
              confidence: "medium",
            }),
          ];
    });
  },
};

const rule010: RuleDefinition = {
  id: "GRAVE-010",
  severity: "medium",
  evaluate(documents) {
    const kiroDocuments = documents.filter(hasKiroPath);
    // Only steering is loaded as agent guidance; a spec that mentions the policy does not enforce it.
    const policyExists = steeringDocuments(documents).some((document) => sandboxPolicyHeading.test(document.content));
    const target = kiroDocuments[0];
    if (policyExists || target === undefined) return [];
    return [
      createFinding(this.id, {
        severity: this.severity,
        file: target.file,
        line: 1,
        evidence: target.lines[0] ?? "(empty file)",
        title: "Sandbox policy is not defined",
        description: "No Kiro configuration document declares a sandbox policy.",
        remediation: "Add a named sandbox policy that limits tool, filesystem, and network capabilities.",
        confidence: "high",
      }),
    ];
  },
};

export const RULES: readonly RuleDefinition[] = [
  rule001,
  rule002,
  rule003,
  rule004,
  rule005,
  rule006,
  rule007,
  {
    id: "GRAVE-008",
    severity: "low",
    evaluate: () => [],
  },
  rule009,
  rule010,
];

export function remediationContractFindings(findings: readonly Finding[]): Finding[] {
  return findings
    .filter((finding) => finding.remediation.trim() === "")
    .map((finding) =>
      createFinding("GRAVE-008", {
        severity: "low",
        file: finding.file,
        line: finding.line,
        evidence: `Finding ${finding.id} has no remediation.`,
        title: "Finding has no remediation",
        description: "A scanner-generated finding did not provide actionable remediation.",
        remediation: "Add a concrete remediation before returning the finding.",
        confidence: "high",
      }),
    );
}
