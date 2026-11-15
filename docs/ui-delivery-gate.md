# UI Delivery Gate

Antislop mode: during. Last run 2026-11-15 for Spec 09 with `pnpm test:e2e` (Playwright 1.62.1) against the bundled Chromium headless shell, plus reviewed screenshots at 390, 768, 1060, and 1440px in both themes. The same suite runs in CI on a downloaded Chromium.

## Hard gate

- **R-02:** No em dash character in the HTML, CSS, or browser JavaScript sources (checked with `grep`).
- **R-03:** E2E checks 390, 768, 1060, and 1440px after a full scan, patch, and verify flow: no horizontal overflow, and every visible button is at least 44px tall. The layout has states at 640, 960, 1000, and 1200px.
- **R-17, R-18, R-36, R-38:** No metrics, testimonials, customer claims, or external logos. "Ten deterministic rules" is the rule engine's count (GRAVE-001 to GRAVE-010). The before/after counts come from real scanner output.
- **R-23:** The only visual asset is the owner's tombstone logo, supplied on 2026-11-15. `apps/web/public/icon0.svg` is redrawn from the owner's image; the PNG and ICO sizes are rendered from it. No other image, icon pack, or illustration was added.
- **R-24, R-26:** No navigation links. E2E clicks fixture choice, scan, filters, finding detail, replay, patch generation, apply, export, reset, theme, folder input, and paste.
- **R-25:** All text pairs in both themes, including the selected card and row tints and the diff line tints: 6.25:1 to 17.07:1 in dark, 4.69:1 to 17.13:1 in light. Component borders, markers, and the focus ring: 3.20:1 or more in dark, 3.07:1 or more in light.
- **R-27:** States for empty (no case), filter-empty, clean scan (no rule matched, worded so it does not claim safety), loading (disabled cases plus "Loading the scanner in this tab."), busy (header scan line and status text), error (header status plus a message next to the failing control), and success. E2E asserts the empty, filter-empty, empty-paste, and no-safe-patch error states.
- **R-32, R-39:** First Tab reaches the skip link; Enter activates buttons; focus stays on the same item after a selection (asserted for cases and findings); the focus outline is visible in both themes. `cursor: pointer` is set once in the base layer; hover styles apply only on hover-capable pointers. One `h1`, no skipped heading levels, `header`/`main`/`footer` landmarks.
- **R-33:** All UI changes were written in source. No rewrite scripts. The icon renders were made once with a scratch script outside the repository and committed as files.
- **R-34:** E2E toggles light and dark; screenshots of every stage were reviewed in both themes.
- **R-35:** Click-through recorded by the e2e suite above (15 tests), with zero browser console errors asserted in the full flow and the paste flow, and zero console errors across the screenshot runs.
- **R-40:** The only image is the 30px logo in the header, with `width` and `height`; it is not the largest element. No third-party scripts or fonts. `dist/_headers` sets a CSP that allows same-origin scripts, styles, images, and requests only. E2E runs against the built static site and fails on any request other than the document, the four fingerprinted assets, and the fixed-name icon set. The DOM renderer has no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write` sink, and the browser E2E suite loads hostile `<img onerror>` text without creating an element. Lab measurements on this build (Chromium headless, 4x CPU slowdown, 1.6 Mbps and 150 ms latency, three runs per width): LCP 740 to 812 ms at 390px and 740 to 748 ms at 1440px, CLS below 0.0001. These are lab numbers, not field data, so no Core Web Vitals score is claimed.

## Purpose and liveliness

- **Dials:** ENERGY 2 / RHYTHM 3 / MOTION 2, declared in Spec 09, `docs/design-decisions.md`, and `.kiro/steering/ui-direction.md`.
- **Focal point:** the selected finding in the case file and its evidence trail.
- **Accent and motif:** violet from the logo's scan line marks the selection and the evidence trail; green is used only for verified results; red only for severity and danger. The scan line is drawn once under the masthead and reused as the busy indicator.
- **Rhythm:** an asymmetric masthead, a card grid with a side panel, then a sticky queue beside a raised case file. No two sections share a composition.
- **Comparison panel:** two plain lists ("Resolved since first scan", "Introduced since first scan") with counts, because the before/after outcome is the evidence a reviewer needs.
