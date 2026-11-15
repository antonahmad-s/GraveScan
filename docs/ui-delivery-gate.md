# UI Delivery Gate

Antislop mode: during. Last run 2026-11-13 with `pnpm test:e2e` (Playwright 1.62.1) against the bundled Chromium headless shell. The same suite runs in CI on a downloaded Chromium.

## Hard gate

- **R-02:** No em dash character in the HTML, CSS, or browser JavaScript sources (checked with `grep`).
- **R-03:** E2E checks 390, 768, 1060, and 1440px after a full scan, patch, and verify flow: no horizontal overflow, and every visible button is at least 44px tall.
- **R-17, R-18, R-36, R-38:** No metrics, testimonials, customer claims, or external logos. The before/after counts come from real scanner output.
- **R-23:** No visual assets were created. The app uses a text wordmark.
- **R-24, R-26:** No dead navigation. E2E clicks fixture choice, scan, filters, detail, replay, patch generation, apply, export, reset, and theme.
- **R-25:** Contrast checker, all text pairs in both themes: 6.62:1 to 16.76:1. New comparison text: 8.38:1 (dark muted), 13.13:1 (dark heading), 6.91:1 (light muted), 13.68:1 (light heading).
- **R-27:** Empty, filter-empty, busy, error, and success states exist; fixture buttons are in the static markup and disabled until the worker is ready, so the loading state does not shift the layout; e2e asserts the empty and filter-empty states, and the empty-paste error, which returns focus to the paste box.
- **R-32, R-39:** First Tab reaches the skip link; Enter activates buttons; focus stays on the same item after a list re-renders (asserted for fixtures and findings); focus outline is visible.
- **R-33:** All UI changes were written in source. No rewrite scripts.
- **R-34:** E2E toggles light and dark; screenshots of the verification panel were reviewed in both themes.
- **R-35:** Click-through recorded by the e2e suite above, with zero browser console errors asserted. The local-project section is covered by the paste and folder e2e tests, and was reviewed in screenshots at 1440 and 390px in both themes.
- **R-40:** No images, media, or third-party scripts. `dist/_headers` sets a CSP that allows same-origin scripts, styles, and requests only. E2E runs against the built static site and fails on any request other than the page's own five static files. The DOM renderer has no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write` sink, and the browser E2E suite loads hostile `<img onerror>` text without creating an element. Static delivery is content-hashed: `scripts/build-web.test.ts` verifies the four fingerprinted assets, their references, immutable asset caching, and a 125 KB uncompressed engine budget. Lab measurements (Chromium headless, 4x CPU slowdown, about slow 4G; see Spec 07): LCP 636 to 672 ms, CLS 0.0000, and no main-thread task over 50 ms while loading a 500-file project or generating and applying a patch. These are lab numbers, not field data, so no Core Web Vitals score is claimed.

## Purpose and liveliness

- **Dials:** ENERGY 2 / RHYTHM 3 / MOTION 1, declared in Spec 05 and `docs/design-decisions.md`.
- **Focal point:** the selected finding and its evidence trail.
- **Accent and motif:** amber marks selection and the evidence trail; green is used only for verified results; red only for severity.
- **Comparison panel:** two plain lists ("Resolved since first scan", "Introduced since first scan") with counts, because the before/after outcome is the evidence a reviewer needs, and lists read faster than cards for one or two items.
