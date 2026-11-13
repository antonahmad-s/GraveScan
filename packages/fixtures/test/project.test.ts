import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadProjectKiro } from "../src/project.ts";
import { canCreateSymlinks, makeTempDir, removeDir } from "./helpers.ts";

let root: string;

function write(relative: string, content: string): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => { root = makeTempDir(); });
afterEach(() => removeDir(root));

describe("loadProjectKiro", () => {
  it("reads text config under .kiro, sorted, and skips other extensions", () => {
    write(".kiro/steering/b.md", "b");
    write(".kiro/hooks/a.json", "{}");
    write(".kiro/skills/x/helper.py", "print(1)");
    write("outside.md", "not part of .kiro");
    expect(loadProjectKiro(root)).toEqual({
      ok: true,
      value: [
        { path: ".kiro/hooks/a.json", content: "{}" },
        { path: ".kiro/steering/b.md", content: "b" },
      ],
    });
  });

  it("reports a missing .kiro directory", () => {
    const result = loadProjectKiro(root);
    expect(!result.ok && result.error).toEqual({ code: "PATH_REJECTED", path: ".kiro", reason: "not-found" });
  });

  it("rejects files larger than 1 MiB", () => {
    write(".kiro/steering/huge.md", "x".repeat(1024 * 1024 + 1));
    const result = loadProjectKiro(root);
    expect(!result.ok && result.error.code === "PATH_REJECTED" && result.error.reason).toBe("too-large");
  });

  it.skipIf(!canCreateSymlinks())("rejects a symlink inside .kiro", () => {
    write(".kiro/steering/a.md", "a");
    symlinkSync("/etc/hostname", path.join(root, ".kiro/steering/link.md"));
    const result = loadProjectKiro(root);
    expect(!result.ok && result.error.code === "PATH_REJECTED" && result.error.reason).toBe("symlink-escape");
  });
});
