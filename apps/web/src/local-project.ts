import { checkRelative, type FixtureFile } from "@gravescan/fixtures/browser";

// Rules for turning a visitor's own folder into scanner input. Files never leave the tab; these
// limits keep a large or hostile folder from freezing it, and only .kiro/ text files are read.

export const LOCAL_PROJECT = "local-project" as const;

export const LOCAL_LIMITS = {
  maxFiles: 500,
  maxFileBytes: 1024 * 1024,
  maxTotalBytes: 5 * 1024 * 1024,
} as const;

const SCANNED_EXTENSIONS = [".json", ".md", ".yaml", ".yml", ".txt"];
const EXCLUDED_SEGMENTS = new Set(["node_modules", ".git", "", ".", ".."]);

export type LocalEntry = { readonly path: string; readonly size: number };

export type LocalImportPlan =
  | {
      readonly ok: true;
      /** Index into the input list and the normalized `.kiro/...` path to read it as. */
      readonly accepted: readonly { readonly index: number; readonly path: string }[];
      readonly tooLarge: readonly string[];
    }
  | { readonly ok: false; readonly code: "NO_KIRO_FOLDER" | "TOO_MANY_FILES" | "TOO_LARGE"; readonly message: string };

function extensionAllowed(path: string): boolean {
  const lower = path.toLowerCase();
  return SCANNED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/**
 * Picks which files of a chosen folder to read. `path` is the browser's relative path, such as
 * `my-repo/.kiro/settings/mcp.json`. Only the shallowest `.kiro` folder is used, so a monorepo
 * with nested projects cannot produce colliding paths.
 */
export function planLocalImport(entries: readonly LocalEntry[]): LocalImportPlan {
  const candidates = entries
    .map((entry, index) => {
      const parts = entry.path.replace(/\\/g, "/").split("/");
      return { index, size: entry.size, parts, at: parts.indexOf(".kiro") };
    })
    .filter((candidate) => candidate.at >= 0 && candidate.at < candidate.parts.length - 1);
  if (candidates.length === 0) {
    return { ok: false, code: "NO_KIRO_FOLDER", message: "No .kiro folder was found. Choose your project folder or its .kiro folder." };
  }

  const shallowest = candidates.reduce((best, candidate) => (candidate.at < best.at ? candidate : best));
  const prefix = shallowest.parts.slice(0, shallowest.at).join("/");
  const accepted: { index: number; path: string }[] = [];
  const tooLarge: string[] = [];
  let total = 0;

  for (const candidate of candidates) {
    if (candidate.parts.slice(0, candidate.at).join("/") !== prefix) continue;
    const parts = candidate.parts.slice(candidate.at);
    if (parts.slice(1).some((part) => EXCLUDED_SEGMENTS.has(part))) continue;
    const path = parts.join("/");
    if (!extensionAllowed(path) || !checkRelative(path).ok) continue;
    if (candidate.size > LOCAL_LIMITS.maxFileBytes) {
      tooLarge.push(path);
      continue;
    }
    accepted.push({ index: candidate.index, path });
    total += candidate.size;
  }

  if (accepted.length > LOCAL_LIMITS.maxFiles) {
    return { ok: false, code: "TOO_MANY_FILES", message: `The .kiro folder has more than ${LOCAL_LIMITS.maxFiles} scannable files.` };
  }
  if (total > LOCAL_LIMITS.maxTotalBytes) {
    return { ok: false, code: "TOO_LARGE", message: "The .kiro folder is larger than 5 MB of scannable text." };
  }
  if (accepted.length === 0) {
    return { ok: false, code: "NO_KIRO_FOLDER", message: "The .kiro folder has no .json, .md, .yaml, or .txt files to scan." };
  }
  return { ok: true, accepted, tooLarge };
}

export type LocalValidation =
  | { readonly ok: true; readonly files: FixtureFile[] }
  | { readonly ok: false; readonly message: string };

/** Re-checks files at the engine boundary, whatever the page passed in. */
export function validateLocalFiles(input: unknown): LocalValidation {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, message: "No files were provided." };
  if (input.length > LOCAL_LIMITS.maxFiles) return { ok: false, message: `At most ${LOCAL_LIMITS.maxFiles} files can be scanned.` };
  const files: FixtureFile[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const item of input as unknown[]) {
    if (typeof item !== "object" || item === null) return { ok: false, message: "Each file needs a path and text content." };
    const { path, content } = item as { path?: unknown; content?: unknown };
    if (typeof path !== "string" || typeof content !== "string") return { ok: false, message: "Each file needs a path and text content." };
    if (!path.startsWith(".kiro/") || !checkRelative(path).ok || !extensionAllowed(path) || path.split("/").some((part) => EXCLUDED_SEGMENTS.has(part))) {
      return { ok: false, message: "Only text files inside .kiro/ can be scanned." };
    }
    if (seen.has(path)) return { ok: false, message: "The same file path was provided twice." };
    // Text has already been decoded here, so the limits count characters rather than bytes.
    if (content.length > LOCAL_LIMITS.maxFileBytes) return { ok: false, message: "A file is larger than 1 MB." };
    total += content.length;
    if (total > LOCAL_LIMITS.maxTotalBytes) return { ok: false, message: "The files are larger than 5 MB in total." };
    seen.add(path);
    files.push({ path, content });
  }
  return { ok: true, files: files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) };
}
