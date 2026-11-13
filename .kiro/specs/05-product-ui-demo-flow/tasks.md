# Tasks: Product UI and Demo Flow

- [x] 1. Add a Node 22 dependency-free server and strictly scoped fixture-only API routes.
- [x] 2. Add workbench markup, styles, and browser interactions.
- [x] 3. Implement fixture selection, scan, filters, detail, replay, patch, apply, reset, Markdown export, loading, error, and success states.
- [x] 4. Add UI design decisions, project-level antislop during mode, and contrast checks.
- [x] 5. Add HTTP end-to-end integration test for static assets and full API flow.
- [x] 6. Browser click-through and delivery gate, see `docs/ui-delivery-gate.md`.
- [x] 7. Re-evaluate the Next.js runtime once the registry is available. Kept the Node server; reasons are in `design.md`.
- [x] 8. Isolate visitors with a session cookie and per-session work copies, with eviction and startup cleanup. Covered by HTTP and Playwright tests.
- [x] 9. Build the before/after Markdown report in `@gravescan/reporting`, serve it from `/api/report`, and show resolved and introduced findings in the verification panel.
- [x] 10. Add Playwright e2e in `tests/e2e` (`pnpm test:e2e`) covering the demo flow, filters, themes, keyboard focus, four viewport widths, and visitor isolation. Runs in CI.
- [x] 11. Add `Dockerfile`, `docker-compose.yml`, `/healthz`, and `HOST`/`PORT` configuration for deployment. The production install and server start were verified without a container runtime; the image itself has not been built here.
- [ ] 12. Deploy to a public URL and record it in the Devpost form. Requires the owner's hosting account.
