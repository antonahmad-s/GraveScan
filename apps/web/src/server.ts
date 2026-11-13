import { randomUUID } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorkCopy, DEFAULT_WORK_BASE, isFixtureId, isInside, listFixtures, readWorkCopy, type WorkCopy } from "@gravescan/fixtures";
import { applyPatch, generatePatch, verifyPatch, type Patch } from "@gravescan/patcher";
import { buildMarkdownReport, compareScans, type AppliedPatchRecord } from "@gravescan/reporting";
import { scanFiles, type ScanResult } from "@gravescan/scanner";
import { replayScenario } from "@gravescan/simulator";

const STATIC_ROOT = path.join(import.meta.dirname, "static");
const MAX_BODY_BYTES = 16 * 1024;
const SESSION_COOKIE = "gravescan_session";
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type FixtureState = {
  readonly copy: WorkCopy;
  readonly baseline: ScanResult;
  readonly applied: AppliedPatchRecord[];
};

type ClientSession = {
  readonly id: string;
  readonly base: string;
  readonly fixtures: Map<string, FixtureState>;
  readonly patches: Map<string, { readonly fixture: string; readonly patch: Patch }>;
};

export type AppServerOptions = {
  /** Directory that holds per-session isolated copies. Defaults to `.gravescan-work/sessions`. */
  readonly workRoot?: string;
  /** Oldest sessions and their copies are deleted beyond this count. */
  readonly maxSessions?: number;
};

type Failure = { readonly ok: false; readonly status: number; readonly code: string; readonly message: string };

function json(response: ServerResponse, status: number, value: unknown, cookie?: string): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(cookie === undefined ? {} : { "Set-Cookie": cookie }),
  });
  response.end(JSON.stringify(value));
}

function staticFile(response: ServerResponse, name: "index.html" | "app.js" | "styles.css", contentType: string): void {
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    "Referrer-Policy": "no-referrer",
  });
  response.end(readFileSync(path.join(STATIC_ROOT, name), "utf8"));
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  let content = "";
  for await (const chunk of request) {
    content += String(chunk);
    if (Buffer.byteLength(content) > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  }
  const parsed: unknown = JSON.parse(content);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("INVALID_BODY");
  return parsed as Record<string, unknown>;
}

