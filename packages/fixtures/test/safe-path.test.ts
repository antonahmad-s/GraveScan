import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkRelative, isInside, resolveSafe } from "../src/safe-path.ts";
import { canCreateSymlinks, makeTempDir, removeDir } from "./helpers.ts";

const symlinksWork = canCreateSymlinks();
let sandbox: string;
let root: string;

beforeAll(() => {
  sandbox = makeTempDir();
  root = path.join(sandbox, "root");
  mkdirSync(path.join(root, "inner"), { recursive: true });
  writeFileSync(path.join(root, "inner", "ok.txt"), "ok");
  writeFileSync(path.join(sandbox, "outside.txt"), "secret");
  if (symlinksWork) {
    symlinkSync(path.join(sandbox, "outside.txt"), path.join(root, "link-file"));
    symlinkSync(sandbox, path.join(root, "link-dir"));
    symlinkSync(path.join(root, "inner", "ok.txt"), path.join(root, "link-inside"));
  }
});

afterAll(() => removeDir(sandbox));

function reasonOf(result: ReturnType<typeof resolveSafe>): string | undefined {
  return !result.ok && result.error.code === "PATH_REJECTED"
    ? result.error.reason
    : undefined;
}

describe("checkRelative", () => {
  it.each([
    ["../x", "traversal"],
    ["a/../../b", "traversal"],
    ["a\\..\\b", "traversal"],
    ["a\0b", "traversal"],
    ["/etc/passwd", "absolute"],
    ["\\windows\\system32", "absolute"],
    ["C:\\Users", "absolute"],
    ["c:relative", "absolute"],
    ["", "not-found"],
  ])("rejects %j as %s", (input, reason) => {
    const result = checkRelative(input);
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe(reason);
  });

  it.each(["a", "a/b.txt", "dir/.hidden", "..name", "name.."])(
    "accepts %j",
    (input) => {
      expect(checkRelative(input)).toEqual({ ok: true, value: input });
    },
  );
});

describe("resolveSafe", () => {
  it("resolves a file inside the root", () => {
    const result = resolveSafe(root, "inner/ok.txt");
    expect(result.ok).toBe(true);
  });

  it("reports a missing file as not-found", () => {
    expect(reasonOf(resolveSafe(root, "inner/missing.txt"))).toBe("not-found");
  });

  it("rejects traversal before touching the filesystem", () => {
    expect(reasonOf(resolveSafe(root, "../outside.txt"))).toBe("traversal");
  });

  it.skipIf(!symlinksWork)("rejects a symlink to a file outside the root", () => {
    expect(reasonOf(resolveSafe(root, "link-file"))).toBe("symlink-escape");
  });

  it.skipIf(!symlinksWork)("rejects a path through a symlinked directory", () => {
    expect(reasonOf(resolveSafe(root, "link-dir/outside.txt"))).toBe("symlink-escape");
  });

  it.skipIf(!symlinksWork)("accepts a symlink that stays inside the root", () => {
    expect(resolveSafe(root, "link-inside").ok).toBe(true);
  });
});

describe("isInside", () => {
  it("treats the base itself and children as inside", () => {
    expect(isInside("/a/b", "/a/b")).toBe(true);
    expect(isInside("/a/b", "/a/b/c")).toBe(true);
  });

  it("treats siblings and parents as outside", () => {
    expect(isInside("/a/b", "/a/bc")).toBe(false);
    expect(isInside("/a/b", "/a")).toBe(false);
    expect(isInside("/a/b", "/x")).toBe(false);
  });
});
