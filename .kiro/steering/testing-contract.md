# Testing Contract

Tools: Vitest, fast-check (PBT), Playwright (e2e).

- Every rule has at least one positive and one negative unit test.
- Property tests (in `tests/property/`):
  - Determinism: `scan(x) === scan(x)`.
  - Parser never crashes on arbitrary JSON or Markdown.
  - Every finding has an existing file, line > 0, valid severity, known rule ID, non-empty remediation.
  - Patch idempotence: applying a patch twice equals applying it once.
  - A `Verified` patch never adds High or Critical findings.
- Replay result after a verified patch must be `blocked`.
- Do not assert on score; assert on findings and replay results.
- Record any real bug caught by PBT or specs in `docs/kiro-workflow.md` (evidence for the write-up).
