# How Kiro Was Used

Honest, evidence-based write-up. Fill each row as work happens; delete anything not actually used.

| Devpost question | GraveScan plan | Evidence |
|---|---|---|
| IDE / CLI / Web / Crew | IDE or Web for specs and code; CLI for scans and CI-like runs. Note real differences here. | _TODO_ |
| Custom agents | `scanner-analyst`, `patch-engineer`, `release-reviewer` | `.kiro/agents/` |
| Hooks | `PostTaskExec`: `pnpm verify` and `pnpm docs:check`. `PostFileSave` on scanner/simulator/fixtures: rule regression tests. `PostFileSave` on `.kiro/{settings,agents,hooks,steering}`: `pnpm self-scan`, which runs GraveScan's own rules against this repo. | `.kiro/hooks/` |
| Spec-driven | Five specs. Compare against vibe coding on one module. | `.kiro/specs/` |
| Steering | Product contract, security boundaries, testing contract, UI direction | `.kiro/steering/` |
| MCP | Custom `gravescan-dev` stdio server: `list_fixtures`, `run_fixture_scan`, `run_attack_replay`, `get_finding`, `generate_patch`, `verify_patch`. Disabled by default until a Kiro CLI user opts in. GitHub MCP optional. | `packages/mcp-dev/src/server.ts`, `.kiro/settings/mcp.json` |
| PBT | fast-check: determinism, parser robustness, evidence validity, patch idempotence, no new high-risk finding | `tests/property/` |
| Skills | `antislop` (MIT, v3.2.29) installed in `.kiro/skills/` from github.com/miqdadbadjuber/anti-slop. `antislop-code` governs code comments; `antislop-ui`, `antislop-human`, and `antislop-layoutmobile` apply from Spec 05. `security-audit` (MIT, cloudflare/security-audit-skill at c1c8a8c) ran a full `quick`-profile audit; see "Security audit" below. | `.kiro/skills/` |
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

- 2026-11-13. A tablet-width test caught keyboard focus dropping to `<body>` after Enter on a finding. `renderFindings()` cleared the list before recording which item had focus. Fixed by recording focus first and restoring it after the rebuild; the Playwright keyboard test now asserts it.
- 2026-11-13. A before/after comparison test caught that resolving GRAVE-001 also reported GRAVE-009 as resolved. The patch reformatted `mcp.json`, moving the canary token from line 7 to line 6, and finding IDs include the line. Patch verification had the same flaw: a patch that only moved a risky line would have counted as a fix. Both now match findings by rule, file, and evidence text. A test proves a move-only patch is `Needs review`.
- 2026-11-13. Moving the web engine into the browser for free Cloudflare hosting: writing the engine's mutation test showed that `reset` copied files from the caller's fixture bundle on every call, so any later edit to that bundle would change each new reset. The engine now snapshots the pristine files once at creation, and the test edits the bundle after load to prove it.
- 2026-11-13. Before letting visitors scan their own files, a timing probe ran the scanner on long hostile lines. One 10 KB line of `token` repeated in a `.kiro/*.json` file took 43 seconds, because the GRAVE-009 expression `[a-z0-9_]*(?:token|...)[a-z0-9_]*` backtracks quadratically. The rule now matches whole key words and checks the name in code; a test requires six 200 KB hostile lines to scan quickly.
- 2026-11-13. A realistic-config patch test showed that the GRAVE-009 patch replaced the first secret-like assignment anywhere in the file and always named it `API_TOKEN`. With an earlier `${OTHER_TOKEN}` reference, the patch would have changed the wrong line or nothing. It now edits the finding's own line and derives the variable name from the key (`github-token` becomes `GITHUB_TOKEN`).

## Vibe vs spec comparison
- _TODO: pick one module, note time, rework, and bugs under each approach._

## Self-scan
`pnpm self-scan` runs GraveScan's rules against the repository's own `.kiro/` directory. It reads a fixed path, not user input, rejects symlinks and files over 1 MiB, and exits 1 on a medium or higher finding. It runs in the `self-scan.json` hook and in CI.

First run, 2026-11-13: **0 findings**. That looked wrong, so the rules were checked against the repo by hand, which found two scanner defects that hid real problems:

- **GRAVE-003 allowlist bypass.** The hook allowlist matched only the start of a command, so `pnpm lint && <anything>` passed. Six new tests (`&&`, `;`, `|`, `$()`, backticks, `>`) failed against the old rule. The rule now requires a full match: an approved script plus plain arguments.
- **GRAVE-010 satisfied by documentation.** The sandbox-policy rule accepted any `.kiro` text containing `sandbox-policy`, so a spec table that only named the file counted as a policy. The rule now requires a `Sandbox policy` heading in a steering file, since steering is what the agent actually loads.

