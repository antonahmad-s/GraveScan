# How Kiro Was Used

Honest, evidence-based write-up. Fill each row as work happens; delete anything not actually used.

| Devpost question | GraveScan plan | Evidence |
|---|---|---|
| IDE / CLI / Web / Crew | IDE or Web for specs and code; CLI for scans and CI-like runs. Note real differences here. | _TODO_ |
| Custom agents | `scanner-analyst`, `patch-engineer`, `release-reviewer` | `.kiro/agents/` |
| Hooks | Post-task verify, rule regression, self-scan of `.kiro`, docs check | `.kiro/hooks/` |
| Spec-driven | Five specs. Compare against vibe coding on one module. | `.kiro/specs/` |
| Steering | Product contract, security boundaries, testing contract, UI direction | `.kiro/steering/` |
| MCP | Custom `gravescan-dev` stdio server: `list_fixtures`, `run_fixture_scan`, `run_attack_replay`, `get_finding`, `generate_patch`, `verify_patch`. Disabled by default until a Kiro CLI user opts in. GitHub MCP optional. | `packages/mcp-dev/src/server.ts`, `.kiro/settings/mcp.json` |
| PBT | fast-check: determinism, parser robustness, evidence validity, patch idempotence, no new high-risk finding | `tests/property/` |
| Skills | `antislop` (MIT, v3.2.29) installed in `.kiro/skills/` from github.com/miqdadbadjuber/anti-slop. `antislop-code` governs code comments; `antislop-ui`, `antislop-human`, and `antislop-layoutmobile` apply from Spec 05. | `.kiro/skills/` |
| Powers | List only the powers actually used. | _TODO_ |

## Real incidents log
Record at least one concrete case where a spec, hook, or property test caught a bug.

- 2026-11-13. Scanner rule tests caught two false positives before release: a steering sentence that prohibited secret export was reported as a secret request, and `${API_TOKEN}` was reported as a committed secret. The rule engine now ignores explicit prohibitions and runtime environment references. Evidence: `packages/scanner/test/rules.test.ts`.
- 2026-11-13. The first seeded patch-invariant script called `.find()` on the `ScanResult` object rather than `ScanResult.findings`; it failed 100 checks. The verifier was corrected, then passed 1,000 scanner/replay cases and 100 patch cases. This was a test harness defect, not an application finding.
- 2026-11-13. Running the real toolchain for the first time (after npm registry access was granted) caught three defects that a Bun-based stand-in had hidden:
  - Vitest: 12 integration tests failed with `Failed to load url @gravescan/scanner`. The root `package.json` never declared the workspace packages, so pnpm did not link them at the root. Fixed by adding them as `workspace:*` devDependencies.
  - `tsc`: `fc.constantFrom("create", "mutate", "reset")` widened to `string`. Fixed with an explicit type parameter.
  - ESLint: 12 `no-undef` errors in the browser script, plus an empty `catch` block. Fixed by declaring browser globals for `apps/web/src/static/**/*.js` and documenting why storage errors are ignored.
  - Lesson: a stand-in test runner is a smoke check, not a quality gate. The `testing-contract.md` steering names Vitest and fast-check for this reason.
- 2026-11-13. The testing contract requires a patch-idempotence property test. Review showed the file had never been written; only a seeded script existed. `tests/property/patcher.property.test.ts` now covers idempotence and the "no new High or Critical finding on success" property.
- 2026-11-13. A real browser click-through at 768px found a horizontal overflow (`scrollWidth 806 > 768`) after a scan, caused by a three-column header at tablet width. Fixed with a 1060px header breakpoint and re-verified at 390, 768, and 1060px.

## Vibe vs spec comparison
- _TODO: pick one module, note time, rework, and bugs under each approach._

## Self-scan
GraveScan scans its own root `.kiro/` (hook `self-scan.json`). Record results here.
