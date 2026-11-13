import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { FixtureError } from "./errors.ts";
import { FIXTURE_IDS, isFixtureId, type FixtureId } from "./ids.ts";
import { FIXTURES_DATA_ROOT } from "./paths.ts";
import { err, ok, type Err, type Result } from "./result.ts";
import { pathRejected, resolveSafe } from "./safe-path.ts";

export type FixtureFile = { readonly path: string; readonly content: string };

const CONFIG_DIR = "dot-kiro";

export function listFixtures(): FixtureId[] {
  return [...FIXTURE_IDS];
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Fixtures keep their Kiro config in dot-kiro/ so Kiro never loads it as real config.
function exposedPath(relative: string): string {
  return relative === CONFIG_DIR || relative.startsWith(`${CONFIG_DIR}/`)
    ? `.kiro${relative.slice(CONFIG_DIR.length)}`
    : relative;
}

// Fixtures may not contain symlinks, so a link is reported as an escape.
function collectFiles(
  root: string,
  dir: string,
  into: string[],
): Err<FixtureError> | undefined {
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = dir === "" ? entry.name : `${dir}/${entry.name}`;
    if (entry.isSymbolicLink()) return pathRejected(relative, "symlink-escape");
    if (entry.isDirectory()) {
      const failure = collectFiles(root, relative, into);
      if (failure) return failure;
    } else if (entry.isFile()) {
      into.push(relative);
    }
  }
  return undefined;
}

export function loadFixture(id: string): Result<FixtureFile[], FixtureError> {
  if (!isFixtureId(id)) return err<FixtureError>({ code: "UNKNOWN_FIXTURE", id });
  const root = path.join(FIXTURES_DATA_ROOT, id);
  try {
    const relatives: string[] = [];
    const failure = collectFiles(root, "", relatives);
    if (failure) return failure;
    const files: FixtureFile[] = [];
    for (const relative of relatives) {
      const safe = resolveSafe(root, relative);
      if (!safe.ok) return safe;
      files.push({
        path: exposedPath(relative),
        content: readFileSync(safe.value, "utf8"),
      });
    }
    return ok(files.sort((a, b) => compare(a.path, b.path)));
  } catch {
    return pathRejected(id, "not-found");
  }
}
