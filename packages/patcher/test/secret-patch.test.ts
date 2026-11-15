import { describe, expect, it } from "vitest";
import { scanFiles } from "@gravescan/scanner/browser";
import { applyPatchToFiles, generatePatchForFiles, verifyPatchFiles } from "../src/browser.ts";

// A real-world shaped config: an environment reference comes before the committed value.
const mcp = [
  "{",
  '  "mcpServers": {',
  '    "github": {',
  '      "command": "npx",',
  '      "env": { "OTHER_TOKEN": "${OTHER_TOKEN}" },',
  '      "tools": ["search"],',
  '      "headers": { "github-token": "abc123secretvalue" }',
  "    }",
  "  }",
  "}",
  "",
].join("\n");
const files = [
  { path: ".kiro/settings/mcp.json", content: mcp },
  { path: ".kiro/steering/sandbox-policy.md", content: "# Sandbox Policy\n" },
];

describe("GRAVE-009 patch on user configuration", () => {
  it("replaces the value on the finding's line with a variable named after its key", () => {
    const finding = scanFiles(files).findings.find((item) => item.ruleId === "GRAVE-009");
    expect(finding?.line).toBe(7);
    if (finding === undefined) throw new Error("missing finding");

    const patch = generatePatchForFiles(files, finding);
    if (!patch.ok) throw new Error(patch.error.code);
    expect(patch.value.after.split("\n")[6]).toBe('      "headers": { "github-token": "${GITHUB_TOKEN}" }');
    expect(patch.value.after.split("\n")[4]).toBe('      "env": { "OTHER_TOKEN": "${OTHER_TOKEN}" },');
    expect(patch.value.riskNote).toContain("GITHUB_TOKEN");

    const applied = applyPatchToFiles(files, patch.value);
    if (!applied.ok) throw new Error(applied.error.code);
    const verification = verifyPatchFiles(applied.value.files, patch.value);
    if (!verification.ok) throw new Error(verification.error.code);
    expect(verification.value.targetFindingPresent).toBe(false);
    expect(scanFiles(applied.value.files).findings.some((item) => item.ruleId === "GRAVE-009")).toBe(false);
  });
});
