# GraveScan

> GraveScan stitches static analysis, safe red-team replay, and patch verification into one security workbench for Kiro agent projects.

**Hackathon category:** Frankenstein (Kiroween)

**Live app:** <https://gravescan.antonahmadsusilo.workers.dev/>. No login, and everything runs in your browser tab.

## What it does

1. Pick a controlled fixture repository, or choose your own project folder or paste an `mcp.json`.
2. Scan Kiro configuration (`mcp.json`, hooks, agents, steering) with deterministic rules.
3. Review findings with file, line, and evidence.
4. Run a **safe attack replay** (deterministic state machine) and see `exposed` or `blocked`.
5. Generate a minimal patch and review the diff.
6. Apply the patch to an **isolated copy**, then rescan and replay.
7. Read the before/after verification report and export it as Markdown.

GraveScan also scans its own `.kiro/` directory (`pnpm self-scan`) in a Kiro hook and in CI.

> Safe simulation. No arbitrary code or network request is executed.
> GraveScan does not claim a project is secure. It shows evidence, reproduces risk safely, and verifies whether a fix changes the result.

## The three stitched parts

| Part | Role |
|---|---|
| Static analyzer | Rule engine over Kiro/MCP config, with file and line evidence |
| Safe red-team replay | Deterministic scenarios, no shell, no network |
| Patch verification | Allowlisted patches, isolated copy, rescan, regression detection |

## Stack

TypeScript end to end: Zod, Vitest, fast-check, Playwright, ESLint, esbuild, and pnpm on Node 22. The web workbench is a static site. esbuild bundles the scanner, simulator, patcher, and reporting packages into one Web Worker, so every scan, replay, and patch runs in the visitor's own tab without blocking input. Cloudflare Workers serves the files with no server code. The PRD planned Next.js; [Spec 05](.kiro/specs/05-product-ui-demo-flow/design.md) records why the project moved to a static browser build.

## Quick start

Requires Node 22.18 or newer and pnpm 10.

```bash
pnpm install
pnpm verify          # ESLint, tsc, Vitest + fast-check
pnpm self-scan       # GraveScan's rules against this repo's .kiro/
pnpm dev             # builds dist/ and serves it at http://127.0.0.1:3000
```

`pnpm build` writes the static site to `dist/`. `pnpm preview` serves the same folder through Wrangler's local Workers runtime.

The UI scans its three bundled fixtures or your own `.kiro/` folder. Your files are read in the browser tab and never uploaded. Only `.json`, `.md`, `.yaml`, `.yml`, and `.txt` files inside the shallowest `.kiro/` folder are read, up to 500 files, 1 MB each, and 5 MB in total. The UI cannot execute shell code or make outbound requests; its only network traffic is loading its own static files. Secret-like values appear as `[REDACTED]` in findings, diffs, and exported reports. Patches apply to an in-memory copy, so you review the diff and apply it to your repository yourself.

### CLI

```bash
pnpm gravescan list
pnpm gravescan scan --fixture unsafe-mcp --format json
pnpm gravescan scan --fixture unsafe-mcp --format json --fail-on high   # exits 1 on a High or Critical finding
pnpm gravescan scan --path ../my-project --format json --fail-on high     # scans ../my-project/.kiro/
pnpm gravescan scan --path ../my-project --format sarif > gravescan.sarif  # for GitHub code scanning
pnpm gravescan self-scan --format json
```

`--path` reads `<dir>/.kiro/` only and rejects symlinks. `--format sarif` writes SARIF 2.1.0; see [docs/github-code-scanning.md](docs/github-code-scanning.md) for a pull request workflow. The CLI prints secret-like values as `[REDACTED]`, so its output is safe for CI logs.

### End-to-end tests

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

To use an existing Chromium build instead of downloading one, set `GRAVESCAN_CHROMIUM_PATH` to its executable.

## Deploy

The site deploys to Cloudflare Workers as an assets-only Worker ([`wrangler.jsonc`](wrangler.jsonc)). No Worker script runs, there is no database, and no secrets are needed. Static asset requests are free on the Workers Free plan.

Automatic deploys from GitHub (Workers Builds):

1. In the Cloudflare dashboard, open **Workers & Pages → Create → Import a repository** and select this repository.
2. Set the Worker name to `gravescan`. It must match `name` in `wrangler.jsonc`.
3. Build command: `pnpm build`. Deploy command: `npx wrangler deploy`. Root directory: `/`.
4. Production branch: `main`. Each push to `main` then builds and deploys to `https://gravescan.<your-subdomain>.workers.dev`.
5. Pull request branches run `npx wrangler preview` and get a separate preview URL. That command needs the `previews` block in `wrangler.jsonc`, which is empty on purpose.

`dist/_headers` sets the Content Security Policy, `nosniff`, `Referrer-Policy`, and `X-Frame-Options` for every file. The JS, CSS, and fixture bundle use content-hashed URLs and are cached immutably; `index.html` stays revalidated so it always points to the active build. The favicon, app icons, and `manifest.json` live in `apps/web/public/`, are copied to the site root, and are revalidated like `index.html`. Each visitor's isolated copy lives in their own tab and is gone on reload, so concurrent judges do not affect each other. No login is required.

## Repository layout

```text
apps/web/             browser UI and the in-browser engine
scripts/              static build, local static server, docs and repo checks
packages/scanner/     parser + rule engine
packages/simulator/   safe attack scenarios
packages/patcher/     patch generation + verification
packages/reporting/   before/after comparison + Markdown report
packages/fixtures/    intentionally vulnerable fixtures (FAKE tokens only), safe file access
packages/cli/         `gravescan` command
packages/mcp-dev/     `gravescan-dev` fixed-function MCP server (disabled by default)
tests/                property, integration, e2e
docs/                 architecture, threat model, Kiro workflow, demo script
.kiro/                specs, steering, agents, hooks, skills, MCP settings
```

## Fixtures are intentionally vulnerable

Everything under `packages/fixtures/` is deliberately unsafe test data. Tokens such as `GRAVESCAN_CANARY_DO_NOT_USE_123` are fake. Fixture `.kiro` folders are **not** the project's own `.kiro` at the repo root.

## How Kiro was used

See [docs/kiro-workflow.md](docs/kiro-workflow.md).

## License

MIT, see [LICENSE](LICENSE). Security policy: [SECURITY.md](SECURITY.md).
