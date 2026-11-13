# UI Delivery Gate

Antislop mode: during. Last run 2026-11-13 with `pnpm test:e2e` (Playwright 1.62.1) against the bundled Chromium headless shell. The same suite runs in CI on a downloaded Chromium.

## Hard gate

- **R-02:** No em dash character in the HTML, CSS, or browser JavaScript sources (checked with `grep`).
- **R-03:** E2E checks 390, 768, 1060, and 1440px after a full scan, patch, and verify flow: no horizontal overflow, and every visible button is at least 44px tall.
- **R-17, R-18, R-36, R-38:** No metrics, testimonials, customer claims, or external logos. The before/after counts come from real scanner output.
- **R-23:** No visual assets were created. The app uses a text wordmark.
- **R-24, R-26:** No dead navigation. E2E clicks fixture choice, scan, filters, detail, replay, patch generation, apply, export, reset, and theme.
- **R-25:** Contrast checker, all text pairs in both themes: 6.62:1 to 16.76:1. New comparison text: 8.38:1 (dark muted), 13.13:1 (dark heading), 6.91:1 (light muted), 13.68:1 (light heading).
- **R-27:** Empty, filter-empty, busy, error, and success states exist; e2e asserts the empty and filter-empty states.
- **R-32, R-39:** First Tab reaches the skip link; Enter activates buttons; focus stays on the same item after a list re-renders (asserted for fixtures and findings); focus outline is visible.
- **R-33:** All UI changes were written in source. No rewrite scripts.
- **R-34:** E2E toggles light and dark; screenshots of the verification panel were reviewed in both themes.
- **R-35:** Click-through recorded by the e2e suite above, with zero browser console errors asserted.
- **R-40:** No images, media, or third-party scripts. CSP allows same-origin scripts and styles only.

## Purpose and liveliness

- **Dials:** ENERGY 2 / RHYTHM 3 / MOTION 1, declared in Spec 05 and `docs/design-decisions.md`.
- **Focal point:** the selected finding and its evidence trail.
- **Accent and motif:** amber marks selection and the evidence trail; green is used only for verified results; red only for severity.
- **Comparison panel:** two plain lists ("Resolved since first scan", "Introduced since first scan") with counts, because the before/after outcome is the evidence a reviewer needs, and lists read faster than cards for one or two items.
