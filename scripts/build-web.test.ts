import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { listFixtures } from "@gravescan/fixtures";
import { buildWeb, CONTENT_SECURITY_POLICY } from "./build-web.ts";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const assets = path.join(dist, "assets");

beforeAll(async () => {
  await buildWeb();
});

describe("static web build", () => {
  it("writes content-hashed assets referenced by the document", () => {
    const index = readFileSync(path.join(dist, "index.html"), "utf8");
    const files = readdirSync(assets).sort();
    expect(files).toHaveLength(4);
    expect(files).toEqual(expect.arrayContaining([
      expect.stringMatching(/^app\.[a-f0-9]{12}\.js$/),
      expect.stringMatching(/^worker\.[a-f0-9]{12}\.js$/),
      expect.stringMatching(/^fixtures\.[a-f0-9]{12}\.json$/),
      expect.stringMatching(/^styles\.[a-f0-9]{12}\.css$/),
    ]));
    const app = files.find((file) => file.startsWith("app."));
    const worker = files.find((file) => file.startsWith("worker."));
    const fixtures = files.find((file) => file.startsWith("fixtures."));
    const styles = files.find((file) => file.startsWith("styles."));
    if (app === undefined || worker === undefined || fixtures === undefined || styles === undefined) throw new Error("expected assets were not built");
    expect(index).toContain(`/assets/${app}`);
    expect(index).toContain(`/assets/${styles}`);
    const appSource = readFileSync(path.join(assets, app), "utf8");
    expect(appSource).toContain(`"/assets/${worker}"`);
    expect(appSource).toContain(`"/assets/${fixtures}"`);
    expect(index).toContain(`<link rel="preload" href="/assets/${fixtures}" as="fetch" crossorigin="anonymous">`);
    expect(appSource).not.toContain("engine-worker.js");
    expect(index).not.toContain('/assets/app.js');
    expect(index).not.toContain('/assets/styles.css');
  });

  it("writes CSP for every response and immutable caching only for fingerprinted assets", () => {
    const headers = readFileSync(path.join(dist, "_headers"), "utf8");
    expect(headers).toContain(`Content-Security-Policy: ${CONTENT_SECURITY_POLICY}`);
    expect(headers).toContain("/assets/*\n  Cache-Control: public, max-age=31536000, immutable");
  });

  it("keeps the engine worker below 125 KB and the page script below 25 KB uncompressed", () => {
    const files = readdirSync(assets);
    const worker = files.find((file) => file.startsWith("worker."));
    const app = files.find((file) => file.startsWith("app."));
    if (worker === undefined || app === undefined) throw new Error("scripts not built");
    expect(readFileSync(path.join(assets, worker)).byteLength).toBeLessThan(125 * 1024);
    expect(readFileSync(path.join(assets, app)).byteLength).toBeLessThan(25 * 1024);
  });

  it("renders a disabled button for every bundled fixture in the static markup", () => {
    const index = readFileSync(path.join(dist, "index.html"), "utf8");
    for (const id of listFixtures()) expect(index).toMatch(new RegExp(`data-fixture="${id}"[^>]*disabled`));
  });

  it("sends isolation and permission headers", () => {
    const headers = readFileSync(path.join(dist, "_headers"), "utf8");
    expect(headers).toContain("Cross-Origin-Opener-Policy: same-origin");
    expect(headers).toContain("Cross-Origin-Resource-Policy: same-origin");
    expect(headers).toContain("Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  });
});
