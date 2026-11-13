import { describe, expect, it } from "vitest";
import { listFixtures, loadFixture, type FixtureFile } from "../src/loader.ts";

const SECRET_ASSIGNMENT =
  /"?[A-Za-z0-9_]*(?:token|secret|password|api_?key)[A-Za-z0-9_]*"?\s*[:=]\s*"?([A-Za-z0-9_\-./+]{6,})/gi;
const KNOWN_TOKEN_SHAPES = [/AKIA[0-9A-Z]{16}/, /ghp_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/];

function load(id: string): FixtureFile[] {
  const result = loadFixture(id);
  if (!result.ok) throw new Error(`could not load ${id}: ${result.error.code}`);
  return result.value;
}

function secretLikeValues(files: FixtureFile[]): string[] {
  const values: string[] = [];
  for (const file of files) {
    for (const match of file.content.matchAll(SECRET_ASSIGNMENT)) {
      if (match[1] !== undefined) values.push(match[1]);
    }
    for (const shape of KNOWN_TOKEN_SHAPES) {
      const found = shape.exec(file.content);
      if (found) values.push(found[0]);
    }
  }
  return values;
}

describe("listFixtures", () => {
  it("returns exactly the three fixtures, sorted", () => {
    expect(listFixtures()).toEqual([
      "steering-injection",
      "unbounded-hook",
      "unsafe-mcp",
    ]);
  });

  it("returns a copy that callers cannot use to change the list", () => {
    listFixtures().push("extra" as never);
    expect(listFixtures()).toHaveLength(3);
  });
});

describe("loadFixture", () => {
  it("returns UNKNOWN_FIXTURE for an unknown ID", () => {
    expect(loadFixture("nope")).toEqual({
      ok: false,
      error: { code: "UNKNOWN_FIXTURE", id: "nope" },
    });
  });

  it("does not treat a traversal string as a fixture", () => {
    const result = loadFixture("../unsafe-mcp");
    expect(!result.ok && result.error.code).toBe("UNKNOWN_FIXTURE");
  });

  it.each(listFixtures())("%s returns files sorted by path", (id) => {
    const paths = load(id).map((file) => file.path);
    expect(paths).toEqual([...paths].sort());
    expect(paths.length).toBeGreaterThan(0);
  });

  it.each(listFixtures())("%s exposes dot-kiro as .kiro", (id) => {
    const paths = load(id).map((file) => file.path);
    expect(paths.some((p) => p.startsWith(".kiro/"))).toBe(true);
    expect(paths.some((p) => p.includes("dot-kiro"))).toBe(false);
  });

  it("gives unsafe-mcp a shell-capable, auto-approved tool and a canary token", () => {
    const files = load("unsafe-mcp");
    const mcp = files.find((file) => file.path === ".kiro/settings/mcp.json");
    expect(mcp).toBeDefined();
    const parsed = JSON.parse(mcp?.content ?? "{}");
    const server = parsed.mcpServers["shell-helper"];
    expect(server.autoApprove).toContain("run_command");
    expect(server.env.API_TOKEN).toBe("GRAVESCAN_CANARY_DO_NOT_USE_123");
  });
});

describe("fixture safety labels", () => {
  it.each(listFixtures())("%s has a README that labels it intentionally vulnerable", (id) => {
    const readme = load(id).find((file) => file.path === "README.md");
    expect(readme?.content.toLowerCase()).toContain("intentionally vulnerable");
  });

  it.each(listFixtures())("%s contains only canary secret-like tokens", (id) => {
    for (const value of secretLikeValues(load(id))) {
      expect(value.startsWith("GRAVESCAN_CANARY_")).toBe(true);
    }
  });

  it("detects a real-looking token, so the check above can fail", () => {
    const sample: FixtureFile = {
      path: "x.json",
      content: '{"API_TOKEN": "ghp_abcdefghijklmnopqrstuvwxyz0123"}',
    };
    expect(secretLikeValues([sample]).length).toBeGreaterThan(0);
  });
});
