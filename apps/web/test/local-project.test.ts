import { describe, expect, it } from "vitest";
import { LOCAL_LIMITS, planLocalImport, validateLocalFiles } from "../src/local-project.ts";

const entry = (path: string, size = 10) => ({ path, size });

describe("planLocalImport", () => {
  it("keeps only text files under the shallowest .kiro folder", () => {
    const plan = planLocalImport([
      entry("repo/.kiro/settings/mcp.json"),
      entry("repo/.kiro/steering/rules.md"),
      entry("repo/.kiro/hooks/logo.png"),
      entry("repo/src/index.ts"),
      entry("repo/packages/a/.kiro/settings/mcp.json"),
      entry("repo/.kiro/skills/x/node_modules/pkg/readme.md"),
    ]);
    expect(plan.ok && plan.accepted).toEqual([
      { index: 0, path: ".kiro/settings/mcp.json" },
      { index: 1, path: ".kiro/steering/rules.md" },
    ]);
  });

  it("accepts the .kiro folder itself and Windows separators", () => {
    expect(planLocalImport([entry(".kiro/settings/mcp.json")]).ok).toBe(true);
    const plan = planLocalImport([entry("repo\\.kiro\\agents\\a.json")]);
    expect(plan.ok && plan.accepted[0]?.path).toBe(".kiro/agents/a.json");
  });

  it("skips oversized files and reports them", () => {
    const plan = planLocalImport([entry("r/.kiro/a.md"), entry("r/.kiro/big.json", LOCAL_LIMITS.maxFileBytes + 1)]);
    expect(plan.ok && plan.tooLarge).toEqual([".kiro/big.json"]);
  });

  it("rejects folders without .kiro, with too many files, or too much text", () => {
    expect(planLocalImport([entry("repo/README.md")])).toMatchObject({ ok: false, code: "NO_KIRO_FOLDER" });
    expect(planLocalImport([entry("repo/.kiro/logo.png")])).toMatchObject({ ok: false, code: "NO_KIRO_FOLDER" });
    const many = Array.from({ length: LOCAL_LIMITS.maxFiles + 1 }, (_, index) => entry(`r/.kiro/${index}.md`));
    expect(planLocalImport(many)).toMatchObject({ ok: false, code: "TOO_MANY_FILES" });
    const heavy = Array.from({ length: 6 }, (_, index) => entry(`r/.kiro/${index}.md`, LOCAL_LIMITS.maxFileBytes));
    expect(planLocalImport(heavy)).toMatchObject({ ok: false, code: "TOO_LARGE" });
  });
});

describe("validateLocalFiles", () => {
  it("accepts .kiro text files and sorts them", () => {
    const result = validateLocalFiles([{ path: ".kiro/b.md", content: "b" }, { path: ".kiro/a.json", content: "{}" }]);
    expect(result.ok && result.files.map((file) => file.path)).toEqual([".kiro/a.json", ".kiro/b.md"]);
  });

  it.each([
    ["not an array", "nope"],
    ["an empty list", []],
    ["a path outside .kiro", [{ path: "src/a.json", content: "" }]],
    ["traversal", [{ path: ".kiro/../etc/passwd.txt", content: "" }]],
    ["an absolute path", [{ path: "/.kiro/a.json", content: "" }]],
    ["a binary extension", [{ path: ".kiro/a.exe", content: "" }]],
    ["non-string content", [{ path: ".kiro/a.json", content: 1 }]],
    ["a duplicate path", [{ path: ".kiro/a.json", content: "" }, { path: ".kiro/a.json", content: "" }]],
    ["an oversized file", [{ path: ".kiro/a.json", content: "x".repeat(LOCAL_LIMITS.maxFileBytes + 1) }]],
  ])("rejects %s", (_, input) => {
    expect(validateLocalFiles(input).ok).toBe(false);
  });
});
