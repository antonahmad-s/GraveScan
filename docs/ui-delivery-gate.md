# UI Delivery Gate

This report is intentionally incomplete. The browser click-through has not run because the sandbox image has no usable Chromium binary. Do not claim the UI is production-ready or fully visually verified from this report.

## Verified in the sandbox

- **R-02:** No em dash character in the HTML, CSS, and browser JavaScript sources.
- **R-03:** CSS has narrow-screen layout rules. Browser measurement for horizontal overflow is pending.
- **R-17, R-18, R-36, R-38:** No metrics, testimonials, customer claims, or external logos are shown.
- **R-23:** No visual assets were created. The app uses a text wordmark, and the owner provided page structure and visual direction in the PRD.
- **R-24, R-26:** Header has no dead navigation. Controls have JS handlers: fixture choice, scan, replay, patch generation, apply, reset, filters, export, theme.
- **R-25:** Contrast checker results for all text pairs are 6.62:1 to 16.76:1. See command log from 2026-11-13.
- **R-27:** Empty, loading, error, and success presentation paths exist in `app.js`.
- **R-32, R-39:** Native buttons/selects, a skip link, semantic landmark elements, labels, status regions, and `:focus-visible` styling are in source.
- **R-33:** UI source was written directly. No source/CSS rewrite script exists.
- **R-34:** The toggle updates `data-theme`; both palette definitions exist. Visual browser test is pending.
- **R-40:** No images, media, or third-party scripts are used.

## Purpose and liveliness

- **Dials:** ENERGY 2 / RHYTHM 3 / MOTION 1, declared in Spec 05 and `docs/design-decisions.md`.
- **Focal point:** the selected finding and its evidence trail.
- **Accent and motif:** amber only marks selection and the evidence trail, linking finding, replay, patch, and verification.
- **Design decisions:** each major decision has a one-line reason in `docs/design-decisions.md`.

## Required final browser verification

Run this after Chromium or Playwright is installed:

1. Select `unsafe-mcp`, scan, choose GRAVE-001, replay, generate patch, apply it, confirm `Simulation blocked`.
2. Toggle to light theme and back to dark theme.
3. Export Markdown, then reset and confirm GRAVE-001 returns.
4. Filter by severity and rule, confirming an empty filter state.
5. Tab from the skip link through every control and activate one button with Enter/Space.
6. Test at 390px width for horizontal overflow and usable buttons.
7. Inspect browser console for errors.

The server-side HTTP integration test already exercises fixture listing, scan, replay, patch generation, apply, verification, reset, and static asset responses. It does not replace this browser click-through.
