# Tasks: Patch and Verification Loop

- [x] 1. Add trusted `readWorkCopy` to `@gravescan/fixtures`, with forged-root and symlink checks.
- [x] 2. Define patch, error, apply-result, and verification schemas.
- [x] 3. Implement all allowlisted patch transformations and unified diff rendering.
- [x] 4. Apply patches only in validated isolated copies, with conflict and path checks.
- [x] 5. Implement rescan/replay verification statuses.
- [x] 6. Add test coverage for every allowlisted patch kind, original-fixture integrity, idempotence, conflicts, and traversal rejection.
- [~] 7. Add fast-check property source. Equivalent seeded patch checks passed 100 cycles; fast-check awaits npm registry access.
- [~] 8. TypeScript strict checking and Bun tests pass. Run specified pnpm checks after dependencies install.
