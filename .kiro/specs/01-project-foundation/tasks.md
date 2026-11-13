# Tasks: Project Foundation

Status key: `[x]` implemented and verified with the real toolchain, `[ ]` not done or not yet confirmed.

Verified on 2026-11-13 with `pnpm install` (lockfile committed), `pnpm lint` (ESLint 9), `pnpm typecheck` (tsc 5.9 strict), and `pnpm test` (Vitest 2.1 with fast-check 3.23).

- [x] 1. Initialize the monorepo
  - Root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` (strict), `eslint.config.js`, `vitest.config.ts`.
  - Packages `scanner`, `simulator`, `patcher`, `reporting`, `fixtures`, `cli`, `mcp-dev`, and `apps/web`.
  - The root declares every workspace package as a `workspace:*` devDependency so root-level tests resolve them.
  - _Requirements: 1.1, 1.2_

- [x] 2. Define root scripts and quality gates
  - `lint`, `typecheck`, `test`, `docs:check`, `repo:check`, `dev`, `gravescan` scripts. All pass.
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Implement safe path resolution
  - [x] 3.1 `Result` type and `FixtureError` type, plus Zod schemas in `@gravescan/fixtures/schemas`.
  - [x] 3.2 `checkRelative` and `resolveSafe` reject traversal, absolute paths, and symlink escapes.
  - [x] 3.3 Property test in `tests/property/path-safety.property.test.ts`. Passes under Vitest.
  - _Requirements: 3.2_

- [x] 4. Implement the fixture loader
  - [x] 4.1 `listFixtures` (sorted) and `loadFixture` (sorted files, `dot-kiro/` exposed as `.kiro/`, symlinks rejected).
  - [x] 4.2 Unit tests: three fixture IDs, unknown ID returns `UNKNOWN_FIXTURE`.
  - [x] 4.3 Property test in `tests/property/fixtures-determinism.property.test.ts`. Passes under Vitest.
  - _Requirements: 3.1, 3.3, 5.1_

- [x] 5. Create the three fixtures
  - [x] 5.1 `unsafe-mcp`: shell-capable auto-approved MCP tool, no allowlist, canary token.
  - [x] 5.2 `unbounded-hook` and `steering-injection`.
  - [x] 5.3 README in each fixture labels it intentionally vulnerable.
  - [x] 5.4 Unit tests: READMEs present; only `GRAVESCAN_CANARY_` secret-like tokens appear, and the check is shown to fail on a real-looking token.
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 6. Implement the isolated work copy
  - [x] 6.1 `createWorkCopy`, `readWorkCopy`, and `resetWorkCopy` under `.gravescan-work/`. Reset recomputes the root from the fixture ID and refuses a forged root.
  - [x] 6.2 Property test in `tests/property/workcopy-isolation.property.test.ts`. Passes under Vitest.
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Add the CLI
  - `gravescan list`, `gravescan scan --fixture <id> --format json`, `help`. Unknown commands print usage and exit 1.
  - _Requirements: 2.1_

- [ ] 8. Add CI
  - `.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile`, lint, typecheck, test, docs:check, and repo:check on Node 22.
  - Not confirmed: needs a green run on GitHub. Earlier runs failed before install, and the job log was not readable from the sandbox.
  - _Requirements: 6.1_

- [x] 9. Add the repository readiness check
  - `scripts/repo-check.ts` asserts `.kiro/` has non-empty `specs`, `steering`, and `hooks`, that no `.kiro` path is git-ignored, and that `LICENSE` is open source.
  - _Requirements: 7.1, 7.2_

- [x] 10. Checkpoint
  - Real toolchain run completed and `pnpm-lock.yaml` committed. Bugs it caught are recorded in `docs/kiro-workflow.md`.

Property tests are required by `.kiro/steering/testing-contract.md`, so do not skip them.
