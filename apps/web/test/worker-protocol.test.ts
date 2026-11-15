import { listFixtures, loadFixture } from "@gravescan/fixtures";
import { describe, expect, it } from "vitest";
import { createWorkerHandler, type WorkerRequest } from "../src/worker-protocol.ts";

function bundle(): Record<string, unknown> {
  return Object.fromEntries(listFixtures().map((id) => {
    const files = loadFixture(id);
    if (!files.ok) throw new Error(id);
    return [id, files.value];
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
// Omit over a union would merge the variants; distribute it so each request keeps its fields.
type Request = WorkerRequest extends infer R ? (R extends WorkerRequest ? Omit<R, "id"> : never) : never;

async function ready() {
  const handle = createWorkerHandler();
  let id = 0;
  const call = async (request: Request): Promise<Json> => handle({ id: ++id, ...request } as WorkerRequest);
  expect(await call({ type: "init", bundle: bundle() })).toMatchObject({ ok: true, value: { fixtures: [...listFixtures()].sort() } });
  return call;
}

describe("worker protocol", () => {
  it("echoes the request id and refuses work before init", async () => {
    const handle = createWorkerHandler();
    expect(await handle({ id: 7, type: "call", route: "/api/scan", payload: { fixture: "unsafe-mcp" } })).toEqual({ id: 7, ok: false, message: "The scanner is still loading." });
  });

  it("runs engine calls and returns engine errors as messages", async () => {
    const call = await ready();
    const scan = await call({ type: "call", route: "/api/scan", payload: { fixture: "unsafe-mcp" } });
    expect(scan.ok).toBe(true);
    expect(scan.value.report.findings).toHaveLength(4);
    expect(await call({ type: "call", route: "/api/scan", payload: { fixture: "../x" } })).toMatchObject({ ok: false, message: "Choose one of the controlled fixtures or load your own project." });
  });

  it("plans and reads a folder in the worker, skipping non-.kiro and oversized files", async () => {
    const call = await ready();
    const big = new Blob(["x".repeat(1024 * 1024 + 1)]);
    const reply = await call({
      type: "loadFolder",
      entries: [
        { path: "repo/.kiro/settings/mcp.json", file: new Blob(['{ "mcpServers": { "s": { "command": "node", "autoApprove": ["run_command"] } } }']) },
        { path: "repo/src/app.json", file: new Blob(["{}"]) },
        { path: "repo/.kiro/steering/huge.md", file: big },
      ],
    });
    expect(reply).toMatchObject({ ok: true, value: { fixture: "local-project", files: 1, tooLarge: 1 } });
    expect(reply.value.fixtures).toContain("local-project");
    const scan = await call({ type: "call", route: "/api/scan", payload: { fixture: "local-project" } });
    expect(scan.value.report.findings.map((item: Json) => item.ruleId)).toContain("GRAVE-001");
  });

  it("rejects folders without .kiro and malformed requests with safe messages", async () => {
    const call = await ready();
    expect(await call({ type: "loadFolder", entries: [{ path: "repo/README.md", file: new Blob([""]) }] })).toMatchObject({ ok: false });
    expect(await call({ type: "loadFiles", files: "nope" })).toMatchObject({ ok: false, message: "No files were provided." });
    expect(await call({ type: "bogus" } as unknown as Request)).toMatchObject({ ok: false, message: "The request could not be completed." });
    expect(await call({ type: "init", bundle: [] })).toMatchObject({ ok: false, message: "Fixtures could not be loaded." });
  });

  it("hides unexpected internal errors behind a generic message", async () => {
    const call = await ready();
    const exploding = { get size(): number { throw new Error("internal stack detail"); } };
    const reply = await call({ type: "loadFolder", entries: [{ path: "repo/.kiro/a.md", file: exploding as unknown as Blob }] });
    expect(reply).toMatchObject({ ok: false });
    expect(reply.message).not.toContain("internal stack detail");
  });
});
