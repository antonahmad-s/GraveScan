# GraveScan

> GraveScan stitches static analysis, safe red-team replay, and patch verification into one security workbench for Kiro agent projects.

**Hackathon category:** Frankenstein (Kiroween)
**Status:** Scaffold. Specs and steering are in place; implementation follows `.kiro/specs/`.

## What it does

1. Pick a controlled fixture repository.
2. Scan Kiro configuration (`mcp.json`, hooks, agents, steering) with deterministic rules.
3. Review findings with file, line, and evidence.
4. Run a **safe attack replay** (deterministic state machine) and see `exposed` or `blocked`.
5. Generate a minimal patch and review the diff.
6. Apply the patch to an **isolated copy**, then rescan and replay.
7. Read the before/after verification report.

> Safe simulation. No arbitrary code or network request is executed.
> GraveScan does not claim a project is secure. It shows evidence, reproduces risk safely, and verifies whether a fix changes the result.

## The three stitched parts

| Part | Role |
|---|---|
| Static analyzer | Rule engine over Kiro/MCP config, with file and line evidence |
| Safe red-team replay | Deterministic scenarios, no shell, no network |
| Patch verification | Allowlisted patches, isolated copy, rescan, regression detection |

## Stack

TypeScript end to end: Next.js, Zod, SQLite, Vitest, fast-check, Playwright, pnpm, Docker Compose.

## Quick start

Requires Node 22.18 or newer and pnpm 10.

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
pnpm gravescan list
```

Available now: the fixture loader, the isolated work copy, and the `gravescan list` command. The scanner, simulator, patcher, and web UI arrive in Specs 02 to 05, so `gravescan scan` and the web app do not exist yet.

## Repository layout

```text
apps/web/            Next.js UI + light API
packages/scanner/    parser + rule engine
packages/simulator/  safe attack scenarios
packages/patcher/    patch generation + verification
packages/fixtures/   intentionally vulnerable fixtures (FAKE tokens only)
packages/reporting/  before/after report + Markdown export
tests/               property, integration, e2e
docs/                architecture, threat model, Kiro workflow, demo script
.kiro/               specs, steering, agents, hooks, MCP settings
```

## Fixtures are intentionally vulnerable

Everything under `packages/fixtures/` is deliberately unsafe test data. Tokens such as `GRAVESCAN_CANARY_DO_NOT_USE_123` are fake. Fixture `.kiro` folders are **not** the project's own `.kiro` at the repo root.

## How Kiro was used

See [docs/kiro-workflow.md](docs/kiro-workflow.md).

## License

MIT, see [LICENSE](LICENSE). Security policy: [SECURITY.md](SECURITY.md).
