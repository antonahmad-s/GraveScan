import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FIXTURE_IDS, type FixtureId } from "../../packages/fixtures/src/ids.ts";
import { FIXTURES_DATA_ROOT } from "../../packages/fixtures/src/paths.ts";
import {
  createWorkCopy,
  resetWorkCopy,
  type WorkCopy,
} from "../../packages/fixtures/src/workcopy.ts";
import {
  hashTree,
  makeTempDir,
  removeDir,
} from "../../packages/fixtures/test/helpers.ts";

type Operation = { kind: "create" | "mutate" | "reset"; id: FixtureId };

const operations = fc.array(
  fc.record({
    kind: fc.constantFrom<Operation["kind"]>("create", "mutate", "reset"),
    id: fc.constantFrom(...FIXTURE_IDS),
  }),
  { maxLength: 8 },
);

let cleanBase: string;
const cleanHashes = new Map<FixtureId, string>();

beforeAll(() => {
  cleanBase = makeTempDir();
  for (const id of FIXTURE_IDS) {
    const created = createWorkCopy(id, cleanBase);
    if (!created.ok) throw new Error(`setup failed for ${id}`);
    cleanHashes.set(id, hashTree(created.value.root));
  }
});

afterAll(() => removeDir(cleanBase));

function apply(operation: Operation, base: string, copies: Map<FixtureId, WorkCopy>): void {
  const existing = copies.get(operation.id);
  if (operation.kind === "create" || existing === undefined) {
    const created = createWorkCopy(operation.id, base);
    if (created.ok) copies.set(operation.id, created.value);
    return;
  }
  if (operation.kind === "mutate") {
    mkdirSync(path.join(existing.root, "scratch"), { recursive: true });
    writeFileSync(path.join(existing.root, "scratch", "note.txt"), "changed");
    return;
  }
  expect(resetWorkCopy(existing, base).ok).toBe(true);
  expect(hashTree(existing.root)).toBe(cleanHashes.get(operation.id));
}

describe("work copy isolation properties", () => {
  it("never changes the original fixture files", () => {
    const originalHash = hashTree(FIXTURES_DATA_ROOT);
    fc.assert(
      fc.property(operations, (sequence) => {
        const base = makeTempDir();
        try {
          const copies = new Map<FixtureId, WorkCopy>();
          for (const operation of sequence) apply(operation, base, copies);
          expect(hashTree(FIXTURES_DATA_ROOT)).toBe(originalHash);
        } finally {
          removeDir(base);
        }
      }),
      { numRuns: 30 },
    );
  });
});
