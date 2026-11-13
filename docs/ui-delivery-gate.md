# UI Delivery Gate

The browser delivery gate passed on 2026-11-13 using the sandbox's bundled `chrome-headless-shell`. The server and browser ran in one bounded command because this sandbox stops background processes when a tool invocation ends.

## Verified in the sandbox

- **R-02:** No em dash character in the HTML, CSS, and browser JavaScript sources.
- **R-03:** Browser checked 390px, 768px, and 1060px widths after both initial load and scan. No horizontal overflow. All visible buttons have a minimum 44px height.
- **R-17, R-18, R-36, R-38:** No metrics, testimonials, customer claims, or external logos are shown.
- **R-23:** No visual assets were created. The app uses a text wordmark, and the owner provided page structure and visual direction in the PRD.
- **R-24, R-26:** Header has no dead navigation. Browser click-through verified fixture choice, scan, filters, detail, replay, patch generation, apply, reset, export, and theme controls.
- **R-25:** Contrast checker results for all text pairs are 6.62:1 to 16.76:1.
- **R-27:** Browser exercised empty, loading-adjacent action state, filter-empty, success, and error-capable source paths.
- **R-32, R-39:** Native buttons/selects, a skip link, semantic landmarks, labels, status regions, and visible focus styling are in source. The browser verified first Tab reaches the skip link.
- **R-33:** UI source was written directly. No source/CSS rewrite script exists.
- **R-34:** Browser verified both light and dark theme toggles.
- **R-40:** No images, media, or third-party scripts are used.
- **Console:** The complete browser click-through produced no console errors.

## Browser click-through

1. Select `unsafe-mcp`, scan, choose GRAVE-001, and read evidence.
2. Run safe replay and verify `exposed`.
3. Generate and apply patch, then verify `Simulation blocked`.
4. Filter by severity and rule, including a filter-empty state.
5. Toggle light and dark themes.
6. Export a Markdown report and reset, confirming GRAVE-001 returns.
7. Check keyboard access through the skip link and test responsive widths 390px, 768px, and 1060px.

## Purpose and liveliness

- **Dials:** ENERGY 2 / RHYTHM 3 / MOTION 1, declared in Spec 05 and `docs/design-decisions.md`.
- **Focal point:** the selected finding and its evidence trail.
- **Accent and motif:** amber only marks selection and the evidence trail, linking finding, replay, patch, and verification.
- **Design decisions:** each major decision has a one-line reason in `docs/design-decisions.md`.

The server-side HTTP integration test also exercises fixture listing, scan, replay, patch generation, apply, verification, reset, and static asset responses.
