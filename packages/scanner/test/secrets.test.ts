import { describe, expect, it } from "vitest";
import { environmentName, REDACTED, redactDeep, redactSecrets, scanFiles, secretAssignments } from "../src/index.ts";

// Token-shaped strings are assembled at runtime so secret scanners do not flag this test file.
const fake = {
  github: `gh${"p_"}${"A1b2".repeat(9)}`,
  githubPat: `github${"_pat_"}${"x9".repeat(15)}`,
  openai: `sk${"-"}${"proj".repeat(6)}`,
  aws: `AK${"IA"}${"ABCDEFGHIJKLMNOP"}`,
  slack: `xo${"xb-"}${"1234567890-abc"}`,
  jwt: `ey${"J"}hbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlLXZhbHVl`,
  pem: `-----BEGIN ${"RSA PRIVATE"} KEY-----\nMIIEow\n-----END ${"RSA PRIVATE"} KEY-----`,
};

describe("secretAssignments", () => {
  it("finds quoted key/value assignments whose key names a secret", () => {
    expect(secretAssignments('    "GITHUB_TOKEN": "abc123xyz"').map((item) => [item.key, item.value])).toEqual([["GITHUB_TOKEN", "abc123xyz"]]);
    expect(secretAssignments("db_password = 'hunter22'").map((item) => item.key)).toEqual(["db_password"]);
    expect(secretAssignments('"apiKey": "k-123456", "client_secret": "s-654321"').map((item) => item.key)).toEqual(["apiKey", "client_secret"]);
  });

  it("ignores environment references, short values, and keys that do not name a secret", () => {
    expect(secretAssignments('"API_TOKEN": "${API_TOKEN}"')).toEqual([]);
    expect(secretAssignments('"token": "abc"')).toEqual([]);
    expect(secretAssignments('"command": "node server.js"')).toEqual([]);
  });

  it("reports the value position so a patch can replace exactly that value", () => {
    const line = '  "token": "abcdef123"';
    const [item] = secretAssignments(line);
    expect(item && line.slice(item.valueIndex, item.valueIndex + item.value.length)).toBe("abcdef123");
  });
});

describe("environmentName", () => {
  it("turns a key into a valid variable name", () => {
    expect(environmentName("github-token")).toBe("GITHUB_TOKEN");
    expect(environmentName("apiKey")).toBe("APIKEY");
    expect(environmentName("1password")).toBe("SECRET_1PASSWORD");
  });
});

describe("redactSecrets", () => {
  it("redacts assignment values and keeps the key", () => {
    expect(redactSecrets('"API_TOKEN": "GRAVESCAN_CANARY_DO_NOT_USE_123"')).toBe(`"API_TOKEN": "${REDACTED}"`);
    expect(redactSecrets('"API_TOKEN": "${API_TOKEN}"')).toBe('"API_TOKEN": "${API_TOKEN}"');
  });

  it.each(Object.entries(fake))("redacts a %s credential without a key name", (_, token) => {
    const redacted = redactSecrets(`use ${token} here`);
    expect(redacted).not.toContain(token);
    expect(redacted).toContain(REDACTED);
  });

  it("redacts bearer headers and URL credentials", () => {
    expect(redactSecrets("Authorization: Bearer abcdefghijklmnop1234")).toBe(`Authorization: ${REDACTED}`);
    expect(redactSecrets("postgres://admin:s3cret@db.local/app")).toBe(`postgres://${REDACTED}@db.local/app`);
  });

  it("leaves ordinary configuration untouched", () => {
    const text = '{ "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem"], "url": "https://example.com/mcp" }';
    expect(redactSecrets(text)).toBe(text);
  });

  it("redacts every string inside nested values", () => {
    expect(redactDeep({ a: [`x ${fake.github}`], b: { c: 1 } })).toEqual({ a: [`x ${REDACTED}`], b: { c: 1 } });
  });
});

describe("linear time on hostile input", () => {
  // A 10 KB line of "token" repeated took 43 s with the earlier GRAVE-009 expression.
  const lines = ["token".repeat(40_000), "a".repeat(200_000), "eyJ-".repeat(50_000), "a.".repeat(100_000), "x://y:".repeat(30_000), '"token": "'.repeat(20_000)];

  it.each(lines.map((line) => [line.slice(0, 12), line]))("scans and redacts %s... quickly", (_, line) => {
    const start = performance.now();
    scanFiles([{ path: ".kiro/settings/mcp.json", content: line }, { path: ".kiro/steering/a.md", content: line }]);
    redactSecrets(line);
    expect(performance.now() - start).toBeLessThan(1500);
  });
});
