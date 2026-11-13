import path from "node:path";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");

export const FIXTURES_DATA_ROOT = path.join(PACKAGE_ROOT, "data");
export const DEFAULT_WORK_BASE = path.join(REPO_ROOT, ".gravescan-work");
