import { loadFixture, type FixtureError, type Result } from "@gravescan/fixtures";
import { scanFiles } from "./scan-files.ts";
import type { ScanResult } from "./schemas.ts";

export { scanFiles };

export function scanFixture(id: string): Result<ScanResult, FixtureError> {
  const fixture = loadFixture(id);
  return fixture.ok
    ? { ok: true, value: scanFiles(fixture.value) }
    : fixture;
}
