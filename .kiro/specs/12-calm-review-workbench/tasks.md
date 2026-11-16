# Tasks: Calm Review Workbench

## Status

Implemented on 2026-11-16 and approved by the owner the same day, subject to the final validation in tasks 4.6, 4.7, and 6.5, which is complete. Automated checks pass. Tasks 6.3 and 6.4 stay open because they need a person with a screen reader and a non-headless browser.

## 1. Baseline

- [x] **1.1 Record the pre-change baseline.** `pnpm lint`, `pnpm typecheck`, `pnpm test` (28 files, 250 tests), and `pnpm test:e2e` (30 tests) passed before any change. Screenshots of initial, scanned, replay, patch, and verified states were captured at 390, 768, 1060, and 1440px in both themes. Requirements: R1.1, R11.1.

## 2. First screen and source choice

- [x] **2.1 Rewrite the intro.** New headline, supporting sentence, four capabilities, and the safety notice. The aperture is an 11rem emblem beside the copy and hidden below 760px. Requirements: R2.
- [x] **2.2 Rebuild the source panel.** One stone panel with Your project and Controlled examples, radio-style source options with a "Selected" word, and a selected-source bar with scan and reset. Static fixture buttons keep `data-fixture` and `disabled` for the build test. Requirements: R3.1, R3.2, R3.4.
- [x] **2.3 Stop the silent scan after a folder load.** The folder load reports loaded and skipped files, selects Your project, and focuses "Scan current project". Paste still scans at once, as its label says. Evidence: the folder E2E test asserts no findings and a focused primary scan button before the click. Requirements: R3.3.
- [x] **2.4 Put errors at their cause.** Folder errors under the folder button, paste errors under the textarea with `aria-invalid`, scan errors in the source bar, case-action errors inside their stage. Evidence: state captures for no `.kiro` folder, empty paste, and a forced Worker failure during replay. Requirements: R8.2.

## 3. Review workspace and findings

- [x] **3.1 Two-column review grid.** Queue capped at min(23rem, 38%), case file as the only card, sticky queue at 960 by 640px and larger. Requirements: R4.1.
- [x] **3.2 Findings rows.** Severity tag, rule ID, title, file and line, replay or static label, and a 4px plum bar with `aria-current` for the selected row. Requirements: R5.1.
- [x] **3.3 Filter feedback.** "N of M findings shown" or "No findings match these filters. Clear filters to review all current findings." The filter panel stays hidden until a scan has findings. Requirements: R5.2, R5.3.

## 4. Case file and focus

- [x] **4.1 Stage-based case file.** Scan, Replay, Patch, and Verify render as one ordered trail with text states and shape markers. Requirements: R7.1, R7.3.
- [x] **4.2 One primary per stage.** `nextStage()` makes replay primary first, then the patch proposal, then "Apply to isolated copy". Evidence: E2E class assertions in the demo flow test. Requirements: R7.2.
- [x] **4.3 Focus follows results.** Finding selection focuses the case title; scan and reset focus the Findings heading; replay, patch, and apply focus their stage heading; errors focus the stage error; "Clear filters" returns to the severity filter. Evidence: the keyboard E2E test and the four-width keyboard audit. Requirements: R6.1, R6.2.
- [x] **4.4 Return path and header safety.** "Back to findings" before the case title, visible on focus at wide widths; measured header height for scroll padding and the sticky queue; a focus-in safety net for the sticky header. Evidence: a reverse-Tab walk from the bottom of a verified case found no control hidden under the header at 1440 by 900 and 1060 by 800. Requirements: R6.3, R10.1.
- [x] **4.5 Escape closes disclosures.** Evidence: the keyboard E2E test opens the paste box, tabs into the textarea, presses Escape, and asserts the box is closed with focus on its summary. Requirements: R6.3.
- [x] **4.6 Mouse and touch return path (owner review).** "Back to findings" stays visible on phones, tablets, and short desktop windows, and is focus-only only where the sticky queue keeps every finding beside the case file. Evidence: a new E2E test clicks the visible link at 390 by 844 and 1280 by 600 from the bottom of the page and asserts the selected finding is focused and in view, then confirms at 1440 by 900 that another finding stays in view and clickable with the page scrolled to the bottom. Requirements: R4.4.
- [x] **4.7 Focus moves under scroll and layout changes.** Found during final validation: a zero-delay focus and activation (as assistive technology can send) let the browser's own focus scroll carry the case title out of view at 1280 by 600, and Export Markdown's notice pushed the resting sticky queue's Export button under the header at 1440 by 900. `focusTarget()` now re-checks its target after 150 ms and treats a moving page as needing a scroll, and a ResizeObserver on the queue keeps a focused queue control below the header. Evidence: probes show the case title at 216px with 0 and 100 ms gaps and the Export button at 81px after export. Requirements: R6.1, R6.3.

## 5. Visual system

- [x] **5.1 Consolidate the stylesheet.** Spec 9 to 11 overrides were replaced by one token-driven stylesheet with three surface token sets. The stylesheet went from 41,641 to 31,672 bytes. Requirements: R9.
- [x] **5.2 Motion at dial 1.** The rise and stamp animations were removed. Only color, border, and tint transitions and smooth scrolling remain, all inside `prefers-reduced-motion: no-preference`. Requirements: R10.2.
- [x] **5.3 Measure contrast.** All changed pairs pass; see `docs/ui-delivery-gate.md`. Requirements: R10.1, AC-06.

## 6. Verification

- [x] **6.1 Automated checks.** `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (28 files, 250 tests), `pnpm build`, `pnpm test:e2e` (31 tests), `pnpm docs:check`, `pnpm repo:check`, and `pnpm self-scan` (0 findings) pass. Page script 22,820 bytes, Worker 92,022 bytes. Requirements: R1.3, R11.1.
- [x] **6.5 Final validation against `main` (owner review).** No file under `packages/`, the Worker sources, or `wrangler.jsonc` changed. CLI `list`, JSON and SARIF scans of all three fixtures, a JSON and SARIF `--path` scan, and the `--fail-on high` exit code (1) are byte-identical to `main`. The built Worker (`worker.dfc3921264cf.js`), fixture bundle, and `_headers` are byte-identical to `main`. The module-minified page script parses as a module, has no import or export statements, still starts a classic Worker from the hashed URL, and makes the same single same-origin `fetch` as `main`. `wrangler deploy --dry-run` completes. The simulator still has exactly four scenarios and every emitted scenario ID resolves. Requirements: R1.1, R1.2, R1.3, AC-07, AC-08.
- [x] **6.2 Responsive, zoom, theme, and keyboard review.** Screens at 390, 768, 1060, and 1440px in both themes for initial, scanned, replay, patch, and verified states; 320px verified state; 640 by 360 CSS px at device scale 2 (200 percent page zoom on 1280 by 720); 200 percent root text size at 1280 by 720 and 1440 by 900. No page overflow, no clipped text, and no visible button under 44px. Requirements: R4.3, R11.2, R11.3.
- [ ] **6.3 Screen-reader smoke test.** Not run: the sandbox has no screen reader. Check the finding-selection announcement, stage headings, and the single live status with VoiceOver or NVDA before claiming WCAG 2.2 AA conformance. Requirements: R10.1.
- [ ] **6.4 True browser zoom.** Headless Chromium cannot apply keyboard zoom. The equivalent CSS viewport and text-size checks passed; repeat with Ctrl or Cmd plus at 200 percent in a desktop browser. Requirements: R11.3.
