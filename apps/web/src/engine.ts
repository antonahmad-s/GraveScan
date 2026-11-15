import { isFixtureId, type FixtureFile, type FixtureId } from "@gravescan/fixtures/browser";
import { applyPatchToFiles, generatePatchForFiles, verifyPatchFiles, type Patch } from "@gravescan/patcher/browser";
import { buildMarkdownReport, compareScans, type AppliedPatchRecord } from "@gravescan/reporting";
import { redactDeep, scanFiles, type ScanResult } from "@gravescan/scanner/browser";
import { replayScenario } from "@gravescan/simulator";
import { LOCAL_PROJECT, validateLocalFiles } from "./local-project.ts";

export { LOCAL_LIMITS, LOCAL_PROJECT, planLocalImport } from "./local-project.ts";
export type { LocalEntry, LocalImportPlan } from "./local-project.ts";

// Runs the whole GraveScan workflow in the visitor's own page. Each engine instance is one visitor's
// isolated copy, so there is no server state to share, evict, or leak between visitors. Besides the
// bundled fixtures, a visitor can load their own .kiro files as the "local-project" source.

export type FixtureBundle = Readonly<Record<FixtureId, readonly FixtureFile[]>>;

export class EngineError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type SourceId = FixtureId | typeof LOCAL_PROJECT;

type FixtureState = {
  files: FixtureFile[];
  readonly baseline: ScanResult;
  readonly applied: AppliedPatchRecord[];
  readonly patches: Map<string, Patch>;
};

export type Engine = {
  /** Bundled fixture IDs, followed by "local-project" once a visitor has loaded their own files. */
  readonly fixtures: () => SourceId[];
  /** Validates and stores the visitor's own .kiro files, replacing any earlier local project. */
  readonly loadLocal: (files: unknown) => { fixture: typeof LOCAL_PROJECT; files: number };
  readonly call: (route: string, payload: Record<string, unknown>) => unknown;
};

function copyFiles(files: readonly FixtureFile[]): FixtureFile[] {
  return files.map((file) => ({ path: file.path, content: file.content }));
}

// Responses are fresh copies, so callers cannot mutate engine state by editing a returned object,
// and secret-like values are redacted so evidence, diffs, and reports are safe to show or share.
function respond<T>(value: T): T {
  return redactDeep(structuredClone(value));
}

export function createEngine(bundle: FixtureBundle): Engine {
  const states = new Map<SourceId, FixtureState>();
  const fixtureIds = Object.keys(bundle).filter((id): id is FixtureId => isFixtureId(id) && Array.isArray(bundle[id])).sort();
  // Snapshot the pristine files once so later edits to the caller's bundle cannot reach a reset.
  const pristine = new Map<SourceId, FixtureFile[]>(fixtureIds.map((id) => [id, copyFiles(bundle[id])] as const));

  function fixtureFrom(payload: Record<string, unknown>): SourceId {
    const fixture = payload.fixture;
    if (fixture === LOCAL_PROJECT && pristine.has(LOCAL_PROJECT)) return LOCAL_PROJECT;
    if (typeof fixture !== "string" || !isFixtureId(fixture) || !fixtureIds.includes(fixture)) {
      throw new EngineError("INVALID_FIXTURE", "Choose one of the controlled fixtures or load your own project.");
    }
    return fixture;
  }

  function loadLocal(input: unknown): { fixture: typeof LOCAL_PROJECT; files: number } {
    const checked = validateLocalFiles(input);
    if (!checked.ok) throw new EngineError("INVALID_PROJECT", checked.message);
    pristine.set(LOCAL_PROJECT, copyFiles(checked.files));
    states.delete(LOCAL_PROJECT);
    return { fixture: LOCAL_PROJECT, files: checked.files.length };
  }

  function reset(fixture: SourceId): FixtureState {
    const files = copyFiles(pristine.get(fixture) ?? []);
    const state: FixtureState = { files, baseline: scanFiles(files), applied: [], patches: new Map() };
    states.set(fixture, state);
    return state;
  }

  function current(fixture: SourceId): FixtureState {
    return states.get(fixture) ?? reset(fixture);
  }

  function call(route: string, payload: Record<string, unknown>): unknown {
    const fixture = fixtureFrom(payload);

    if (route === "/api/scan" || route === "/api/reset") {
      return respond({ fixture, report: reset(fixture).baseline });
    }

    // Each action scans at most once: replay, generate, and report read the current copy, and
    // apply scans only the patched copy, then shares that scan with verification.
    const state = current(fixture);

    if (route === "/api/replay") {
      if (typeof payload.scenarioId !== "string") throw new EngineError("INVALID_SCENARIO", "Choose a known replay scenario.");
      const replay = replayScenario(scanFiles(state.files), payload.scenarioId);
      if (!replay.ok) throw new EngineError(replay.error.code, "Replay scenario not found.");
      return respond({ replay: replay.value });
    }

    if (route === "/api/patch/generate") {
      const report = scanFiles(state.files);
      const finding = report.findings.find((item) => item.id === payload.findingId);
      if (finding === undefined) throw new EngineError("FINDING_NOT_FOUND", "The selected finding is not in the current scan.");
      const patch = generatePatchForFiles(state.files, finding, report);
      if (!patch.ok) throw new EngineError(patch.error.code, "A safe automatic patch is not available for this finding.");
      state.patches.set(patch.value.id, patch.value);
      return respond({ patch: patch.value });
    }

    if (route === "/api/patch/apply") {
      const patch = typeof payload.patchId === "string" ? state.patches.get(payload.patchId) : undefined;
      if (patch === undefined) throw new EngineError("PATCH_NOT_FOUND", "The patch is not available for this fixture.");
      const applied = applyPatchToFiles(state.files, patch);
      if (!applied.ok) throw new EngineError(applied.error.code, "The patch could not be applied to the isolated copy.");
      state.files = applied.value.files;
      const after = scanFiles(state.files);
      const verification = verifyPatchFiles(state.files, patch, after);
      if (!verification.ok) throw new EngineError(verification.error.code, "The patched copy could not be verified.");
      if (applied.value.applied) {
        state.applied.push({
          patchId: patch.id,
          findingId: patch.findingId,
          ruleId: patch.ruleId,
          file: patch.file,
          reason: patch.reason,
          status: verification.value.status,
          ...(verification.value.replay === undefined ? {} : { replayResult: verification.value.replay.result }),
        });
      }
      return respond({
        applied: { applied: applied.value.applied, patch },
        verification: verification.value,
        report: after,
        comparison: compareScans(state.baseline, after),
      });
    }

    if (route === "/api/report") {
      const markdown = buildMarkdownReport({ fixture, baseline: state.baseline, current: scanFiles(state.files), patches: state.applied });
      return respond({ filename: `gravescan-${fixture}.md`, markdown });
    }

    throw new EngineError("NOT_FOUND", "Unknown action.");
  }

  return {
    fixtures: () => (pristine.has(LOCAL_PROJECT) ? [...fixtureIds, LOCAL_PROJECT] : [...fixtureIds]),
    loadLocal,
    call,
  };
}
