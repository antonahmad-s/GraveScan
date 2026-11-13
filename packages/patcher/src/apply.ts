import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  checkRelative,
  isInside,
  readWorkCopy,
  type Result,
  type WorkCopy,
} from "@gravescan/fixtures";
import type { Patch, PatchApplyResult, PatchError } from "./schemas.ts";

function error(code: PatchError["code"], file: string): Result<PatchApplyResult, PatchError> {
  if (code === "PATCH_PATH_REJECTED") return { ok: false, error: { code, file } };
  if (code === "PATCH_CONFLICT") return { ok: false, error: { code, file } };
  return { ok: false, error: { code: "WORK_COPY_INVALID", detail: file } };
}

export function applyPatch(
  copy: WorkCopy,
  patch: Patch,
  base?: string,
): Result<PatchApplyResult, PatchError> {
  const loaded = readWorkCopy(copy, base);
  if (!loaded.ok) return error("WORK_COPY_INVALID", loaded.error.code);
  if (!checkRelative(patch.file).ok) return error("PATCH_PATH_REJECTED", patch.file);

  const root = path.resolve(copy.root);
  const target = path.resolve(root, patch.file);
  if (!isInside(root, target)) return error("PATCH_PATH_REJECTED", patch.file);

  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current === patch.after) return { ok: true, value: { applied: false, patch } };
  if (current !== patch.before) return error("PATCH_CONFLICT", patch.file);

  try {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, patch.after, "utf8");
    return { ok: true, value: { applied: true, patch } };
  } catch {
    return error("WORK_COPY_INVALID", patch.file);
  }
}
