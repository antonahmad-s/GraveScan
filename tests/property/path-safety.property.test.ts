import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkRelative, resolveSafe } from "../../packages/fixtures/src/safe-path.ts";
import {
  canCreateSymlinks,
  makeTempDir,
  removeDir,
} from "../../packages/fixtures/test/helpers.ts";

const symlinksWork = canCreateSymlinks();
let sandbox: string;
let root: string;
let linkCounter = 0;

beforeAll(() => {
  sandbox = makeTempDir();
  root = path.join(sandbox, "root");
  mkdirSync(root);
  writeFileSync(path.join(sandbox, "outside.txt"), "secret");
});

afterAll(() => removeDir(sandbox));

const safeName = fc.stringMatching(/^[a-z0-9_-]{1,8}$/);
const separator = fc.constantFrom("/", "\\");

const traversalPath = fc
  .tuple(fc.array(safeName, { maxLength: 3 }), fc.array(safeName, { maxLength: 3 }), separator)
  .map(([before, after, sep]) => [...before, "..", ...after].join(sep));

const absolutePath = fc
  .tuple(fc.constantFrom("/", "\\", "C:\\", "c:/", "D:"), fc.string({ maxLength: 20 }))
  .map(([prefix, rest]) => `${prefix}${rest}`);

const nulPath = fc
  .tuple(fc.string({ maxLength: 10 }), fc.string({ maxLength: 10 }))
  .map(([a, b]) => `${a}\0${b}`);

const hostilePath = fc.oneof(traversalPath, absolutePath, nulPath);

function isPathRejected(result: ReturnType<typeof resolveSafe>): boolean {
  return !result.ok && result.error.code === "PATH_REJECTED";
}

describe("path safety properties", () => {
  it("rejects every hostile path", () => {
    fc.assert(
      fc.property(hostilePath, (candidate) => {
        expect(isPathRejected(checkRelative(candidate))).toBe(true);
        expect(isPathRejected(resolveSafe(root, candidate))).toBe(true);
      }),
    );
  });

  it("accepts plain relative names lexically", () => {
    fc.assert(
      fc.property(fc.array(safeName, { minLength: 1, maxLength: 4 }), (segments) => {
        const candidate = segments.join("/");
        expect(checkRelative(candidate)).toEqual({ ok: true, value: candidate });
      }),
    );
  });

  it.skipIf(!symlinksWork)("rejects any symlink that points outside the root", () => {
    fc.assert(
      fc.property(safeName, (name) => {
        const linkName = `link-${linkCounter++}-${name}`;
        symlinkSync(path.join(sandbox, "outside.txt"), path.join(root, linkName));
        const result = resolveSafe(root, linkName);
        expect(isPathRejected(result)).toBe(true);
      }),
      { numRuns: 25 },
    );
  });
});
