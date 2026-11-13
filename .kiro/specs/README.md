# Specs

Each spec follows Requirements, then Design, then Tasks.

| # | Spec | Scope |
|---|---|---|
| 01 | project-foundation | monorepo, scripts, test setup, lint/typecheck, fixture loader, CI |
| 02 | scanner-rule-engine | parsers, finding schema, GRAVE-001..010, line evidence, malformed input, self-scan |
| 03 | safe-attack-simulator | capability model, scenarios, policy evaluator, exposed/blocked |
| 04 | patch-verification-loop | patch generator, isolated copy, diff, rescan, regression |
| 05 | product-ui-demo-flow | workspace, findings, detail, replay, diff review, report, export, deployment |

Specs 01 through 05 are implemented and verified with `pnpm verify` (ESLint, tsc, Vitest with fast-check), `pnpm test:e2e` (Playwright), and `pnpm self-scan`. See `docs/ui-delivery-gate.md` for the browser delivery gate.
