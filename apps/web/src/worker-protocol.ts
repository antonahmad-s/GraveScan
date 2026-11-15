import { createEngine, EngineError, type Engine, type FixtureBundle } from "./engine.ts";
import { planLocalImport } from "./local-project.ts";

// Message protocol between the page and the engine worker. The page sends one request per user
// action and renders the reply; all scanning, patching, file reading, and redaction happen here,
// off the main thread. Kept free of worker globals so it can be unit tested directly.

export type FolderEntry = { readonly path: string; readonly file: Blob };

export type WorkerRequest =
  | { readonly id: number; readonly type: "init"; readonly bundle: unknown }
  | { readonly id: number; readonly type: "call"; readonly route: string; readonly payload: Record<string, unknown> }
  | { readonly id: number; readonly type: "loadFiles"; readonly files: unknown }
  | { readonly id: number; readonly type: "loadFolder"; readonly entries: readonly FolderEntry[] };

export type WorkerReply =
  | { readonly id: number; readonly ok: true; readonly value: unknown }
  | { readonly id: number; readonly ok: false; readonly message: string };

const GENERIC_ERROR = "The request could not be completed.";

function isBundle(value: unknown): value is FixtureBundle {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createWorkerHandler(): (request: WorkerRequest) => Promise<WorkerReply> {
  let engine: Engine | undefined;

  function ready(): Engine {
    if (engine === undefined) throw new EngineError("NOT_READY", "The scanner is still loading.");
    return engine;
  }

  async function run(request: WorkerRequest): Promise<unknown> {
    switch (request.type) {
      case "init":
        if (!isBundle(request.bundle)) throw new EngineError("INVALID_BUNDLE", "Fixtures could not be loaded.");
        engine = createEngine(request.bundle);
        return { fixtures: engine.fixtures() };
      case "call":
        return ready().call(request.route, request.payload);
      case "loadFiles": {
        const loaded = ready().loadLocal(request.files);
        return { ...loaded, tooLarge: 0, fixtures: ready().fixtures() };
      }
      case "loadFolder": {
        const current = ready();
        const entries = Array.isArray(request.entries) ? request.entries : [];
        const plan = planLocalImport(entries.map((entry) => ({ path: String(entry.path), size: entry.file instanceof Blob ? entry.file.size : Number.POSITIVE_INFINITY })));
        if (!plan.ok) throw new EngineError(plan.code, plan.message);
        const files = await Promise.all(plan.accepted.map(async (item) => ({ path: item.path, content: await (entries[item.index] as FolderEntry).file.text() })));
        const loaded = current.loadLocal(files);
        return { ...loaded, tooLarge: plan.tooLarge.length, fixtures: current.fixtures() };
      }
      default:
        throw new EngineError("UNKNOWN_REQUEST", GENERIC_ERROR);
    }
  }

  return async (request) => {
    const id = typeof request?.id === "number" ? request.id : -1;
    try {
      return { id, ok: true, value: await run(request) };
    } catch (error) {
      // Only engine errors carry user-facing text; anything else gets a generic message so
      // internal details never reach the page.
      return { id, ok: false, message: error instanceof EngineError ? error.message : GENERIC_ERROR };
    }
  };
}
