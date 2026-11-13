# Code Conventions

- TypeScript strict mode, end to end. pnpm workspaces.
- Zod schemas are the source of truth for `Finding`, `AttackScenario`, and `Patch`; infer types from them.
- Rule IDs are stable: `GRAVE-001` to `GRAVE-010`. Never renumber.
- Rules are pure functions: `(document) => Finding[]`. No I/O, no clock, no randomness.
- Sort findings deterministically (file, line, ruleId).
- Parsers return a document or a diagnostic. They never throw on malformed input.
- Small packages with explicit exports: scanner, simulator, patcher, reporting, fixtures.
