import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { FIXTURE_IDS, isFixtureId } from "../../packages/fixtures/src/ids.ts";
import { loadFixture } from "../../packages/fixtures/src/loader.ts";

describe("fixture loader properties", () => {
  it("returns the same sorted files on every load", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...FIXTURE_IDS),
        fc.integer({ min: 2, max: 5 }),
        (id, times) => {
          const first = loadFixture(id);
          expect(first.ok).toBe(true);
          if (!first.ok) return;
          const paths = first.value.map((file) => file.path);
          expect(paths).toEqual([...paths].sort());
          for (let i = 1; i < times; i++) {
            expect(loadFixture(id)).toEqual(first);
          }
        },
      ),
    );
  });

  it("answers UNKNOWN_FIXTURE for any string that is not a fixture ID", () => {
    fc.assert(
      fc.property(fc.string(), (candidate) => {
        fc.pre(!isFixtureId(candidate));
        const result = loadFixture(candidate);
        expect(!result.ok && result.error.code).toBe("UNKNOWN_FIXTURE");
      }),
    );
  });
});
