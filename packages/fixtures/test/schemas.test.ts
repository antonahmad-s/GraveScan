import { describe, expect, it } from "vitest";
import { FixtureErrorSchema, FixtureIdSchema } from "../src/schemas.ts";

describe("FixtureIdSchema", () => {
  it("accepts known IDs and rejects others", () => {
    expect(FixtureIdSchema.safeParse("unsafe-mcp").success).toBe(true);
    expect(FixtureIdSchema.safeParse("other").success).toBe(false);
  });
});

describe("FixtureErrorSchema", () => {
  it("accepts both error shapes", () => {
    expect(FixtureErrorSchema.safeParse({ code: "UNKNOWN_FIXTURE", id: "x" }).success).toBe(true);
    expect(
      FixtureErrorSchema.safeParse({ code: "PATH_REJECTED", path: "../x", reason: "traversal" })
        .success,
    ).toBe(true);
  });

  it("rejects an unknown rejection reason", () => {
    expect(
      FixtureErrorSchema.safeParse({ code: "PATH_REJECTED", path: "x", reason: "other" }).success,
    ).toBe(false);
  });
});
