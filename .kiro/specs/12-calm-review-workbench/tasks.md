# Tasks: Calm Review Workbench

## Status

Implemented on 2026-11-16. Automated checks pass. Tasks 6.3 and 6.4 stay open because they need a person with a screen reader and a non-headless browser.

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

## 5. Visual system

- [x] **5.1 Consolidate the stylesheet.** Spec 9 to 11 overrides were replaced by one token-driven stylesheet with three surface token sets. The stylesheet went from 41,641 to 31,672 bytes. Requirements: R9.
- [x] **5.2 Motion at dial 1.** The rise and stamp animations were removed. Only color, border, and tint transitions and smooth scrolling remain, all inside `prefers-reduced-motion: no-preference`. Requirements: R10.2.
- [x] **5.3 Measure contrast.** All changed pairs pass; see `docs/ui-delivery-gate.md`. Requirements: R10.1, AC-06.

## 6. Verification

- [x] **6.1 Automated checks.** `pnpm lint`, `pnpm typecheck`, `pnpm test` (250 tests), `pnpm build`, `pnpm test:e2e` (30 tests), `pnpm docs:check`, `pnpm repo:check`, and `pnpm self-scan` (0 findings) pass. Page script 22,452 bytes, Worker 92,022 bytes. Requirements: R1.3, R11.1.
- [x] **6.2 Responsive, zoom, theme, and keyboard review.** Screens at 390, 768, 1060, and 1440px in both themes for initial, scanned, replay, patch, and verified states; 320px verified state; 640 by 360 CSS px at device scale 2 (200 percent page zoom on 1280 by 720); 200 percent root text size at 1280 by 720 and 1440 by 900. No page overflow, no clipped text, and no visible button under 44px. Requirements: R4.3, R11.2, R11.3.
- [ ] **6.3 Screen-reader smoke test.** Not run: the sandbox has no screen reader. Check the finding-selection announcement, stage headings, and the single live status with VoiceOver or NVDA before claiming WCAG 2.2 AA conformance. Requirements: R10.1.
- [ ] **6.4 True browser zoom.** Headless Chromium cannot apply keyboard zoom. The equivalent CSS viewport and text-size checks passed; repeat with Ctrl or Cmd plus at 200 percent in a desktop browser. Requirements: R11.3.
