import { checkRelative, type FixtureFile, type Result } from "@gravescan/fixtures/browser";
import type { Patch, PatchError } from "./schemas.ts";

export type MemoryApplyResult = {
  readonly applied: boolean;
  readonly files: FixtureFile[];
};

function compare(a: FixtureFile, b: FixtureFile): number {
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}

// Same compare-and-set rules as the on-disk applyPatch, applied to an in-memory copy.
export function applyPatchToFiles(
  files: readonly FixtureFile[],
  patch: Patch,
): Result<MemoryApplyResult, PatchError> {
  if (!checkRelative(patch.file).ok) return { ok: false, error: { code: "PATCH_PATH_REJECTED", file: patch.file } };
  const current = files.find((file) => file.path === patch.file)?.content ?? "";
  if (current === patch.after) return { ok: true, value: { applied: false, files: [...files] } };
  if (current !== patch.before) return { ok: false, error: { code: "PATCH_CONFLICT", file: patch.file } };
  const next = files.filter((file) => file.path !== patch.file);
  next.push({ path: patch.file, content: patch.after });
  return { ok: true, value: { applied: true, files: next.sort(compare) } };
}
