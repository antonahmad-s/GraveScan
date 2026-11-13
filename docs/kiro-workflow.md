# How Kiro Was Used

Honest, evidence-based write-up. Fill each row as work happens; delete anything not actually used.

| Devpost question | GraveScan plan | Evidence |
|---|---|---|
| IDE / CLI / Web / Crew | IDE or Web for specs and code; CLI for scans and CI-like runs. Note real differences here. | _TODO_ |
| Custom agents | `scanner-analyst`, `patch-engineer`, `release-reviewer` | `.kiro/agents/` |
| Hooks | Post-task verify, rule regression, self-scan of `.kiro`, docs check | `.kiro/hooks/` |
| Spec-driven | Five specs. Compare against vibe coding on one module. | `.kiro/specs/` |
| Steering | Product contract, security boundaries, testing contract, UI direction | `.kiro/steering/` |
| MCP | Custom `gravescan-dev` (list_fixtures, run_fixture_scan, run_attack_replay, get_finding, generate_patch, verify_patch). GitHub MCP optional. | `.kiro/settings/mcp.json` |
| PBT | fast-check: determinism, parser robustness, evidence validity, patch idempotence, no new high-risk finding | `tests/property/` |
| Skills | `antislop` (MIT, v3.2.29) installed in `.kiro/skills/` from github.com/miqdadbadjuber/anti-slop. `antislop-code` governs code comments; `antislop-ui`, `antislop-human`, and `antislop-layoutmobile` apply from Spec 05. | `.kiro/skills/` |
| Powers | List only the powers actually used. | _TODO_ |

## Real incidents log
Record at least one concrete case where a spec, hook, or property test caught a bug.

- _TODO: date, what failed, which Kiro feature caught it, how it was fixed._

- Spec 01 execution happened in a sandbox without npm registry access. The code was verified with Node type stripping, `tsc` strict mode, Bun, and a seeded random script. Vitest, fast-check, and ESLint had not run yet. No bug was caught by a property test so far, so nothing is claimed here.

## Vibe vs spec comparison
- _TODO: pick one module, note time, rework, and bugs under each approach._

## Self-scan
GraveScan scans its own root `.kiro/` (hook `self-scan.json`). Record results here.
