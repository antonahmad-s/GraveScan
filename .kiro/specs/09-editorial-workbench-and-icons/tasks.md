# Tasks: Editorial Workbench and Icon Set

- [x] 1. Rewrite `index.html` around the masthead and the three numbered stages; describe each bundled case. Covered by `scripts/build-web.test.ts` (fixture buttons stay in the markup) and Playwright.
- [x] 2. Rewrite `styles.css`: ink and paper themes, violet accent, serif display type, breakpoints at 640, 960, 1000, and 1200px, hover styles for hover-capable pointers only, state-change motion inside `prefers-reduced-motion: no-preference`. Covered by the Playwright overflow and tap-target tests at four widths.
- [x] 3. Update `app.js`: in-place case buttons, marker-only selection, the evidence trail, `reveal()`, inline errors, and the clean-scan message. Covered by Playwright, including a no-safe-patch error test.
- [x] 4. Add `apps/web/public/` with the icon set and manifest; copy it in the build and serve its types locally. Covered by `scripts/build-web.test.ts`, `scripts/serve-dist.test.ts`, and a Playwright icon test.
- [x] 5. Check contrast in both themes, review screenshots at 390, 768, 1060, and 1440px, and measure load in the lab. Recorded in `docs/ui-delivery-gate.md`.
- [ ] 6. Replace the redrawn logo files with the owner's original RealFaviconGenerator export if the owner wants an exact match.
