# Tasks: Trusted Renderer and SARIF CI

- [x] 1. Replace renderer HTML string sinks with DOM builders and `textContent`.
- [x] 2. Require Trusted Types and create the narrow worker URL policy.
- [x] 3. Add a static sink test and hostile-markup browser E2E test.
- [x] 4. Add least-privilege SARIF upload workflow and update the code-scanning guide.
- [x] 5. Confirm the first GitHub SARIF upload after merge. Completed on the PR workflow on 2026-11-15; it ingested a valid empty self-scan log. Alert rendering with a real finding remains unverified.
