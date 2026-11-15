import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { listFixtures, loadFixture, type FixtureFile } from "@gravescan/fixtures";

// Builds the static site that Cloudflare serves: HTML, CSS, the UI script, the bundled in-browser
// engine, and the controlled fixtures as JSON. No server code is produced.

const root = path.resolve(import.meta.dirname, "..");
const staticDir = path.join(root, "apps/web/src/static");
const dist = path.join(root, "dist");
const assets = path.join(dist, "assets");

export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

const HEADERS = `/*
  Content-Security-Policy: ${CONTENT_SECURITY_POLICY}
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
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

export async function buildWeb(): Promise<void> {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(assets, { recursive: true });

  copyFileSync(path.join(staticDir, "index.html"), path.join(dist, "index.html"));
  copyFileSync(path.join(staticDir, "app.js"), path.join(assets, "app.js"));
  copyFileSync(path.join(staticDir, "styles.css"), path.join(assets, "styles.css"));
  writeFileSync(path.join(assets, "fixtures.json"), JSON.stringify(fixtureBundle()));
  writeFileSync(path.join(dist, "_headers"), HEADERS);

  await build({
    entryPoints: [path.join(root, "apps/web/src/engine.ts")],
    outfile: path.join(assets, "engine.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: false,
    legalComments: "none",
    logLevel: "warning",
  });
}

if (process.argv[1] === import.meta.filename) {
  await buildWeb();
  console.log(`Built static site in ${path.relative(root, dist)}/`);
}
