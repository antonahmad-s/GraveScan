# Tasks: Scanner and Rule Engine

Status key: `[x]` implemented and verified in the sandbox, `[~]` implemented but awaiting its specified npm toolchain.

- [x] 1. Define Zod schemas and public scanner API.
- [x] 2. Add pure parsing and malformed JSON diagnostics.
- [x] 3. Implement stable GRAVE-001 through GRAVE-010 rules and contract validation.
- [x] 4. Implement deterministic `scanFiles` and `scanFixture`.
- [x] 5. Add positive and negative coverage for every rule, including GRAVE-008 internal remediation contract.
- [~] 6. Add fast-check properties for determinism, malformed input, and evidence validity. Source: `tests/property/scanner.property.test.ts`. In this sandbox the equivalent seeded checks passed 1,000 cases; fast-check itself is awaiting `pnpm install`.
- [x] 7. Extend CLI: `gravescan scan --fixture <id> --format json`; reject arbitrary targets and unknown options.
- [~] 8. TypeScript strict checking and 134 Bun tests pass. Vitest, fast-check, ESLint, and pnpm install await npm registry access.
