# Specs

Each spec follows Requirements, then Design, then Tasks.

| # | Spec | Scope |
|---|---|---|
| 01 | project-foundation | monorepo, scripts, test setup, lint/typecheck, fixture loader, CI |
| 02 | scanner-rule-engine | parsers, finding schema, GRAVE-001..010, line evidence, malformed input, self-scan |
| 03 | safe-attack-simulator | capability model, scenarios, policy evaluator, exposed/blocked |
| 04 | patch-verification-loop | patch generator, isolated copy, diff, rescan, regression |
| 05 | product-ui-demo-flow | workspace, findings, detail, replay, diff review, report, export, deployment |
| 06 | local-project-scan | scan a visitor's own .kiro in the browser, CLI `--path`, secret redaction, linear-time rules |
| 07 | worker-and-code-scanning | engine in a Web Worker, risk-ordered triage, load and layout fixes, SARIF output, isolation headers |
| 08 | trusted-renderer-and-sarif-ci | DOM-only renderer, Trusted Types, GitHub SARIF upload workflow |
| 09 | editorial-workbench-and-icons | redesigned responsive workbench, evidence trail, inline errors, owner's logo as favicon and app icon |
| 10 | architectural-security-atelier | owner-reference-inspired ink, mineral paper, and stone interface with scanning aperture and responsive review field |

Specs 01 through 10 are implemented and verified with `pnpm verify` (ESLint, tsc, Vitest with fast-check), `pnpm test:e2e` (Playwright), and `pnpm self-scan`. See `docs/ui-delivery-gate.md` for the browser delivery gate.
