import { createInterface } from "node:readline";
import { createWorkCopy, isFixtureId, listFixtures, readWorkCopy, type WorkCopy } from "@gravescan/fixtures";
import { applyPatch, generatePatch, verifyPatch, type Patch } from "@gravescan/patcher";
import { scanFiles } from "@gravescan/scanner";
import { replayScenario, SCENARIOS } from "@gravescan/simulator";

type JsonObject = Record<string, unknown>;
type Session = { fixture: string; copy: WorkCopy; patch: Patch };
const patches = new Map<string, Session>();
const toolDefinitions = [
  { name: "list_fixtures", description: "List controlled GraveScan fixtures.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "run_fixture_scan", description: "Scan one controlled fixture.", inputSchema: { type: "object", properties: { fixture: { type: "string" } }, required: ["fixture"], additionalProperties: false } },
  { name: "run_attack_replay", description: "Run a bounded deterministic replay.", inputSchema: { type: "object", properties: { fixture: { type: "string" }, scenarioId: { type: "string" } }, required: ["fixture", "scenarioId"], additionalProperties: false } },
  { name: "get_finding", description: "Read one finding from a controlled fixture.", inputSchema: { type: "object", properties: { fixture: { type: "string" }, findingId: { type: "string" } }, required: ["fixture", "findingId"], additionalProperties: false } },
  { name: "generate_patch", description: "Generate an allowlisted patch for one finding.", inputSchema: { type: "object", properties: { fixture: { type: "string" }, findingId: { type: "string" } }, required: ["fixture", "findingId"], additionalProperties: false } },
  { name: "verify_patch", description: "Apply a stored patch to an isolated copy and verify it.", inputSchema: { type: "object", properties: { fixture: { type: "string" }, patchId: { type: "string" } }, required: ["fixture", "patchId"], additionalProperties: false } },
] as const;

function send(value: JsonObject): void { process.stdout.write(`${JSON.stringify(value)}\n`); }
function error(id: unknown, code: number, message: string): void { send({ jsonrpc: "2.0", id, error: { code, message } }); }
function output(value: unknown, isError = false): JsonObject { return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], isError }; }
function fixture(args: JsonObject): string | undefined { return typeof args.fixture === "string" && isFixtureId(args.fixture) ? args.fixture : undefined; }
function scan(fixtureId: string, reset = false): { copy: WorkCopy; report: ReturnType<typeof scanFiles> } | undefined {
  const copy = reset ? createWorkCopy(fixtureId) : createWorkCopy(fixtureId);
  if (!copy.ok) return undefined;
  const files = readWorkCopy(copy.value); if (!files.ok) return undefined;
  return { copy: copy.value, report: scanFiles(files.value) };
}
function toolCall(name: string, args: JsonObject): JsonObject {
  if (name === "list_fixtures") return output({ fixtures: listFixtures() });
  const fixtureId = fixture(args); if (fixtureId === undefined) return output({ code: "INVALID_FIXTURE", message: "Only controlled fixtures are accepted." }, true);
  const current = scan(fixtureId, name === "run_fixture_scan"); if (current === undefined) return output({ code: "WORK_COPY_INVALID" }, true);
  if (name === "run_fixture_scan") return output({ fixture: fixtureId, report: current.report });
  if (name === "run_attack_replay") { const result = replayScenario(current.report, String(args.scenarioId ?? "")); return output(result.ok ? result.value : result.error, !result.ok); }
  if (name === "get_finding") { const value = current.report.findings.find((item) => item.id === args.findingId); return output(value ?? { code: "FINDING_NOT_FOUND" }, value === undefined); }
  if (name === "generate_patch") {
    const finding = current.report.findings.find((item) => item.id === args.findingId); if (!finding) return output({ code: "FINDING_NOT_FOUND" }, true);
    const patch = generatePatch(current.copy, finding); if (!patch.ok) return output(patch.error, true);
    patches.set(patch.value.id, { fixture: fixtureId, copy: current.copy, patch: patch.value }); return output(patch.value);
  }
  if (name === "verify_patch") {
    const session = typeof args.patchId === "string" ? patches.get(args.patchId) : undefined;
    if (!session || session.fixture !== fixtureId) return output({ code: "PATCH_NOT_FOUND" }, true);
    const applied = applyPatch(session.copy, session.patch); if (!applied.ok) return output(applied.error, true);
    const verified = verifyPatch(session.copy, session.patch); return output(verified.ok ? verified.value : verified.error, !verified.ok);
  }
  return output({ code: "UNKNOWN_TOOL" }, true);
}
function handle(message: JsonObject): void {
  const id = message.id; const method = message.method;
  if (method === "notifications/initialized") return;
  if (method === "initialize") { send({ jsonrpc: "2.0", id, result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "gravescan-dev", version: "0.0.0" } } }); return; }
  if (method === "tools/list") { send({ jsonrpc: "2.0", id, result: { tools: toolDefinitions } }); return; }
  if (method === "tools/call") {
    const params = message.params;
    if (typeof params !== "object" || params === null || Array.isArray(params)) return error(id, -32602, "Invalid parameters.");
    const record = params as JsonObject;
    const name = typeof record.name === "string" ? record.name : "";
    const args = record.arguments;
    const toolArguments = typeof args === "object" && args !== null && !Array.isArray(args) ? args as JsonObject : {};
    send({ jsonrpc: "2.0", id, result: toolCall(name, toolArguments) });
    return;
  }
  error(id, -32601, "Method not found.");
}
createInterface({ input: process.stdin, crlfDelay: Infinity }).on("line", (line) => { try { const value: unknown = JSON.parse(line); if (typeof value !== "object" || value === null || Array.isArray(value)) return error(null, -32600, "Invalid Request."); handle(value as JsonObject); } catch { error(null, -32700, "Parse error."); } });
export { SCENARIOS, toolDefinitions };
