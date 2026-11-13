import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DOCS_WITH_LINKS = ["README.md", ".kiro/specs/README.md"] as const;
const SPEC_FILES = ["requirements.md", "design.md", "tasks.md"] as const;
const FENCED_BLOCK = /```[\s\S]*?```/g;
const LINK_TARGET = /\]\(([^)\s]+)\)/g;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function extractRelativeLinks(markdown: string): string[] {
  const links: string[] = [];
  for (const match of markdown.replace(FENCED_BLOCK, "").matchAll(LINK_TARGET)) {
    const target = (match[1] ?? "").split("#")[0] ?? "";
    if (target === "" || URL_SCHEME.test(target)) continue;
    links.push(target);
  }
  return links;
}

function readIfExists(file: string): string | undefined {
  return existsSync(file) ? readFileSync(file, "utf8") : undefined;
}

function checkLinks(root: string, problems: string[]): void {
  for (const doc of DOCS_WITH_LINKS) {
    const text = readIfExists(path.join(root, doc));
    if (text === undefined) {
      problems.push(`${doc} is missing`);
      continue;
    }
    for (const target of extractRelativeLinks(text)) {
      if (!existsSync(path.resolve(root, path.dirname(doc), target))) {
        problems.push(`${doc} links to missing file: ${target}`);
      }
    }
  }
}

function checkSpecs(root: string, problems: string[]): void {
  const specsDir = path.join(root, ".kiro", "specs");
  const index = readIfExists(path.join(specsDir, "README.md")) ?? "";
  if (!existsSync(specsDir)) return;
  const specDirs = readdirSync(specsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  for (const name of specDirs) {
    for (const file of SPEC_FILES) {
      if (!existsSync(path.join(specsDir, name, file))) {
        problems.push(`.kiro/specs/${name}/${file} is missing`);
      }
    }
    if (!index.includes(`| ${name.slice(0, 2)} |`)) {
      problems.push(`.kiro/specs/README.md does not list spec ${name}`);
    }
  }
}

export function checkDocs(root: string): string[] {
  const problems: string[] = [];
  checkLinks(root, problems);
  checkSpecs(root, problems);
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(import.meta.dirname, "..");
  const problems = checkDocs(root);
  for (const problem of problems) console.error(`docs:check ${problem}`);
  if (problems.length === 0) console.log("docs:check ok");
  process.exitCode = problems.length === 0 ? 0 : 1;
}
