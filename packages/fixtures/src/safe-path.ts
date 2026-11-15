import { realpathSync } from "node:fs";
import path from "node:path";
import type { FixtureError } from "./errors.ts";
import { checkRelative, pathRejected } from "./relative-path.ts";
import { ok, type Result } from "./result.ts";

export { checkRelative, pathRejected };

export function isInside(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

export function resolveSafe(
  root: string,
  relative: string,
): Result<string, FixtureError> {
  const lexical = checkRelative(relative);
  if (!lexical.ok) return lexical;
  try {
    const realRoot = realpathSync(root);
    const target = realpathSync(path.resolve(realRoot, relative));
    return isInside(realRoot, target)
      ? ok(target)
      : pathRejected(relative, "symlink-escape");
  } catch {
    return pathRejected(relative, "not-found");
  }
}
