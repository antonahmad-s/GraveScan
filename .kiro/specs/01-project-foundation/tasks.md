# Tasks: Project Foundation

Status key: `[x]` implemented and checked, `[~]` implemented but not yet run through its real toolchain, `[ ]` not done.

The sandbox that built this had no npm registry access. Code was checked with Node 22 type stripping, `tsc` 5.9 (strict), and Bun running the tests through a temporary `vitest` shim. Vitest, fast-check, ESLint, and `pnpm install` have not run yet. Run `pnpm install && pnpm lint && pnpm typecheck && pnpm test` once to close the `[~]` items.

- [x] 1. Initialize the monorepo
  - Root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` (strict), `eslint.config.js`, `vitest.config.ts`.
  - Packages `scanner`, `simulator`, `patcher`, `reporting`, `fixtures`, `cli`, and `apps/web`, each with `src/index.ts` and a tsconfig.
  - `apps/web` is a stub package. Next.js arrives in Spec 05.
  - _Requirements: 1.1, 1.2_

- [~] 2. Define root scripts and quality gates
  - `lint`, `typecheck`, `test`, `docs:check`, `repo:check`, `gravescan` scripts.
  - `docs:check` verifies README links and that each spec has requirements, design, tasks and is listed in the specs index.
  - `docs:check`, `repo:check`, `typecheck`, and the CLI were run directly. `lint` and `test` via pnpm were not.
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Implement safe path resolution
  - [x] 3.1 `Result` type and `FixtureError` type, plus Zod schemas in `@gravescan/fixtures/schemas`.
  - [x] 3.2 `checkRelative` and `resolveSafe` reject traversal, absolute paths, and symlink escapes.
  - [~] 3.3 Property test in `tests/property/path-safety.property.test.ts`. The same invariants held over 2,000+ seeded random inputs, but the fast-check file itself has not run.
  - _Requirements: 3.2_

- [x] 4. Implement the fixture loader
  - [x] 4.1 `listFixtures` (sorted) and `loadFixture` (sorted files, `dot-kiro/` exposed as `.kiro/`, symlinks rejected).
  - [x] 4.2 Unit tests: three fixture IDs, unknown ID returns `UNKNOWN_FIXTURE`.
  - [~] 4.3 Property test in `tests/property/fixtures-determinism.property.test.ts` (fast-check file not yet run).
  - _Requirements: 3.1, 3.3, 5.1_

- [x] 5. Create the three fixtures
  - [x] 5.1 `unsafe-mcp`: shell-capable auto-approved MCP tool, no allowlist, canary token.
  - [x] 5.2 `unbounded-hook` and `steering-injection`: minimal versions.
  - [x] 5.3 README in each fixture labels it intentionally vulnerable.
  - [x] 5.4 Unit tests: READMEs present; only `GRAVESCAN_CANARY_` secret-like tokens appear, and the check is shown to fail on a real-looking token.
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 6. Implement the isolated work copy
  - [x] 6.1 `createWorkCopy` and `resetWorkCopy` under `.gravescan-work/`. Reset recomputes the root from the fixture ID and refuses a forged root.
  - [~] 6.2 Property test in `tests/property/workcopy-isolation.property.test.ts` (fast-check file not yet run; invariant held over 100 random operation sequences).
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Add the CLI stub
  - `gravescan list` prints fixture IDs. Unknown or missing commands print usage and exit 1. `scan` is intentionally unknown until Spec 02.
  - _Requirements: 2.1_

- [ ] 8. Add CI
  - `.github/workflows/ci.yml` runs install, lint, typecheck, test, docs:check, and repo:check on Node 22.
  - Not confirmed: needs a first run on GitHub and a committed `pnpm-lock.yaml`.
  - _Requirements: 6.1_

- [x] 9. Add the repository readiness check
  - `scripts/repo-check.ts` asserts `.kiro/` has non-empty `specs`, `steering`, and `hooks`, that no `.kiro` path is git-ignored (via `git check-ignore`), and that `LICENSE` is open source. Wired into CI.
  - _Requirements: 7.1, 7.2_

- [ ] 10. Checkpoint
  - Run `pnpm install && pnpm lint && pnpm typecheck && pnpm test` with registry access, commit `pnpm-lock.yaml`, and record any bug a property test or hook catches in `docs/kiro-workflow.md`.

Property tests are required by `.kiro/steering/testing-contract.md`, so do not skip them.
