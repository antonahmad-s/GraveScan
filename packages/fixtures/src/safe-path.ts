import { realpathSync } from "node:fs";
import path from "node:path";
import type { FixtureError, RejectionReason } from "./errors.ts";
import { err, ok, type Err, type Result } from "./result.ts";

const WINDOWS_DRIVE = /^[A-Za-z]:/;
const LEADING_SEPARATOR = /^[\\/]/;
const SEPARATORS = /[\\/]/;

export function pathRejected(
  target: string,
  reason: RejectionReason,
): Err<FixtureError> {
  return err<FixtureError>({ code: "PATH_REJECTED", path: target, reason });
}

export function isInside(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

// Lexical rules only, so they also apply to paths that do not exist yet.
export function checkRelative(relative: string): Result<string, FixtureError> {
  if (relative === "") return pathRejected(relative, "not-found");
  if (relative.includes("\0")) return pathRejected(relative, "traversal");
  if (
    path.isAbsolute(relative) ||
    LEADING_SEPARATOR.test(relative) ||
    WINDOWS_DRIVE.test(relative)
  ) {
    return pathRejected(relative, "absolute");
  }
  if (relative.split(SEPARATORS).includes("..")) {
    return pathRejected(relative, "traversal");
  }
  return ok(relative);
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
