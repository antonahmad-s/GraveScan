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

// Lexical rules only, so they also apply to paths that do not exist yet and run without node:path.
export function checkRelative(relative: string): Result<string, FixtureError> {
  if (relative === "") return pathRejected(relative, "not-found");
  if (relative.includes("\0")) return pathRejected(relative, "traversal");
  if (LEADING_SEPARATOR.test(relative) || WINDOWS_DRIVE.test(relative)) {
    return pathRejected(relative, "absolute");
  }
  if (relative.split(SEPARATORS).includes("..")) {
    return pathRejected(relative, "traversal");
  }
  return ok(relative);
}
