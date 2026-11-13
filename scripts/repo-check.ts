import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_KIRO_DIRS = ["specs", "steering", "hooks"] as const;

function isDirectory(target: string): boolean {
  return existsSync(target) && statSync(target).isDirectory();
}

function listTree(root: string, dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = `${dir}/${entry.name}`;
    found.push(relative);
    if (entry.isDirectory()) found.push(...listTree(root, relative));
  }
  return found;
}

function hasFiles(root: string, dir: string): boolean {
  return isDirectory(path.join(root, dir)) && listTree(root, dir).length > 0;
}

// git check-ignore exits 0 when something is ignored and 1 when nothing is.
function ignoredPaths(root: string, candidates: string[]): string[] | string {
  try {
    const stdout = execFileSync(
      "git",
      ["-C", root, "check-ignore", "--", ...candidates],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return stdout.split("\n").filter((line) => line !== "");
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 1) return [];
    return "git check-ignore failed; is this a git repository?";
  }
}

export function checkRepo(root: string): string[] {
  const problems: string[] = [];

  if (!isDirectory(path.join(root, ".kiro"))) {
    problems.push(".kiro/ is missing at the repository root");
  } else {
    for (const sub of REQUIRED_KIRO_DIRS) {
      if (!hasFiles(root, `.kiro/${sub}`)) {
        problems.push(`.kiro/${sub}/ is missing or empty`);
      }
    }
    const ignored = ignoredPaths(root, [".kiro", ...listTree(root, ".kiro")]);
    if (typeof ignored === "string") problems.push(ignored);
    else for (const item of ignored) problems.push(`${item} is ignored by git`);
  }

  const licensePath = path.join(root, "LICENSE");
  if (!existsSync(licensePath)) {
    problems.push("LICENSE is missing");
  } else if (!/MIT License|Apache License/.test(readFileSync(licensePath, "utf8"))) {
    problems.push("LICENSE is not a recognized open source license");
  }

  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, "..");
  const problems = checkRepo(root);
  for (const problem of problems) console.error(`repo:check ${problem}`);
  if (problems.length === 0) console.log("repo:check ok");
  process.exitCode = problems.length === 0 ? 0 : 1;
}
