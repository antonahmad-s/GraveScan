# Tasks: Scanner and Rule Engine

- [x] 1. Define Zod schemas and public scanner API.
- [x] 2. Add pure parsing and malformed JSON diagnostics.
- [x] 3. Implement stable GRAVE-001 through GRAVE-010 rules and contract validation.
- [x] 4. Implement deterministic `scanFiles` and `scanFixture`.
- [x] 5. Add positive and negative coverage for every rule, including GRAVE-008 internal remediation contract.
- [x] 6. Add fast-check properties for determinism, malformed input, and evidence validity in `tests/property/scanner.property.test.ts`. Passes under Vitest.
- [x] 7. Extend CLI: `gravescan scan --fixture <id> --format json`; reject arbitrary targets and unknown options.
- [x] 8. `pnpm lint`, `pnpm typecheck`, and `pnpm test` (Vitest) pass.
- [x] 9. Add `gravescan self-scan` with `--fail-on`, enable the self-scan hook, and run it in CI. Requirements 5.4 and 5.5.
- [x] 10. Fix two scanner defects found while dogfooding: GRAVE-003 prefix-only allowlist match, and GRAVE-010 accepting any text that named the policy file. Covered by new rule tests.
