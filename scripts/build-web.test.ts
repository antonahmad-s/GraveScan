import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
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
      expect.stringMatching(/^engine\.[a-f0-9]{12}\.js$/),
      expect.stringMatching(/^fixtures\.[a-f0-9]{12}\.json$/),
      expect.stringMatching(/^styles\.[a-f0-9]{12}\.css$/),
    ]));
    const app = files.find((file) => file.startsWith("app."));
    const engine = files.find((file) => file.startsWith("engine."));
    const fixtures = files.find((file) => file.startsWith("fixtures."));
    const styles = files.find((file) => file.startsWith("styles."));
    if (app === undefined || engine === undefined || fixtures === undefined || styles === undefined) throw new Error("expected assets were not built");
    expect(index).toContain(`/assets/${app}`);
    expect(index).toContain(`/assets/${styles}`);
    const appSource = readFileSync(path.join(assets, app), "utf8");
    expect(appSource).toContain(`./${engine}`);
    expect(appSource).toContain(`/assets/${fixtures}`);
    expect(index).not.toContain('/assets/app.js');
    expect(index).not.toContain('/assets/styles.css');
  });

  it("writes CSP for every response and immutable caching only for fingerprinted assets", () => {
    const headers = readFileSync(path.join(dist, "_headers"), "utf8");
    expect(headers).toContain(`Content-Security-Policy: ${CONTENT_SECURITY_POLICY}`);
    expect(headers).toContain("/assets/*\n  Cache-Control: public, max-age=31536000, immutable");
  });

  it("keeps the browser engine below the 125 KB uncompressed JavaScript budget", () => {
    const engine = readdirSync(assets).find((file) => file.startsWith("engine."));
    if (engine === undefined) throw new Error("browser engine not built");
    expect(readFileSync(path.join(assets, engine)).byteLength).toBeLessThan(125 * 1024);
  });
});
