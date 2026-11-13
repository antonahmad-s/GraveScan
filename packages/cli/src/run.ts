import { listFixtures } from "@gravescan/fixtures";
import { scanFixture } from "@gravescan/scanner";

export type Io = {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
};

export const USAGE = [
  "Usage: gravescan <command>",
  "",
  "Commands:",
  "  list                                      Print available fixture IDs",
  "  scan --fixture <id> --format json         Scan one controlled fixture",
  "  help                                      Show this message",
].join("\n");

type ScanArgs = { readonly fixture: string; readonly format: "json" };

function parseScanArgs(args: readonly string[]): ScanArgs | string {
  let fixture: string | undefined;
  let format: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    const value = args[index + 1];
    if (option === "--fixture" && value !== undefined && fixture === undefined) {
      fixture = value;
      index += 1;
      continue;
    }
    if (option === "--format" && value !== undefined && format === undefined) {
      format = value;
      index += 1;
      continue;
    }
    return `Unsupported scan option: ${JSON.stringify(option)}`;
  }
  if (fixture === undefined) return "Missing required option: --fixture <id>";
  if (format !== "json") return "Only --format json is supported.";
  return { fixture, format };
}

function runScan(args: readonly string[], io: Io): number {
  const parsed = parseScanArgs(args);
  if (typeof parsed === "string") {
    io.err(parsed);
    io.err(USAGE);
    return 1;
  }
  const result = scanFixture(parsed.fixture);
  if (!result.ok) {
    io.err(`${result.error.code}: ${JSON.stringify(result.error)}`);
    return 1;
  }
  io.out(JSON.stringify(result.value, null, 2));
  return 0;
}

export function run(argv: readonly string[], io: Io): number {
  const [command, ...args] = argv;
  switch (command) {
    case "list":
      if (args.length > 0) {
        io.err("The list command accepts no options.");
        return 1;
      }
      for (const id of listFixtures()) io.out(id);
      return 0;
    case "scan":
      return runScan(args, io);
    case "help":
    case "--help":
    case "-h":
      io.out(USAGE);
      return 0;
    default:
      io.err(command === undefined ? "Missing command." : `Unknown command: ${JSON.stringify(command)}`);
      io.err(USAGE);
      return 1;
  }
}
