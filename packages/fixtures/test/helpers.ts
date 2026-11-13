import { createHash } from "node:crypto";
import { lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export function makeTempDir(prefix = "gravescan-test-"): string {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function listFiles(root: string, dir = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = dir === "" ? entry.name : `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...listFiles(root, relative));
    else found.push(relative);
  }
  return found.sort();
}

export function hashTree(root: string): string {
  const hash = createHash("sha256");
  for (const relative of listFiles(root)) {
    const full = path.join(root, relative);
    hash.update(relative);
    hash.update("\0");
    hash.update(lstatSync(full).isSymbolicLink() ? "symlink" : readFileSync(full));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function canCreateSymlinks(): boolean {
  const dir = makeTempDir();
  try {
    symlinkSync(dir, path.join(dir, "probe"));
    return true;
  } catch {
    return false;
  } finally {
    removeDir(dir);
  }
}
