import { listFixtures } from "@gravescan/fixtures";

export type Io = {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
};

export const USAGE = [
  "Usage: gravescan <command>",
  "",
  "Commands:",
  "  list    Print the available fixture IDs",
  "  help    Show this message",
].join("\n");

export function run(argv: readonly string[], io: Io): number {
  const [command] = argv;
  switch (command) {
    case "list":
      for (const id of listFixtures()) io.out(id);
      return 0;
    case "help":
    case "--help":
    case "-h":
      io.out(USAGE);
      return 0;
    default:
      io.err(
        command === undefined
          ? "Missing command."
          : `Unknown command: ${JSON.stringify(command)}`,
      );
      io.err(USAGE);
      return 1;
  }
}
