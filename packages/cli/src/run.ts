import { listFixtures, loadProjectKiro } from "@gravescan/fixtures";
import { scanFiles, scanFixture, type ScanResult, type Severity } from "@gravescan/scanner";

export type Io = {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
};

export const USAGE = [
  "Usage: gravescan <command>",
  "",
  "Commands:",
  "  list                                         Print available fixture IDs",
  "  scan --fixture <id> --format json            Scan one controlled fixture",
  "  self-scan --format json [--fail-on <level>]  Scan this project's own .kiro/ directory",
  "  help                                         Show this message",
  "",
  "--fail-on exits 1 when a finding at or above <level> exists (critical, high, medium, low).",
].join("\n");

const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

type Options = { fixture?: string; format?: string; failOn?: string };

function parseOptions(args: readonly string[], allowed: readonly (keyof Options)[]): Options | string {
  const flags: Record<string, keyof Options> = { "--fixture": "fixture", "--format": "format", "--fail-on": "failOn" };
  const options: Options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index] ?? "";
    const key = flags[flag];
    const value = args[index + 1];
    if (key === undefined || !allowed.includes(key) || value === undefined || options[key] !== undefined) {
      return `Unsupported option: ${JSON.stringify(flag)}`;
    }
    options[key] = value;
  }
  if (options.format !== "json") return "Only --format json is supported.";
  if (options.failOn !== undefined && !(options.failOn in SEVERITY_RANK)) {
    return "--fail-on must be one of: critical, high, medium, low.";
  }
  return options;
}

function usageError(io: Io, message: string): number {
  io.err(message);
  io.err(USAGE);
  return 1;
}

function report(io: Io, result: ScanResult, failOn: string | undefined): number {
  io.out(JSON.stringify(result, null, 2));
  if (failOn === undefined) return 0;
  const threshold = SEVERITY_RANK[failOn as Severity];
  const blocking = result.findings.filter((finding) => SEVERITY_RANK[finding.severity] >= threshold);
  if (blocking.length === 0) return 0;
  io.err(`${blocking.length} finding(s) at or above ${failOn}: ${blocking.map((finding) => finding.id).join(", ")}`);
  return 1;
}

function runScan(args: readonly string[], io: Io): number {
  const options = parseOptions(args, ["fixture", "format", "failOn"]);
  if (typeof options === "string") return usageError(io, options);
  if (options.fixture === undefined) return usageError(io, "Missing required option: --fixture <id>");
  const result = scanFixture(options.fixture);
  if (!result.ok) {
    io.err(`${result.error.code}: ${JSON.stringify(result.error)}`);
    return 1;
  }
  return report(io, result.value, options.failOn);
}

function runSelfScan(args: readonly string[], io: Io): number {
  const options = parseOptions(args, ["format", "failOn"]);
  if (typeof options === "string") return usageError(io, options);
  const files = loadProjectKiro();
  if (!files.ok) {
    io.err(`${files.error.code}: ${JSON.stringify(files.error)}`);
    return 1;
  }
  return report(io, scanFiles(files.value), options.failOn);
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
