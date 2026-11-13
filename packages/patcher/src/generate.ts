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

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// A text edit is accepted only if it parses to exactly the structural change; otherwise the reformatted version is used.
function preferTextEdit(edited: string | undefined, structural: string): string {
  if (edited === undefined) return structural;
  const parsed = parseJson(edited);
  return parsed !== undefined && JSON.stringify(parsed) === JSON.stringify(JSON.parse(structural)) ? edited : structural;
}

function replaceLine(text: string, line: number, update: (value: string) => string | undefined): string | undefined {
  const lines = text.split("\n");
  const current = lines[line - 1];
  if (current === undefined) return undefined;
  const next = update(current);
  if (next === undefined || next === current) return undefined;
  lines[line - 1] = next;
  return lines.join("\n");
}

// Finds the line holding the brace that closes the object opened on `line`, skipping braces inside strings.
function closingLine(lines: readonly string[], line: number): number | undefined {
  let depth = 0;
  let inString = false;
  for (let index = line - 1; index < lines.length; index += 1) {
    const text = lines[index] ?? "";
    for (let position = 0; position < text.length; position += 1) {
      const character = text[position];
      if (inString) {
        if (character === "\\") position += 1;
        else if (character === '"') inString = false;
      } else if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}" && --depth === 0) return index + 1;
    }
  }
  return undefined;
}

function insertProperty(text: string, objectLine: number, property: string): string | undefined {
  const lines = text.split("\n");
  const close = closingLine(lines, objectLine);
  if (close === undefined) return undefined;
  let last = close - 2;
  while (last >= objectLine && (lines[last] ?? "").trim() === "") last -= 1;
  const previous = lines[last] ?? "";
  const indent = `${(lines[close - 1] ?? "").match(/^\s*/)?.[0] ?? ""}  `;
  if (last >= objectLine && !/[,{]\s*$/.test(previous)) lines[last] = `${previous.replace(/\s*$/, "")},`;
  lines.splice(close - 1, 0, `${indent}${property}`);
  return lines.join("\n");
}

function textPatchMcp(before: string, finding: Finding, structural: string): string | undefined {
  const parsed = asRecord(parseJson(structural));
  const name = /server "([^"]+)"/.exec(finding.description)?.[1];
  const server = name === undefined ? undefined : asRecord(asRecord(parsed?.mcpServers)?.[name]);
  if (server === undefined) return undefined;
  if (finding.ruleId === "GRAVE-001") {
    const kept = (server.autoApprove as unknown[]).map((tool) => JSON.stringify(tool)).join(", ");
    return replaceLine(before, finding.line, (line) => line.replace(/\[[^\]]*\]/, `[${kept}]`));
  }
  return insertProperty(before, finding.line, `"tools": ${JSON.stringify(server.tools)}`.replace(/","/g, '", "'));
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
  const structural = stringify(config);
  return preferTextEdit(textPatchMcp(before, finding, structural), structural);
}

const commandValue = /("command"\s*:\s*)"((?:[^"\\]|\\.)*)"/;

// Replaces only the hook command named on the finding's line, not every hook in the file.
function patchHook(before: string, finding: Finding): string | undefined {
  const config = asRecord(parseJson(before));
  const match = commandValue.exec(before.split("\n")[finding.line - 1] ?? "");
  if (config === undefined || !Array.isArray(config.hooks) || match?.[2] === undefined) return undefined;
  const unsafe = JSON.parse(`"${match[2]}"`) as string;
  let changed = false;
  for (const hook of config.hooks) {
    const action = asRecord(asRecord(hook)?.action);
    if (action?.type === "command" && action.command === unsafe) {
      action.command = "pnpm test";
      changed = true;
    }
  }
  if (!changed) return undefined;
  const edited = before.split("\n").map((line) => {
    const value = commandValue.exec(line)?.[2];
    return value !== undefined && JSON.parse(`"${value}"`) === unsafe ? line.replace(commandValue, '$1"pnpm test"') : line;
  }).join("\n");
  return preferTextEdit(edited, stringify(config));
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
      return patchHook(before, finding) === undefined ? undefined : {
        after: patchHook(before, finding) as string,
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
  const baselineRuleCount = Math.max(
    1,
    scanFiles(loaded.value).findings.filter((item) => item.ruleId === finding.ruleId && item.file === finding.file).length,
  );
  const identity = { findingFile: finding.file, baselineRuleCount };

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
        ...identity,
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
      ...identity,
      attackScenarioId: finding.attackScenarioId,
    },
  };
}
