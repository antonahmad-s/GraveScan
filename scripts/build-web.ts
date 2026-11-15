import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { listFixtures, loadFixture, type FixtureFile } from "@gravescan/fixtures";

// Builds the static site that Cloudflare serves. Content-hashed assets may be cached indefinitely:
// each changed input gets a fresh URL, while index.html is revalidated on every visit.

const root = path.resolve(import.meta.dirname, "..");
const staticDir = path.join(root, "apps/web/src/static");
const dist = path.join(root, "dist");
const assets = path.join(dist, "assets");

export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; require-trusted-types-for 'script'; trusted-types gravescan";

const HEADERS = `/*
  Content-Security-Policy: ${CONTENT_SECURITY_POLICY}
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

function fixtureBundle(): Record<string, FixtureFile[]> {
  const bundle: Record<string, FixtureFile[]> = {};
  for (const id of listFixtures()) {
    const files = loadFixture(id);
    if (!files.ok) throw new Error(`Fixture ${id} could not be loaded: ${files.error.code}`);
    bundle[id] = files.value;
  }
  return bundle;
}

function fingerprint(content: Uint8Array | string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function writeAsset(stem: string, extension: string, content: Uint8Array | string): string {
  const file = `${stem}.${fingerprint(content)}${extension}`;
  writeFileSync(path.join(assets, file), content);
  return `/assets/${file}`;
}

function replaceOnce(source: string, target: string, replacement: string): string {
  const index = source.indexOf(target);
  if (index === -1) throw new Error(`Expected build placeholder was not found: ${target}`);
  return `${source.slice(0, index)}${replacement}${source.slice(index + target.length)}`;
}

export async function buildWeb(): Promise<void> {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(assets, { recursive: true });

  // A classic (non-module) worker: the bundle has no imports, and classic workers run everywhere.
  const engine = await build({
    entryPoints: [path.join(root, "apps/web/src/engine-worker.ts")],
    outfile: path.join(assets, "worker.js"),
    write: false,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: false,
    legalComments: "none",
    logLevel: "warning",
  });
  const engineOutput = engine.outputFiles?.find((file) => file.path.endsWith("worker.js"));
  if (engineOutput === undefined) throw new Error("esbuild did not return the engine worker.");

  const workerUrl = writeAsset("worker", ".js", engineOutput.contents);
  const fixturesUrl = writeAsset("fixtures", ".json", JSON.stringify(fixtureBundle()));
  const stylesUrl = writeAsset("styles", ".css", readFileSync(path.join(staticDir, "styles.css")));

  let app = readFileSync(path.join(staticDir, "app.js"), "utf8");
  app = replaceOnce(app, '"/assets/engine-worker.js"', `"${workerUrl}"`);
  app = replaceOnce(app, '"/assets/fixtures.json"', `"${fixturesUrl}"`);
  const appUrl = writeAsset("app", ".js", app);

  let markup = readFileSync(path.join(staticDir, "index.html"), "utf8");
  markup = replaceOnce(markup, 'href="/assets/styles.css"', `href="${stylesUrl}"`);
  markup = replaceOnce(markup, 'src="/assets/app.js"', `src="${appUrl}"`);
  markup = replaceOnce(markup, 'href="/assets/fixtures.json"', `href="${fixturesUrl}"`);
  writeFileSync(path.join(dist, "index.html"), markup);
  writeFileSync(path.join(dist, "_headers"), HEADERS);
}

if (process.argv[1] === import.meta.filename) {
  await buildWeb();
  console.log(`Built static site in ${path.relative(root, dist)}/`);
}
