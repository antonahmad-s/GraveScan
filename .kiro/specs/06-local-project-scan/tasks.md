# Tasks: Scan a Real Project

- [x] 1. Replace the GRAVE-009 expression with linear-time `secretAssignments` and add `redactSecrets` and `redactDeep` in `packages/scanner/src/secrets.ts`. Covered by `packages/scanner/test/secrets.test.ts`, including hostile 200 KB lines.
- [x] 2. Make the GRAVE-009 patch target the finding's own line and name the variable after its key. Covered by `packages/patcher/test/secret-patch.test.ts`.
- [x] 3. Add `planLocalImport` and `validateLocalFiles`, plus the `local-project` source and redaction in the engine. Covered by `apps/web/test/local-project.test.ts` and `engine.test.ts`.
- [x] 4. Add the "Your project" UI section: folder picker, paste box, summary, and busy and error states.
- [x] 5. Add `gravescan scan --path <dir>`, redact CLI output, and reject prototype keys in options. Covered by `packages/cli/test/run.test.ts`.
- [x] 6. Add Playwright tests for the paste and folder flows, including redaction and same-origin-only requests.
- [x] 7. Update the README, threat model, design decisions, and UI delivery gate.
