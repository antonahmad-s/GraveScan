import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeTempDir, removeDir } from "../packages/fixtures/test/helpers.ts";
import { checkRepo } from "./repo-check.ts";

let root: string;

function write(relative: string, content: string): void {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeEach(() => {
  root = makeTempDir();
  execFileSync("git", ["init", "-q", root]);
  write("LICENSE", "MIT License\n");
  write(".gitignore", "node_modules/\n");
  for (const sub of ["specs", "steering", "hooks"]) write(`.kiro/${sub}/a.md`, "x");
});
afterEach(() => removeDir(root));

describe("checkRepo", () => {
  it("passes a ready repository", () => {
    expect(checkRepo(root)).toEqual([]);
  });

  it("reports a missing .kiro directory", () => {
    removeDir(path.join(root, ".kiro"));
    expect(checkRepo(root)).toEqual([".kiro/ is missing at the repository root"]);
  });

  it("reports an empty required subfolder", () => {
    removeDir(path.join(root, ".kiro", "hooks"));
    expect(checkRepo(root)).toEqual([".kiro/hooks/ is missing or empty"]);
  });

  it("reports .kiro when .gitignore ignores it", () => {
    write(".gitignore", ".kiro/\n");
    const problems = checkRepo(root);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.endsWith("is ignored by git"))).toBe(true);
  });

  it("reports a subfolder that .gitignore ignores", () => {
    write(".gitignore", "steering/\n");
    expect(checkRepo(root)).toContain(".kiro/steering is ignored by git");
  });

  it("reports a missing or unrecognized LICENSE", () => {
    removeDir(path.join(root, "LICENSE"));
    expect(checkRepo(root)).toEqual(["LICENSE is missing"]);
    write("LICENSE", "All rights reserved\n");
    expect(checkRepo(root)).toEqual(["LICENSE is not a recognized open source license"]);
  });
});
