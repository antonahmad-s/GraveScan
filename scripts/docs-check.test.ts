import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeTempDir, removeDir } from "../packages/fixtures/test/helpers.ts";
import { checkDocs, extractRelativeLinks } from "./docs-check.ts";

describe("extractRelativeLinks", () => {
  it("keeps relative targets and drops anchors", () => {
    expect(extractRelativeLinks("[a](docs/a.md#top) [b](B.md)")).toEqual(["docs/a.md", "B.md"]);
  });

  it("ignores URLs, anchors only, and fenced code", () => {
    const markdown = [
      "[x](https://example.com) [y](#section) [m](mailto:a@b.c)",
      "```",
      "[z](inside-code.md)",
      "```",
    ].join("\n");
    expect(extractRelativeLinks(markdown)).toEqual([]);
  });
});

describe("checkDocs", () => {
  let root: string;

  beforeEach(() => {
    root = makeTempDir();
    mkdirSync(path.join(root, ".kiro", "specs", "01-foundation"), { recursive: true });
    writeFileSync(path.join(root, "README.md"), "[guide](docs/guide.md)");
    mkdirSync(path.join(root, "docs"));
    writeFileSync(path.join(root, "docs", "guide.md"), "guide");
    writeFileSync(path.join(root, ".kiro", "specs", "README.md"), "| 01 | foundation |");
    for (const file of ["requirements.md", "design.md", "tasks.md"]) {
      writeFileSync(path.join(root, ".kiro", "specs", "01-foundation", file), "x");
    }
  });
  afterEach(() => removeDir(root));

  it("passes a consistent tree", () => {
    expect(checkDocs(root)).toEqual([]);
  });

  it("reports a broken README link", () => {
    writeFileSync(path.join(root, "README.md"), "[gone](docs/gone.md)");
    expect(checkDocs(root)).toEqual(["README.md links to missing file: docs/gone.md"]);
  });

  it("reports a spec with a missing file", () => {
    removeDir(path.join(root, ".kiro", "specs", "01-foundation", "tasks.md"));
    expect(checkDocs(root)).toEqual([".kiro/specs/01-foundation/tasks.md is missing"]);
  });

  it("reports a spec that the index does not list", () => {
    mkdirSync(path.join(root, ".kiro", "specs", "02-other"));
    for (const file of ["requirements.md", "design.md", "tasks.md"]) {
      writeFileSync(path.join(root, ".kiro", "specs", "02-other", file), "x");
    }
    expect(checkDocs(root)).toEqual([".kiro/specs/README.md does not list spec 02-other"]);
  });
});
