import { lstatSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { FixtureError } from "./errors.ts";
import type { FixtureFile } from "./loader.ts";
import { PROJECT_ROOT } from "./paths.ts";
import { ok, type Err, type Result } from "./result.ts";
import { pathRejected } from "./safe-path.ts";

const SCANNED_EXTENSIONS = new Set([".json", ".md", ".yaml", ".yml", ".txt"]);
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_FILES = 500;

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Reads the project's own .kiro/ only. The root is fixed by the package location, never by user input.
export function loadProjectKiro(projectRoot: string = PROJECT_ROOT): Result<FixtureFile[], FixtureError> {
  const files: FixtureFile[] = [];

  function visit(relative: string): Err<FixtureError> | undefined {
    const absolute = path.join(projectRoot, relative);
    let entries;
    try {
      entries = readdirSync(absolute, { withFileTypes: true });
    } catch {
      return pathRejected(relative, "not-found");
    }
    for (const entry of entries) {
      const child = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) return pathRejected(child, "symlink-escape");
      if (entry.isDirectory()) {
        const failure = visit(child);
        if (failure) return failure;
        continue;
      }
      if (!entry.isFile() || !SCANNED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
      if (files.length >= MAX_FILES) return pathRejected(child, "too-large");
      const target = path.join(projectRoot, child);
      if (lstatSync(target).size > MAX_FILE_BYTES) return pathRejected(child, "too-large");
      files.push({ path: child, content: readFileSync(target, "utf8") });
    }
    return undefined;
  }

  const failure = visit(".kiro");
  return failure ?? ok(files.sort((a, b) => compare(a.path, b.path)));
}