function cookieValue(request: IncomingMessage): string | undefined {
  for (const part of (request.headers.cookie ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return undefined;
}

function scanCopy(copy: WorkCopy, base: string): ScanResult | Failure {
  const files = readWorkCopy(copy, base);
  return files.ok ? scanFiles(files.value) : { ok: false, status: 500, code: files.error.code, message: "The isolated fixture copy could not be read." };
}

function isFailure(value: unknown): value is Failure {
  return typeof value === "object" && value !== null && (value as Failure).ok === false;
}

export function createAppServer(options: AppServerOptions = {}): Server {
  const workRoot = path.resolve(options.workRoot ?? path.join(DEFAULT_WORK_BASE, "sessions"));
  const allowedParents = [DEFAULT_WORK_BASE, os.tmpdir()].map((parent) => path.resolve(parent));
  if (!allowedParents.some((parent) => workRoot !== parent && isInside(parent, workRoot))) {
    throw new Error("workRoot must be a subdirectory of .gravescan-work or the OS temp directory.");
  }
  const maxSessions = options.maxSessions ?? 50;
  const sessions = new Map<string, ClientSession>();

  // Copies from a previous process have no live session, so they are only disk usage.
  rmSync(workRoot, { recursive: true, force: true });

  function dropSession(session: ClientSession): void {
    sessions.delete(session.id);
    if (session.base !== workRoot && isInside(workRoot, session.base)) rmSync(session.base, { recursive: true, force: true });
  }

  function sessionFor(request: IncomingMessage): { session: ClientSession; cookie?: string } {
    const existingId = cookieValue(request);
    const existing = existingId !== undefined && SESSION_ID.test(existingId) ? sessions.get(existingId) : undefined;
    if (existing !== undefined) {
      sessions.delete(existing.id);
      sessions.set(existing.id, existing);
      return { session: existing };
    }
    while (sessions.size >= maxSessions) {
      const oldest = sessions.values().next().value;
      if (oldest === undefined) break;
      dropSession(oldest);
    }
    const id = randomUUID();
    const session: ClientSession = { id, base: path.join(workRoot, id), fixtures: new Map(), patches: new Map() };
    sessions.set(id, session);
    const secure = request.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
    return { session, cookie: `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Strict${secure}` };
  }

  function resetFixture(session: ClientSession, fixture: string): FixtureState | Failure {
    const copy = createWorkCopy(fixture, session.base);
    if (!copy.ok) return { ok: false, status: 500, code: copy.error.code, message: "The controlled fixture could not be prepared." };
    const baseline = scanCopy(copy.value, session.base);
    if (isFailure(baseline)) return baseline;
    for (const [id, entry] of session.patches) if (entry.fixture === fixture) session.patches.delete(id);
    const state: FixtureState = { copy: copy.value, baseline, applied: [] };
    session.fixtures.set(fixture, state);
    return state;
  }

  function currentFixture(session: ClientSession, fixture: string): { state: FixtureState; report: ScanResult } | Failure {
    const state = session.fixtures.get(fixture) ?? resetFixture(session, fixture);
    if (isFailure(state)) return state;
    const report = scanCopy(state.copy, session.base);
    return isFailure(report) ? report : { state, report };
  }

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "GET" && url.pathname === "/") return staticFile(response, "index.html", "text/html; charset=utf-8");
    if (request.method === "GET" && url.pathname === "/assets/app.js") return staticFile(response, "app.js", "text/javascript; charset=utf-8");
    if (request.method === "GET" && url.pathname === "/assets/styles.css") return staticFile(response, "styles.css", "text/css; charset=utf-8");
    if (request.method === "GET" && url.pathname === "/healthz") return json(response, 200, { status: "ok" });
    if (request.method === "GET" && url.pathname === "/api/fixtures") return json(response, 200, { fixtures: listFixtures() });
    if (request.method !== "POST" || !url.pathname.startsWith("/api/")) {
      return json(response, 404, { error: { code: "NOT_FOUND", message: "Route not found." } });
    }

    const { session, cookie } = sessionFor(request);
    const send = (status: number, value: unknown) => json(response, status, value, cookie);
    const fail = (failure: Pick<Failure, "status" | "code" | "message">) => send(failure.status, { error: { code: failure.code, message: failure.message } });

    let input: Record<string, unknown>;
    try {
      input = await readBody(request);
    } catch (error) {
      const code = error instanceof Error && error.message === "BODY_TOO_LARGE" ? "BODY_TOO_LARGE" : "INVALID_REQUEST";
      return fail({ status: 400, code, message: "Request body must be a small JSON object." });
    }

    const fixture = typeof input.fixture === "string" && isFixtureId(input.fixture) ? input.fixture : undefined;
    if (fixture === undefined) return fail({ status: 400, code: "INVALID_FIXTURE", message: "Choose one of the controlled fixtures." });

    if (url.pathname === "/api/scan" || url.pathname === "/api/reset") {
      const state = resetFixture(session, fixture);
      return isFailure(state) ? fail(state) : send(200, { fixture, report: state.baseline });
    }

    const current = currentFixture(session, fixture);
    if (isFailure(current)) return fail(current);
    const { state, report } = current;

    if (url.pathname === "/api/replay") {
      if (typeof input.scenarioId !== "string") return fail({ status: 400, code: "INVALID_SCENARIO", message: "Choose a known replay scenario." });
      const replay = replayScenario(report, input.scenarioId);
      return replay.ok ? send(200, { replay: replay.value }) : fail({ status: 400, code: replay.error.code, message: "Replay scenario not found." });
    }

    if (url.pathname === "/api/patch/generate") {
      const finding = report.findings.find((item) => item.id === input.findingId);
      if (finding === undefined) return fail({ status: 404, code: "FINDING_NOT_FOUND", message: "The selected finding is not in the current scan." });
      const patch = generatePatch(state.copy, finding, session.base);
      if (!patch.ok) return fail({ status: 400, code: patch.error.code, message: "A safe automatic patch is not available for this finding." });
      session.patches.set(patch.value.id, { fixture, patch: patch.value });
      return send(200, { patch: patch.value });
    }

    if (url.pathname === "/api/patch/apply") {
      const entry = typeof input.patchId === "string" ? session.patches.get(input.patchId) : undefined;
      if (entry === undefined || entry.fixture !== fixture) return fail({ status: 404, code: "PATCH_NOT_FOUND", message: "The patch is not available for this fixture." });
      const applied = applyPatch(state.copy, entry.patch, session.base);
      if (!applied.ok) return fail({ status: 409, code: applied.error.code, message: "The patch could not be applied to the isolated copy." });
      const verification = verifyPatch(state.copy, entry.patch, session.base);
      if (!verification.ok) return fail({ status: 500, code: verification.error.code, message: "The patched copy could not be verified." });
      if (applied.value.applied) {
        state.applied.push({
          patchId: entry.patch.id,
          findingId: entry.patch.findingId,
          ruleId: entry.patch.ruleId,
          file: entry.patch.file,
          reason: entry.patch.reason,
          status: verification.value.status,
          ...(verification.value.replay === undefined ? {} : { replayResult: verification.value.replay.result }),
        });
      }
      const after = scanCopy(state.copy, session.base);
      if (isFailure(after)) return fail(after);
      return send(200, { applied: applied.value, verification: verification.value, report: after, comparison: compareScans(state.baseline, after) });
    }

    if (url.pathname === "/api/report") {
      const markdown = buildMarkdownReport({ fixture, baseline: state.baseline, current: report, patches: state.applied });
      return send(200, { filename: `gravescan-${fixture}.md`, markdown });
    }

    return fail({ status: 404, code: "NOT_FOUND", message: "Route not found." });
  }

  return createServer((request, response) => {
    handle(request, response).catch(() => {
      if (!response.headersSent) json(response, 500, { error: { code: "INTERNAL_ERROR", message: "Unexpected server error." } });
    });
  });
}

function listenOptions(): { host: string; port: number } {
  const port = Number(process.env.PORT ?? "3000");
  const host = process.env.HOST ?? "127.0.0.1";
  return {
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 3000,
    host: host === "0.0.0.0" || host === "127.0.0.1" || host === "::" ? host : "127.0.0.1",
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { host, port } = listenOptions();
  createAppServer().listen(port, host, () => {
    console.log(`GraveScan is running at http://${host === "0.0.0.0" || host === "::" ? "localhost" : host}:${port}`);
  });
}
