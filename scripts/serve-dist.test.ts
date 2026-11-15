import { mkdirSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeTempDir, removeDir } from "../packages/fixtures/test/helpers.ts";
import { createStaticServer, parseHeaders } from "./serve-dist.ts";

let parent: string;
let server: ReturnType<typeof createStaticServer>;
let base: string;

beforeAll(async () => {
  parent = makeTempDir();
  const dist = path.join(parent, "dist");
  mkdirSync(path.join(dist, "assets"), { recursive: true });
  writeFileSync(path.join(dist, "index.html"), "<!doctype html>");
  writeFileSync(path.join(dist, "assets", "app.js"), "export {};");
  writeFileSync(path.join(dist, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n");
  writeFileSync(path.join(parent, "secret.json"), "{}");
  server = createStaticServer(dist);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  removeDir(parent);
});

describe("local static server", () => {
  it("parses only the catch-all block of _headers", () => {
    expect(parseHeaders("/*\n  A: 1\n/other\n  B: 2\n")).toEqual({ A: "1" });
  });

  it("serves built files with the _headers values", async () => {
    const page = await fetch(`${base}/`);
    expect(page.status).toBe(200);
    expect(page.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await fetch(`${base}/assets/app.js`)).headers.get("content-type")).toContain("text/javascript");
  });

  it("refuses traversal, the headers file, unknown types, and writes", async () => {
    for (const route of ["/%2e%2e/secret.json", "/..%2fsecret.json", "/_headers", "/missing.js", "/assets"]) {
      expect((await fetch(`${base}${route}`)).status, route).toBe(404);
    }
    expect((await fetch(`${base}/`, { method: "POST" })).status).toBe(405);
  });
});
