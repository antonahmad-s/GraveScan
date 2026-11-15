# Tasks: Worker Engine, Triage Order, and Code Scanning

- [x] 1. Pass existing scans into patch generation and verification; one scan per engine action. Covered by existing engine and patcher tests.
- [x] 2. Add `worker-protocol.ts` and `engine-worker.ts`; move folder planning and file reading into the worker. Covered by `apps/web/test/worker-protocol.test.ts`.
- [x] 3. Switch `app.js` to the worker; order findings by risk and select the highest. Covered by Playwright.
- [x] 4. Preload the fixture bundle and render fixture buttons in static markup. Covered by `scripts/build-web.test.ts`.
- [x] 5. Add COOP, CORP, and Permissions-Policy headers. Covered by build tests and checked under `wrangler dev`.
- [x] 6. Add `--format sarif` to the CLI. Covered by `packages/reporting/test/sarif.test.ts` and CLI tests.
- [x] 7. Document code scanning, the worker boundary, and the measurements.
- [ ] 8. Upload SARIF to a live GitHub code scanning instance and confirm alerts render. Needs a repository with code scanning enabled.
