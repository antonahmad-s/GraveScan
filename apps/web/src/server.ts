import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorkCopy, isFixtureId, listFixtures, readWorkCopy, type WorkCopy } from "@gravescan/fixtures";
import { scanFiles } from "@gravescan/scanner";
import { applyPatch, generatePatch, verifyPatch, type Patch } from "@gravescan/patcher";
import { replayScenario } from "@gravescan/simulator";

const STATIC_ROOT = path.join(import.meta.dirname, "static");
const MAX_BODY_BYTES = 16 * 1024;

type Session = { readonly fixture: string; readonly copy: WorkCopy; readonly patch: Patch };

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

function failure(response: ServerResponse, status: number, code: string, message: string): void {
  json(response, status, { error: { code, message } });
}

async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  let content = "";
  for await (const chunk of request) {
    content += String(chunk);
    if (Buffer.byteLength(content) > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  }
  const parsed: unknown = JSON.parse(content);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("INVALID_BODY");
  return parsed as Record<string, unknown>;
}

function fixtureFrom(input: Record<string, unknown>): string | undefined {
  return typeof input.fixture === "string" && isFixtureId(input.fixture) ? input.fixture : undefined;
}

function staticFile(response: ServerResponse, name: "index.html" | "app.js" | "styles.css", contentType: string): void {
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(readFileSync(path.join(STATIC_ROOT, name), "utf8"));
}

export function createAppServer(): Server {
  const copies = new Map<string, WorkCopy>();
  const patches = new Map<string, Session>();

  function scanCurrent(fixture: string, reset: boolean): { ok: true; copy: WorkCopy; report: ReturnType<typeof scanFiles> } | { ok: false; code: string; message: string } {
    const existing = copies.get(fixture);
    const workCopy = reset || existing === undefined ? createWorkCopy(fixture) : { ok: true as const, value: existing };
    if (!workCopy.ok) return { ok: false, code: workCopy.error.code, message: "The controlled fixture could not be prepared." };
    copies.set(fixture, workCopy.value);
    const files = readWorkCopy(workCopy.value);
    if (!files.ok) return { ok: false, code: files.error.code, message: "The isolated fixture copy could not be read." };
    return { ok: true, copy: workCopy.value, report: scanFiles(files.value) };
  }

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (request.method === "GET" && url.pathname === "/") return staticFile(response, "index.html", "text/html; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/assets/app.js") return staticFile(response, "app.js", "text/javascript; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/assets/styles.css") return staticFile(response, "styles.css", "text/css; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/api/fixtures") return json(response, 200, { fixtures: listFixtures() });
      if (request.method !== "POST") return failure(response, 404, "NOT_FOUND", "Route not found.");

      const input = await body(request);
      const fixture = fixtureFrom(input);
      if (fixture === undefined) return failure(response, 400, "INVALID_FIXTURE", "Choose one of the controlled fixtures.");

      if (url.pathname === "/api/scan" || url.pathname === "/api/reset") {
        const result = scanCurrent(fixture, true);
        return result.ok ? json(response, 200, { fixture, report: result.report }) : failure(response, 400, result.code, result.message);
      }

      const current = scanCurrent(fixture, false);
      if (!current.ok) return failure(response, 400, current.code, current.message);

      if (url.pathname === "/api/replay") {
        if (typeof input.scenarioId !== "string") return failure(response, 400, "INVALID_SCENARIO", "Choose a known replay scenario.");
        const replay = replayScenario(current.report, input.scenarioId);
        return replay.ok ? json(response, 200, { replay: replay.value }) : failure(response, 400, replay.error.code, "Replay scenario not found.");
      }

      if (url.pathname === "/api/patch/generate") {
        if (typeof input.findingId !== "string") return failure(response, 400, "INVALID_FINDING", "Choose a finding before generating a patch.");
        const finding = current.report.findings.find((item) => item.id === input.findingId);
        if (finding === undefined) return failure(response, 404, "FINDING_NOT_FOUND", "The selected finding is not in the current scan.");
        const patch = generatePatch(current.copy, finding);
        if (!patch.ok) return failure(response, 400, patch.error.code, "A safe automatic patch is not available for this finding.");
        patches.set(patch.value.id, { fixture, copy: current.copy, patch: patch.value });
        return json(response, 200, { patch: patch.value });
      }

      if (url.pathname === "/api/patch/apply") {
        if (typeof input.patchId !== "string") return failure(response, 400, "INVALID_PATCH", "Generate a patch before applying it.");
        const session = patches.get(input.patchId);
        if (session === undefined || session.fixture !== fixture || session.copy.root !== current.copy.root) {
          return failure(response, 404, "PATCH_NOT_FOUND", "The patch is not available for this fixture.");
        }
        const applied = applyPatch(session.copy, session.patch);
        if (!applied.ok) return failure(response, 400, applied.error.code, "The patch could not be applied to the isolated copy.");
        const verification = verifyPatch(session.copy, session.patch);
        if (!verification.ok) return failure(response, 400, verification.error.code, "The patched copy could not be verified.");
        const after = scanCurrent(fixture, false);
        return after.ok
          ? json(response, 200, { applied: applied.value, verification: verification.value, report: after.report })
          : failure(response, 400, after.code, after.message);
      }

      return failure(response, 404, "NOT_FOUND", "Route not found.");
    } catch (error) {
      const code = error instanceof Error && error.message === "BODY_TOO_LARGE" ? "BODY_TOO_LARGE" : "INVALID_REQUEST";
      failure(response, 400, code, "Request body must be a small JSON object.");
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const portValue = Number(process.env.PORT ?? "3000");
  const port = Number.isInteger(portValue) && portValue > 0 && portValue < 65536 ? portValue : 3000;
  createAppServer().listen(port, "127.0.0.1", () => {
    console.log(`GraveScan is running at http://127.0.0.1:${port}`);
  });
}
