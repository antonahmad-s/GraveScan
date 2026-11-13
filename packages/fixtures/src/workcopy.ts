import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { FixtureError } from "./errors.ts";
import { isFixtureId, type FixtureId } from "./ids.ts";
import { loadFixture } from "./loader.ts";
import { DEFAULT_WORK_BASE } from "./paths.ts";
import type { FixtureFile } from "./loader.ts";
import { err, ok, type Err, type Result } from "./result.ts";
import { checkRelative, isInside, pathRejected } from "./safe-path.ts";

export type WorkCopy = { readonly id: FixtureId; readonly root: string };

function isSymlink(target: string): boolean {
  try {
    return lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}

function materialize(
  id: FixtureId,
  base: string,
): Result<WorkCopy, FixtureError> {
  const loaded = loadFixture(id);
  if (!loaded.ok) return loaded;

  const root = path.join(base, id);
  if (root === base || !isInside(base, root)) {
    return pathRejected(root, "traversal");
  }
  if (isSymlink(root)) return pathRejected(root, "symlink-escape");

  try {
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    for (const file of loaded.value) {
      const lexical = checkRelative(file.path);
      if (!lexical.ok) return lexical;
      const destination = path.join(root, file.path);
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, file.content, "utf8");
    }
    return ok({ id, root });
  } catch {
    return pathRejected(root, "not-found");
  }
}

export function createWorkCopy(
  id: string,
  base: string = DEFAULT_WORK_BASE,
): Result<WorkCopy, FixtureError> {
  if (!isFixtureId(id)) return err<FixtureError>({ code: "UNKNOWN_FIXTURE", id });
  return materialize(id, path.resolve(base));
}

export function readWorkCopy(
  copy: WorkCopy,
  base: string = DEFAULT_WORK_BASE,
): Result<FixtureFile[], FixtureError> {
  if (!isFixtureId(copy.id)) return err<FixtureError>({ code: "UNKNOWN_FIXTURE", id: copy.id });
  const resolvedBase = path.resolve(base);
  const root = path.join(resolvedBase, copy.id);
  if (path.resolve(copy.root) !== root || !isInside(resolvedBase, root)) {
    return pathRejected(copy.root, "traversal");
  }
  if (isSymlink(root)) return pathRejected(root, "symlink-escape");

  const files: FixtureFile[] = [];
  function visit(dir: string): Err<FixtureError> | undefined {
    try {
      for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const relative = dir === "" ? entry.name : `${dir}/${entry.name}`;
        const target = path.join(root, relative);
        if (entry.isSymbolicLink()) return pathRejected(relative, "symlink-escape");
        if (entry.isDirectory()) {
          const failure = visit(relative);
          if (failure) return failure;
        } else if (entry.isFile()) {
          files.push({ path: relative, content: readFileSync(target, "utf8") });
        }
      }
    } catch {
      return pathRejected(copy.root, "not-found");
    }
    return undefined;
  }

  const failure = visit("");
  return failure ?? ok(files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)));
}

// The copy's root is recomputed from its ID, so a forged root is never deleted.
export function resetWorkCopy(
  copy: WorkCopy,
  base: string = DEFAULT_WORK_BASE,
): Result<void, FixtureError> {
  if (!isFixtureId(copy.id)) {
    return err<FixtureError>({ code: "UNKNOWN_FIXTURE", id: copy.id });
  }
  const resolvedBase = path.resolve(base);
  if (path.resolve(copy.root) !== path.join(resolvedBase, copy.id)) {
    return pathRejected(copy.root, "traversal");
  }
  const result = materialize(copy.id, resolvedBase);
  return result.ok ? ok(undefined) : result;
}
