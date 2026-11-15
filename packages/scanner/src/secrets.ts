// Secret detection and redaction shared by the scanner rules, the patcher, and every output path.
// All expressions run in linear time: key names are matched as whole words starting at a word
// boundary, so a long line cannot trigger nested backtracking.

const SECRET_KEY = /token|secret|password|passwd|api_?key/i;
const ENV_REFERENCE = /^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/;
// key, optional quotes, ":" or "=", opening quote, value of 6+ characters without quotes or spaces.
const ASSIGNMENT = /(?<![A-Za-z0-9_-])["']?([A-Za-z0-9_-]+)["']?[ \t]*[:=][ \t]*(["'])([^"'\s]{6,})/g;

// Well-known credential formats that are redacted wherever they appear, even without a key name.
// Each pattern starts only where the previous character cannot extend the token, so a long run
// of token characters has one candidate start instead of one per character.
const TOKEN_START = "(?<![A-Za-z0-9_.-])";
const TOKEN_FORMATS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]{0,40}PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]{0,40}PRIVATE KEY-----|$)/g,
  new RegExp(`${TOKEN_START}(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}`, "g"),
  new RegExp(`${TOKEN_START}github_pat_[A-Za-z0-9_]{20,}`, "g"),
  new RegExp(`${TOKEN_START}glpat-[A-Za-z0-9_-]{20,}`, "g"),
  new RegExp(`${TOKEN_START}sk-[A-Za-z0-9_-]{20,}`, "g"),
  new RegExp(`${TOKEN_START}(?:AKIA|ASIA)[0-9A-Z]{16}(?![0-9A-Z])`, "g"),
  new RegExp(`${TOKEN_START}xox[abposr]-[A-Za-z0-9-]{10,}`, "g"),
  new RegExp(`${TOKEN_START}AIza[0-9A-Za-z_-]{35}`, "g"),
  new RegExp(`${TOKEN_START}eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}`, "g"),
  /(?<![A-Za-z])[Bb]earer[ \t]+[A-Za-z0-9._~+/=-]{16,}/g,
];
const URL_CREDENTIALS = /(?<![a-z0-9+.-])([a-z][a-z0-9+.-]*:\/\/)[^\s/:@"']+:[^\s/@"']+@/gi;

export const REDACTED = "[REDACTED]";

export type SecretAssignment = {
  readonly key: string;
  readonly value: string;
  /** Index of the first character of the value in the scanned line. */
  readonly valueIndex: number;
  readonly quote: string;
};

export function secretAssignments(line: string): SecretAssignment[] {
  const found: SecretAssignment[] = [];
  for (const match of line.matchAll(ASSIGNMENT)) {
    const [whole, key = "", quote = "", value = ""] = match;
    if (!SECRET_KEY.test(key) || ENV_REFERENCE.test(value)) continue;
    found.push({ key, value, quote, valueIndex: (match.index ?? 0) + whole.length - value.length });
  }
  return found;
}

/** Turns a key such as `github-token` into a valid environment variable name (`GITHUB_TOKEN`). */
export function environmentName(key: string): string {
  const name = key.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
  return /^[A-Z_]/.test(name) ? name : `SECRET_${name}`;
}

/** Replaces secret-like values with [REDACTED] so findings, diffs, and reports can be shared. */
export function redactSecrets(text: string): string {
  if (text.length === 0) return text;
  let result = text
    .split("\n")
    .map((line) => {
      const assignments = secretAssignments(line);
      let redacted = line;
      for (const item of [...assignments].reverse()) {
        redacted = redacted.slice(0, item.valueIndex) + REDACTED + redacted.slice(item.valueIndex + item.value.length);
      }
      return redacted;
    })
    .join("\n");
  for (const format of TOKEN_FORMATS) result = result.replace(format, REDACTED);
  return result.replace(URL_CREDENTIALS, `$1${REDACTED}@`);
}

/** Applies redactSecrets to every string inside a JSON-like value. */
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redactSecrets(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item)) as T;
  if (typeof value === "object" && value !== null) {
    const copy: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) copy[key] = redactDeep(item);
    return copy as T;
  }
  return value;
}
