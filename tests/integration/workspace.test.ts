import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..", "..");
const PACKAGES = ["scanner", "simulator", "patcher", "reporting", "fixtures", "cli", "web"];

describe("workspace", () => {
  it("lists apps and packages in pnpm-workspace.yaml", () => {
    const text = readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");
    expect(text).toContain("apps/*");
    expect(text).toContain("packages/*");
  });

  it.each(PACKAGES)("@gravescan/%s resolves and imports", async (name) => {
    const module = await import(`@gravescan/${name}`);
    expect(typeof module).toBe("object");
  });

  it.each(["scanner", "simulator", "patcher", "reporting", "web"])(
    "@gravescan/%s exposes its package name",
    async (name) => {
      const module = await import(`@gravescan/${name}`);
      expect(module.PACKAGE).toBe(`@gravescan/${name}`);
    },
  );
});
