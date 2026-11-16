import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { listFixtures } from "@gravescan/fixtures";
import { makeTempDir, removeDir } from "../packages/fixtures/test/helpers.ts";
import { buildWeb, copyPublicFiles, CONTENT_SECURITY_POLICY } from "./build-web.ts";

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

  it("keeps the page renderer out of HTML injection sinks", () => {
    const source = readFileSync(path.join(root, "apps/web/src/static/app.js"), "utf8");
    expect(source).not.toMatch(/\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/);
  });

  it("keeps worker failure handling and local data cleanup explicit", () => {
    const source = readFileSync(path.join(root, "apps/web/src/static/app.js"), "utf8");
    expect(source).toContain('worker.addEventListener("error"');
    expect(source).toContain('worker.addEventListener("messageerror"');
    expect(source).toContain("rejectPending(message)");
    expect(source).toContain("URL.revokeObjectURL(url)");
    expect(source).not.toMatch(/\b(?:indexedDB|sessionStorage)\b/);
  });

  it("copies the icon set to the site root and every root link in the document resolves", () => {
    const index = readFileSync(path.join(dist, "index.html"), "utf8");
    for (const file of ["favicon.ico", "icon0.svg", "icon1.png", "apple-icon.png", "manifest.json", "web-app-manifest-192x192.png", "web-app-manifest-512x512.png"]) {
      expect(existsSync(path.join(dist, file)), file).toBe(true);
    }
    const rootLinks = [...index.matchAll(/(?:href|src)="(\/[^"/][^"]*)"/g)].map((match) => match[1] ?? "").filter((link) => !link.startsWith("/assets/"));
    expect(rootLinks).toEqual(expect.arrayContaining(["/favicon.ico", "/icon0.svg", "/icon1.png", "/apple-icon.png", "/manifest.json"]));
    for (const link of rootLinks) expect(existsSync(path.join(dist, link.slice(1))), link).toBe(true);
    const manifest = JSON.parse(readFileSync(path.join(dist, "manifest.json"), "utf8")) as { icons: { src: string }[] };
    for (const icon of manifest.icons) expect(existsSync(path.join(dist, icon.src.slice(1))), icon.src).toBe(true);
  });

  it("refuses a public file that would replace a build output and skips dotfiles", () => {
    const parent = makeTempDir();
    try {
      const from = path.join(parent, "public");
      const to = path.join(parent, "out");
      mkdirSync(from);
      mkdirSync(to);
      writeFileSync(path.join(from, "icon.svg"), "<svg/>");
      writeFileSync(path.join(from, ".DS_Store"), "");
      expect(copyPublicFiles(from, to)).toEqual(["icon.svg"]);
      writeFileSync(path.join(from, "_headers"), "/*\n  X-Frame-Options: ALLOWALL\n");
      expect(() => copyPublicFiles(from, to)).toThrow(/build output/);
    } finally {
      removeDir(parent);
    }
  });

  it("sends isolation and permission headers", () => {
    const headers = readFileSync(path.join(dist, "_headers"), "utf8");
    expect(headers).toContain("require-trusted-types-for 'script'");
    expect(headers).toContain("trusted-types gravescan");
    expect(headers).toContain("Cross-Origin-Opener-Policy: same-origin");
    expect(headers).toContain("Cross-Origin-Resource-Policy: same-origin");
    expect(headers).toContain("Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  });
});