Second run, after the rule fixes: **2 findings in GraveScan's own config**.

| Finding | Location | Fix |
|---|---|---|
| GRAVE-003 High: hook runs a command outside the allowlist | `.kiro/hooks/post-task-verify.json:7`, `pnpm lint && pnpm typecheck && pnpm test` | Added a `pnpm verify` script; the hook now runs that single command |
| GRAVE-010 Medium: no sandbox policy | project-wide | Added a `Sandbox policy` heading to `.kiro/steering/security-boundaries.md` |

The third run flagged the new self-scan hook itself (`pnpm self-scan` was not in the allowlist). It was added deliberately. Current result: **0 findings**, enforced by `pnpm self-scan` in CI.

## Security audit (cloudflare/security-audit-skill)

Run 1, 2026-11-13, on commit `23ecc8c`, profile `quick`. The skill keeps audit output outside the repository; the full run lives at `security-audit-skill/GraveScan/run-1/` next to the repo in the development sandbox (`REPORT.md`, `findings.json`, `coverage-ledger.json`).

- **Process.** 4 reconnaissance agents, 5 hunters over 15 coverage units, 1 final coverage critic, and 1 independent verifier. Both skill validators (`validate-findings.cjs`, `validate-coverage-ledger.cjs`) pass.
- **Sandbox.** Target code ran only inside a bubblewrap sandbox: unprivileged uid, no network, empty environment, read-only minimal mounts, a 64 MiB tmpfs as the only writable path, and process, memory, file, and time limits. A reconnaissance agent found the first version of the sandbox exposed the whole host read-only and did not enforce its process limit; it was fixed before any target code ran.
- **Result.** 1 confirmed **low** finding: a request whose session is evicted while its body is still pending recreates that session's work copy, so disk use is no longer bounded by `maxSessions` (reproduced: 5 directories against a cap of 2). Hardening notes include the `--fail-on` inherited-key check (`constructor` passes) and missing request timeouts.
- **Coverage.** 13 units covered, 1 confirmed, 4 deferred by the final critic (cross-visitor eviction, simulator replay, Markdown report, and one reopened unit). This is a partial pass by design of the `quick` profile.
- 2026-11-13. Performance review found that the static build used stable `/assets/app.js`, `/assets/engine.js`, and stylesheet URLs. Long-lived caching would have risked a stale scanner after deploy; no cache wastes repeat-visit bandwidth. `scripts/build-web.ts` now content-hashes every static asset, while `_headers` caches only `/assets/*` immutably and leaves `index.html` revalidated. Build and static-server tests enforce this boundary.
- 2026-11-13. Local project validation initially counted JavaScript characters after file decoding, while the advertised limit was bytes. Non-ASCII input could exceed the stated byte cap. The engine now uses `TextEncoder` bytes at the trust boundary; the file picker still screens by the browser-provided byte size before it reads a file.
- 2026-11-13. A lab audit of the triage view showed that findings were listed in file and line order, so the medium GRAVE-010 sat above three high findings and was selected by default. The list now orders by risk and selects the highest; Playwright asserts the order. The engine's own order is unchanged because reports and SARIF depend on it.
- 2026-11-13. The first worker measurement used Playwright's `setInputFiles` with 500 files and reported a 473 ms long task. Rebuilding the files inside the page and observing only after setup showed the app's own task was 102 to 124 ms (CPU 1x) and 296 to 309 ms (CPU 4x); the rest was the test harness. Spec 07 records only the in-page numbers. Lesson: measure the app, not the tool driving it.
- 2026-11-13. Enabling `require-trusted-types-for 'script'` initially stopped every browser test: `new Worker(WORKER_URL)` is a TrustedScriptURL sink in Chromium. The renderer was already moved to DOM builders, but the worker URL needed the narrowly named `gravescan` policy. The page now creates that policy only for its build-time worker URL; browser E2E verifies the whole flow under the enforced CSP.
- 2026-11-15. The first SARIF upload workflow failed even though the SARIF builder was valid. Redirecting `pnpm gravescan … --format sarif` wrote pnpm's `> gravescan…` script banner before the JSON. GitHub's upload action correctly rejected it as invalid JSON. The workflow now calls the Node CLI directly, validates `JSON.parse` before upload, and uses `github/codeql-action/upload-sarif@v4`. The next run successfully ingested the empty self-scan log.
