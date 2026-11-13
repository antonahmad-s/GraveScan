# GraveScan

> GraveScan stitches static analysis, safe red-team replay, and patch verification into one security workbench for Kiro agent projects.

**Hackathon category:** Frankenstein (Kiroween)

## What it does

1. Pick a controlled fixture repository.
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

TypeScript end to end on Node 22: a dependency-free `http` server and browser UI, Zod, Vitest, fast-check, Playwright, ESLint, and pnpm. The PRD planned Next.js; [Spec 05](.kiro/specs/05-product-ui-demo-flow/design.md) records why the project kept a plain Node server.

## Quick start

Requires Node 22.18 or newer and pnpm 10.

```bash
pnpm install
pnpm verify          # ESLint, tsc, Vitest + fast-check
pnpm self-scan       # GraveScan's rules against this repo's .kiro/
pnpm dev             # http://127.0.0.1:3000
```

The UI accepts only its three bundled fixtures. It cannot upload repositories, execute shell code, or make outbound requests.

### CLI

```bash
pnpm gravescan list
pnpm gravescan scan --fixture unsafe-mcp --format json
pnpm gravescan scan --fixture unsafe-mcp --format json --fail-on high   # exits 1 on a High or Critical finding
pnpm gravescan self-scan --format json
```

### End-to-end tests

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

To use an existing Chromium build instead of downloading one, set `GRAVESCAN_CHROMIUM_PATH` to its executable.

## Deploy

The app needs a long-running Node process, because each visitor's isolated copy lives on local disk and generated patches stay in memory until applied. Serverless function hosting does not fit.

```bash
docker compose up --build    # http://localhost:3000
```

The `Dockerfile` works on container hosts such as Render, Railway, or Fly.io. The server reads `PORT` and `HOST` (set `HOST=0.0.0.0` in containers; the image already does) and exposes `GET /healthz`. Each browser gets its own session cookie and isolated copies, so concurrent judges do not affect each other. No login is required.

## Repository layout

```text
apps/web/             Node HTTP server and browser UI
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
