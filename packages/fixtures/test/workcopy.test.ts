import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadFixture } from "../src/loader.ts";
import { FIXTURES_DATA_ROOT } from "../src/paths.ts";
import { createWorkCopy, resetWorkCopy } from "../src/workcopy.ts";
import { hashTree, makeTempDir, removeDir } from "./helpers.ts";

let base: string;

beforeEach(() => {
  base = makeTempDir();
});
afterEach(() => removeDir(base));

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
}

describe("createWorkCopy", () => {
  it("writes every fixture file under base/<id>, with .kiro in place of dot-kiro", () => {
    const copy = unwrap(createWorkCopy("unsafe-mcp", base));
    expect(copy.root).toBe(path.join(base, "unsafe-mcp"));
    for (const file of unwrap(loadFixture("unsafe-mcp"))) {
      expect(readFileSync(path.join(copy.root, file.path), "utf8")).toBe(file.content);
    }
  });

  it("returns UNKNOWN_FIXTURE and writes nothing for an unknown ID", () => {
    const result = createWorkCopy("../escape", base);
    expect(!result.ok && result.error.code).toBe("UNKNOWN_FIXTURE");
  });

  it("refuses a symlinked work-copy root", () => {
    const source = path.join(base, "source");
    mkdirSync(source);
    const linked = path.join(base, "unsafe-mcp");
    symlinkSync(source, linked);
    const result = createWorkCopy("unsafe-mcp", base);
    expect(!result.ok && result.error.code).toBe("PATH_REJECTED");
  });

  it("leaves the original fixture files unchanged", () => {
    const before = hashTree(FIXTURES_DATA_ROOT);
    const copy = unwrap(createWorkCopy("unsafe-mcp", base));
    writeFileSync(path.join(copy.root, ".kiro", "settings", "mcp.json"), "{}");
    expect(hashTree(FIXTURES_DATA_ROOT)).toBe(before);
  });
});

describe("resetWorkCopy", () => {
  it("restores edited files and removes added ones", () => {
    const copy = unwrap(createWorkCopy("unsafe-mcp", base));
    const clean = hashTree(copy.root);
    writeFileSync(path.join(copy.root, ".kiro", "settings", "mcp.json"), "{}");
    mkdirSync(path.join(copy.root, "extra"));
    writeFileSync(path.join(copy.root, "extra", "note.txt"), "x");
    expect(hashTree(copy.root)).not.toBe(clean);

    unwrap(resetWorkCopy(copy, base));
    expect(hashTree(copy.root)).toBe(clean);
  });

  it("refuses a forged root and deletes nothing", () => {
    const victim = path.join(base, "victim");
    mkdirSync(victim);
    writeFileSync(path.join(victim, "keep.txt"), "keep");
    const result = resetWorkCopy({ id: "unsafe-mcp", root: victim }, base);
    expect(!result.ok && result.error.code).toBe("PATH_REJECTED");
    expect(readFileSync(path.join(victim, "keep.txt"), "utf8")).toBe("keep");
  });

  it("refuses an unknown fixture ID", () => {
    const result = resetWorkCopy({ id: "nope" as never, root: path.join(base, "nope") }, base);
    expect(!result.ok && result.error.code).toBe("UNKNOWN_FIXTURE");
  });
});
