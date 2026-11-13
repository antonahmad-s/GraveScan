import {
  readWorkCopy,
  type FixtureFile,
  type Result,
  type WorkCopy,
} from "@gravescan/fixtures";
import { scanFiles, type Finding } from "@gravescan/scanner";
import type { Patch, PatchError } from "./schemas.ts";
import { unifiedDiff } from "./diff.ts";

const shellCapability = /(?:run[_-]?command|shell|terminal|(?:^|[_-])exec(?:ute)?(?:$|[_-])|bash|powershell|(?:^|[_-])cmd(?:$|[_-]))/i;
const secretAssignment = /((?:["']?[a-z0-9_]*(?:token|secret|password|api_?key)[a-z0-9_]*["']?\s*[:=]\s*["']))([^"'\s]{6,})(["'])/i;

function patchError(code: PatchError["code"], value: string): Result<Patch, PatchError> {
  if (code === "PATCH_UNSUPPORTED") return { ok: false, error: { code, ruleId: value } };
  if (code === "PATCH_FILE_MISSING") return { ok: false, error: { code, file: value } };
  if (code === "PATCH_CONFLICT") return { ok: false, error: { code, file: value } };
  if (code === "PATCH_PATH_REJECTED") return { ok: false, error: { code, file: value } };
  return { ok: false, error: { code, detail: value } };
}

function highCriticalCount(files: readonly FixtureFile[]): number {
  return scanFiles(files).findings.filter((finding) => finding.severity === "high" || finding.severity === "critical").length;
}

function findFile(files: readonly FixtureFile[], file: string): string | undefined {
  return files.find((candidate) => candidate.path === file)?.content;
}

function stringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function patchMcp(before: string, finding: Finding): string | undefined {
  let config: Record<string, unknown>;
  try {
    const parsed = asRecord(JSON.parse(before));
    if (parsed === undefined) return undefined;
    config = parsed;
  } catch {
    return undefined;
  }
  const servers = asRecord(config.mcpServers);
  const name = /server "([^"]+)"/.exec(finding.description)?.[1];
  if (servers === undefined || name === undefined) return undefined;
  const server = asRecord(servers[name]);
  if (server === undefined) return undefined;

  if (finding.ruleId === "GRAVE-001") {
    const approved = Array.isArray(server.autoApprove) ? server.autoApprove : [];
    server.autoApprove = approved.filter((tool) => typeof tool !== "string" || !shellCapability.test(tool));
  } else if (finding.ruleId === "GRAVE-002") {
    server.tools = ["read_file"];
  } else {
    return undefined;
  }
  return stringify(config);
}

function patchHook(before: string): string | undefined {
  try {
    const config = asRecord(JSON.parse(before));
    if (config === undefined || !Array.isArray(config.hooks)) return undefined;
    let changed = false;
    for (const hook of config.hooks) {
      const record = asRecord(hook);
      const action = record === undefined ? undefined : asRecord(record.action);
      if (action?.type === "command" && typeof action.command === "string" && action.command !== "pnpm test") {
        action.command = "pnpm test";
        changed = true;
      }
    }
    return changed ? stringify(config) : undefined;
  } catch {
    return undefined;
  }
}

function replaceEvidence(before: string, evidence: string, replacement: string): string | undefined {
  return before.includes(evidence) ? before.replace(evidence, replacement) : undefined;
}

function transform(finding: Finding, before: string): { after: string; reason: string; riskNote: string } | undefined {
  switch (finding.ruleId) {
    case "GRAVE-001":
      return patchMcp(before, finding) === undefined ? undefined : {
        after: patchMcp(before, finding) as string,
        reason: "Removes shell-capable automatic approval.",
        riskNote: "The affected workflow now requires explicit approval.",
      };
    case "GRAVE-002":
      return patchMcp(before, finding) === undefined ? undefined : {
        after: patchMcp(before, finding) as string,
        reason: "Adds a minimal read-only MCP tool allowlist.",
        riskNote: "Confirm that read_file is sufficient for the real workflow.",
      };
    case "GRAVE-003":
    case "GRAVE-004":
      return patchHook(before) === undefined ? undefined : {
        after: patchHook(before) as string,
        reason: "Replaces the unsafe hook command with a fixed allowlisted command.",
        riskNote: "Confirm that pnpm test is the intended post-save behavior.",
      };
    case "GRAVE-005":
      return replaceEvidence(before, finding.evidence, "- Never print, export, send, or reveal secrets, credentials, or environment values.") === undefined ? undefined : {
        after: replaceEvidence(before, finding.evidence, "- Never print, export, send, or reveal secrets, credentials, or environment values.") as string,
        reason: "Replaces the disclosure request with a non-disclosure boundary.",
        riskNote: "Review adjacent steering instructions for other disclosure paths.",
      };
    case "GRAVE-006":
      return replaceEvidence(before, finding.evidence, "- Read and write workspace-relative paths only.") === undefined ? undefined : {
        after: replaceEvidence(before, finding.evidence, "- Read and write workspace-relative paths only.") as string,
        reason: "Replaces broad filesystem access with a workspace-only boundary.",
        riskNote: "Workflows that require external files need a separately approved design.",
      };
    case "GRAVE-009": {
      const after = before.replace(secretAssignment, "$1${API_TOKEN}$3");
      return after === before ? undefined : {
        after,
        reason: "Replaces a committed secret-like value with an environment reference.",
        riskNote: "Set API_TOKEN only at runtime and never export it in reports.",
      };
    }
    default:
      return undefined;
  }
}

export function generatePatch(
  copy: WorkCopy,
  finding: Finding,
  base?: string,
): Result<Patch, PatchError> {
  const loaded = readWorkCopy(copy, base);
  if (!loaded.ok) return patchError("WORK_COPY_INVALID", loaded.error.code);
  const baselineHighCritical = highCriticalCount(loaded.value);

  if (finding.ruleId === "GRAVE-010") {
    const file = ".kiro/steering/sandbox-policy.md";
    const before = findFile(loaded.value, file) ?? "";
    const after = "# Sandbox Policy\n\n- Only workspace-relative paths are allowed.\n- No arbitrary shell command, code execution, or outbound network request is allowed.\n";
    return {
      ok: true,
      value: {
        id: `PATCH:${finding.id}`,
        findingId: finding.id,
        ruleId: finding.ruleId,
        file,
        before,
        after,
        diff: unifiedDiff(file, before, after),
        reason: "Adds a named sandbox policy.",
        riskNote: "Review the policy against the actual deployment boundary.",
        baselineHighCritical,
      },
    };
  }

  const before = findFile(loaded.value, finding.file);
  if (before === undefined) return patchError("PATCH_FILE_MISSING", finding.file);
  const update = transform(finding, before);
  if (update === undefined) return patchError("PATCH_UNSUPPORTED", finding.ruleId);
  return {
    ok: true,
    value: {
      id: `PATCH:${finding.id}`,
      findingId: finding.id,
      ruleId: finding.ruleId,
      file: finding.file,
      before,
      after: update.after,
      diff: unifiedDiff(finding.file, before, update.after),
      reason: update.reason,
      riskNote: update.riskNote,
      baselineHighCritical,
      attackScenarioId: finding.attackScenarioId,
    },
  };
}
