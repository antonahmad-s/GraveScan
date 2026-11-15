import path from "node:path";
import { listFixtures, loadProjectKiro } from "@gravescan/fixtures";
import { buildSarif } from "@gravescan/reporting";
import { redactDeep, scanFiles, scanFixture, type ScanResult, type Severity } from "@gravescan/scanner";

export type Io = {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
};

export const USAGE = [
  "Usage: gravescan <command>",
  "",
  "Commands:",
  "  list                                         Print available fixture IDs",
  "  scan --fixture <id> --format <fmt>           Scan one controlled fixture",
  "  scan --path <dir> --format <fmt>             Scan the .kiro/ folder of a project directory",
  "  self-scan --format <fmt> [--fail-on <level>] Scan this project's own .kiro/ directory",
  "  help                                         Show this message",
  "",
  "<fmt> is json, or sarif for GitHub code scanning and other SARIF tools.",
  "--fail-on exits 1 when a finding at or above <level> exists (critical, high, medium, low).",
  "Secret-like values are printed as [REDACTED]. Files are read only; nothing is executed or changed.",
].join("\n");

const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

type Options = { fixture?: string; path?: string; format?: string; failOn?: string };

function parseOptions(args: readonly string[], allowed: readonly (keyof Options)[]): Options | string {
  const flags: Record<string, keyof Options> = { "--fixture": "fixture", "--path": "path", "--format": "format", "--fail-on": "failOn" };
  const options: Options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index] ?? "";
    const key = Object.hasOwn(flags, flag) ? flags[flag] : undefined;
    const value = args[index + 1];
    if (key === undefined || !allowed.includes(key) || value === undefined || options[key] !== undefined) {
      return `Unsupported option: ${JSON.stringify(flag)}`;
    }
    options[key] = value;
  }
  if (options.format !== "json" && options.format !== "sarif") return "--format must be json or sarif.";
  if (options.failOn !== undefined && !Object.hasOwn(SEVERITY_RANK, options.failOn)) {
    return "--fail-on must be one of: critical, high, medium, low.";
  }
  return options;
}

function usageError(io: Io, message: string): number {
  io.err(message);
  io.err(USAGE);
  return 1;
}

function report(io: Io, result: ScanResult, options: Options): number {
  const failOn = options.failOn;
  // Redact first: the SARIF fingerprint and snippet are then derived from redacted evidence too.
  const redacted = redactDeep(result);
  io.out(JSON.stringify(options.format === "sarif" ? buildSarif(redacted) : redacted, null, 2));
  if (failOn === undefined) return 0;
  const threshold = SEVERITY_RANK[failOn as Severity];
  const blocking = result.findings.filter((finding) => SEVERITY_RANK[finding.severity] >= threshold);
  if (blocking.length === 0) return 0;
  io.err(`${blocking.length} finding(s) at or above ${failOn}: ${blocking.map((finding) => finding.id).join(", ")}`);
  return 1;
}

function scanPath(io: Io, directory: string, options: Options): number {
  const root = path.resolve(directory);
  const files = loadProjectKiro(root);
  if (!files.ok) {
    const error = files.error;
    const where = "path" in error ? ` (${error.path})` : "";
    io.err(`${error.code}${"reason" in error ? `: ${error.reason}` : ""}${where}. Expected a readable .kiro/ folder inside ${root}.`);
    return 1;
  }
  return report(io, scanFiles(files.value), options);
}

function runScan(args: readonly string[], io: Io): number {
  const options = parseOptions(args, ["fixture", "path", "format", "failOn"]);
  if (typeof options === "string") return usageError(io, options);
  if ((options.fixture === undefined) === (options.path === undefined)) {
    return usageError(io, "Use exactly one of --fixture <id> or --path <dir>.");
  }
  if (options.path !== undefined) return scanPath(io, options.path, options);
  const result = scanFixture(options.fixture as string);
  if (!result.ok) {
    io.err(`${result.error.code}: ${JSON.stringify(result.error)}`);
    return 1;
  }
  return report(io, result.value, options);
}

function runSelfScan(args: readonly string[], io: Io): number {
  const options = parseOptions(args, ["format", "failOn"]);
  if (typeof options === "string") return usageError(io, options);
  const files = loadProjectKiro();
  if (!files.ok) {
    io.err(`${files.error.code}: ${JSON.stringify(files.error)}`);
    return 1;
  }
  return report(io, scanFiles(files.value), options);
}

export function run(argv: readonly string[], io: Io): number {
  const [command, ...args] = argv;
  switch (command) {
    case "list":
      if (args.length > 0) return usageError(io, "The list command accepts no options.");
      for (const id of listFixtures()) io.out(id);
      return 0;
    case "scan":
      return runScan(args, io);
    case "self-scan":
      return runSelfScan(args, io);
    case "help":
    case "--help":
    case "-h":
      io.out(USAGE);
      return 0;
    default:
      return usageError(io, command === undefined ? "Missing command." : `Unknown command: ${JSON.stringify(command)}`);
  }
}
