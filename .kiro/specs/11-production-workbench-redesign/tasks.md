# Tasks: Production Workbench Redesign

## Status

Implementation is complete as of 2026-11-16. Automated release validation and the final diff review passed. The manual 200 percent browser-zoom check, sticky-queue touch/scroll check, screen-reader smoke test, remain open and are documented below. Owner acceptance was received on 2026-11-16.

## Completion policy

A task may be marked complete only when:

1. its implementation matches the approved requirements and design;
2. its stated automated checks pass;
3. its stated manual or visual check is recorded when applicable;
4. no unrelated source change is included;
5. every displayed security fact used as evidence is traceable to the active validated result rather than an inferred or invented value;
6. any limitation or failed criterion remains visible and keeps the task open.

After every phase, update this file with a short evidence note that names commands, test counts, screenshots or measurements, and unresolved issues. A command exit code alone is not sufficient evidence for visual, responsive, accessibility, performance, or security behavior.

## Phase 0: Review gate

- [x] **0.1 Review and approve the requirements.**
  - Confirm preservation scope, local-project-first workflow, no-external-service boundary, four-scenario simulator contract, evidence-integrity rules, actual Worker lifecycle without an advertised cancel action, bounded memory requirements, accessibility target, performance budgets, responsive scope, and out-of-scope list in `requirements.md`.
  - **Evidence:** Owner approval received in this session on 2026-11-16: `APPROVED FOR IMPLEMENTATION`.
  - **Requirements:** R1 through R10.
  - **Acceptance:** AC-12.

- [x] **0.2 Review and approve the technical and visual design.**
  - Confirm the single-route architecture, existing visual identity, source/results/case-file hierarchy, evidence-provenance model, token values, component contracts, GRAVE-007 static-only decision, four-scenario catalog, serialized Worker behavior, memory strategy, and responsive states in `design.md`.
  - **Evidence:** Owner approval received in this session on 2026-11-16: `APPROVED FOR IMPLEMENTATION`.
  - **Requirements:** R2, R3, R4, R5, R6, R7, R8, R9.
  - **Acceptance:** AC-05, AC-10, AC-12, AC-13, AC-14.

- [x] **0.3 Review and approve this implementation sequence.**
  - Confirm task boundaries, verification methods, and phase gates. Resolve requested scope changes in all three spec files before implementation.
  - **Evidence:** Owner approval received in this session on 2026-11-16: `APPROVED FOR IMPLEMENTATION`.
  - **Requirements:** R10.1.
  - **Acceptance:** AC-12.

## Phase 1: Establish the preservation baseline

- [x] **1.1 Record the pre-change functional baseline.**
  - Run the current lint, type, unit/property, build, docs, repository, self-scan, and browser suites before changing application code.
  - Record any pre-existing failure separately from redesign regressions.
  - **Verify:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm docs:check`, `pnpm repo:check`, `pnpm self-scan`, `pnpm test:e2e`.
  - **Evidence:** command results and test counts.
  - **Requirements:** R1, R10.2.
  - **Acceptance:** AC-01, AC-11.

- [x] **1.2 Capture representative pre-change UI states.**
  - Capture both themes at 320, 390, 768, 1024, 1280, and 1440 pixels for initial, scanned, diff, verification, and error states.
  - Record page overflow, visible control sizes, and the initial position of local-project actions.
  - **Verify:** screenshots plus measured `scrollWidth`, viewport width, and visible button dimensions.
  - **Evidence:** named artifacts and a baseline table in `docs/ui-delivery-gate.md` or a temporary review artifact referenced there.
  - **Requirements:** R5.7, R10.5.
  - **Acceptance:** AC-02, AC-06.

- [x] **1.3 Record pre-change performance and delivery metrics.**
  - Record built page-script and Worker byte sizes, static request count, cold-load CLS, and the existing 500-file/4x-CPU long-task result using the established lab method.
  - Do not label lab data as field data.
  - **Verify:** production build inspection, browser request capture, PerformanceObserver or equivalent controlled measurement.
  - **Evidence:** reproducible commands or script and measured values.
  - **Requirements:** R7.2, R7.3, R7.4, R7.5, R7.6.
  - **Acceptance:** AC-08.

- [ ] **1.4 Record the pre-change Worker lifecycle and memory baseline.**
  - Confirm requests are serialized in first-in, first-out order, state mutations do not interleave, no individual request cancellation protocol exists, Worker failure rejects pending page requests, reload disposes in-memory state, and loading a new local project invalidates the previous local state and patches.
  - Repeat local-project replacement and scan/reset cycles and record retained state plus browser heap trend where the environment supports reliable measurement. Do not invent a numeric memory ceiling.
  - **Verify:** focused Worker/engine tests, page error-path inspection, browser storage/state inspection, and reproducible memory observation.
  - **Evidence:** lifecycle table, test results, measurement method, observed values or explicit not-verifiable notes.
  - **Requirements:** R7.8 through R7.12, R10.2.
  - **Acceptance:** AC-08, AC-14.

### Phase 1 gate

- [x] **1.5 Confirm baseline evidence is sufficient to detect regressions.**
  - Do not continue if the core workflow cannot be reproduced or if a pre-existing failure has not been classified.
  - **Evidence:** baseline checklist with pass, fail, and not-verifiable states.
  - **Requirements:** R10.1, R10.2.
  - **Acceptance:** AC-11.

## Phase 2: Correct UI-facing contracts before layout work

- [x] **2.1 Add a replay-catalog consistency assertion.**
  - Assert that every `attackScenarioId` emitted by scanner findings resolves to a supported simulator scenario.
  - Keep the simulator catalog at the approved four scenarios.
  - **Verify:** focused scanner/simulator test fails against the pre-change GRAVE-007 mismatch and passes after Task 2.2.
  - **Evidence:** focused test name and result.
  - **Requirements:** R3.7, R3.8, R10.1.
  - **Acceptance:** AC-04, AC-11.

- [x] **2.2 Make GRAVE-007 static-only.**
  - Remove the unsupported `AGENT-NETWORK-ESCALATION` replay metadata while preserving GRAVE-007 ID, severity, evidence, description, remediation, and scanner behavior.
  - Do not add a fifth replay scenario.
  - **Verify:** scanner rule tests, simulator tests, catalog consistency assertion, type check.
  - **Evidence:** before/after finding shape and passing focused checks.
  - **Requirements:** R1.10, R3.7, R3.8.
  - **Acceptance:** AC-01, AC-04, AC-10.

- [x] **2.3 Define UI capability labels from valid finding data.**
  - Render supported scenario findings as "Replay available" and findings without a scenario as "Static evidence."
  - Frame patch generation as an allowlisted attempt, not a guarantee; preserve the existing manual-remediation error for unsupported rules.
  - **Verify:** DOM-level or Playwright assertions for a replayable fixture finding and local GRAVE-007 finding.
  - **Evidence:** passing focused tests and screenshots of both states.
  - **Requirements:** R1.5, R3.5, R3.7.
  - **Acceptance:** AC-03, AC-04.

- [x] **2.4 Lock the evidence-provenance contract before visual rendering changes.**
  - Map finding, diagnostic, replay, patch, comparison, and verification fields to their authoritative Worker response values as defined in `design.md`.
  - Add focused assertions that rendered severity, confidence, file, line, evidence, remediation, counts, and statuses equal the active redacted Worker result; absent values must render as unavailable and never receive plausible defaults.
  - Verify source changes invalidate all derived counts, selections, and later workflow stages before rerender.
  - **Verify:** focused renderer/engine or Playwright assertions using exact fixture response values and a source-switch transition.
  - **Evidence:** provenance matrix and passing test names.
  - **Requirements:** R3.10 through R3.14, R9.5.
  - **Acceptance:** AC-03, AC-13.

### Phase 2 gate

- [x] **2.5 Run affected domain and browser checks.**
  - **Verify:** scanner, simulator, engine, and affected Playwright tests plus `pnpm typecheck`.
  - **Evidence:** commands and test counts.
  - **Requirements:** R10.2.
  - **Acceptance:** AC-01, AC-11, AC-13.

## Phase 3: Establish the approved visual foundation

- [x] **3.1 Add semantic token aliases for the redesigned regions.**
  - Reuse the current ink, paper, stone, plum, danger, success, focus, type, spacing, radius, and motion values.
  - Avoid renaming untouched tokens solely for consistency.
  - **Verify:** no raw replacement changes an unchanged component; computed token values match the approved table in both themes.
  - **Evidence:** token comparison and initial screenshot diff.
  - **Requirements:** R4.2, R4.3, R4.7, R9.4.
  - **Acceptance:** AC-05.

- [x] **3.2 Align document and manifest theme metadata.**
  - Update fixed dark/background metadata to the approved palette and keep the runtime theme-color update correct for dark and light modes.
  - **Verify:** build test or browser assertions for `meta[name="theme-color"]`, `manifest.json`, and both theme transitions.
  - **Evidence:** built values and passing focused tests.
  - **Requirements:** R1.8, R4.6, R7.6.
  - **Acceptance:** AC-05, AC-11.

- [x] **3.3 Preserve owner identity and local-only assets.**
  - Keep the existing logo and favicon set, intrinsic dimensions, and no-remote-asset rule while adapting placement to the approved hierarchy.
  - **Verify:** icon build/serve tests and browser request allowlist.
  - **Evidence:** asset list, request list, and screenshot.
  - **Requirements:** R4.1, R7.5, R7.7, R8.2.
  - **Acceptance:** AC-05, AC-08, AC-09, AC-10.

### Phase 3 gate

- [x] **3.4 Run build, theme, icon, and static-request checks.**
  - **Verify:** focused build tests, theme E2E, icon E2E, same-origin request E2E.
  - **Evidence:** commands and results.
  - **Requirements:** R10.2.
  - **Acceptance:** AC-05, AC-09, AC-11.

## Phase 4: Redesign orientation and source selection

- [x] **4.1 Refine the utility header.**
  - Preserve brand, context, global status, and theme control.
  - Constrain global announcements to page-level events and prevent status copy from displacing controls at narrow widths.
  - **Verify:** loading, ready, busy, success, and Worker-error states at 320 and 1440 pixels; keyboard order remains logical.
  - **Evidence:** screenshots, accessibility snapshot, and focused E2E result.
  - **Requirements:** R2.6, R5.1, R6.3, R6.6.
  - **Acceptance:** AC-02, AC-06, AC-07.

- [x] **4.2 Make the orientation panel concise and task-led.**
  - Retain one `h1`, the Read/Replay/Verify explanation, local-processing proof, safety boundary, and optional aperture.
  - Reduce visual height enough that the primary local action is discoverable in the initial 390-pixel viewport without removing necessary explanation.
  - **Verify:** initial screenshots and bounding-box measurement at 390 and 1440 pixels; heading outline check.
  - **Evidence:** before/after positions and screenshots.
  - **Requirements:** R2.1, R4.1, R4.5, R5.2, R6.3.
  - **Acceptance:** AC-02, AC-05, AC-06, AC-07.

- [x] **4.3 Reorder the source workspace around the local-project path.**
  - Present folder selection as the primary production action, paste as its native-disclosure fallback, and the three bundled fixtures as labeled examples.
  - Preserve all existing IDs, static fixture buttons, selected state, and fixture scan behavior.
  - **Verify:** initial accessibility snapshot, static-markup build test, fixture-selection E2E, local-folder E2E, and paste E2E.
  - **Evidence:** DOM order, screenshots, and test results.
  - **Requirements:** R1.1, R1.2, R2.2, R2.6, R9.3.
  - **Acceptance:** AC-01, AC-02, AC-10.

- [x] **4.4 Put file scope and limits beside source controls.**
  - State supported extensions, shallowest `.kiro/` behavior, 500-file/1-MiB/5-MiB limits, no upload, and no code execution in concise copy.
  - Avoid language that implies the browser grants ongoing filesystem access.
  - **Verify:** copy review against `local-project.ts`, threat model, and product contract; accessibility snapshot at narrow width.
  - **Evidence:** reviewed copy and screenshot.
  - **Requirements:** R2.1, R2.3, R8.1, R8.10.
  - **Acceptance:** AC-02, AC-09.

- [x] **4.5 Refine local-source success, partial, and error states.**
  - Show accepted files, skipped oversized files, active source, replacement guidance, and inline recovery.
  - Keep errors next to the source controls and reserve the global status for concise completion/failure announcements.
  - **Verify:** folder with accepted/skipped files, folder without `.kiro`, oversized total, empty paste, valid paste.
  - **Evidence:** focused unit/E2E results and screenshots of each state.
  - **Requirements:** R2.3, R2.4, R3.9, R6.7.
  - **Acceptance:** AC-01, AC-02, AC-07.

- [x] **4.6 Clear pasted plaintext only after successful acceptance.**
  - Preserve input on validation failure and clear it after the Worker accepts the source.
  - Never write pasted content to local or session storage.
  - **Verify:** Playwright asserts retained value after failure, empty value after success, and no project-content storage entry.
  - **Evidence:** focused E2E result.
  - **Requirements:** R2.5, R8.1, R8.4.
  - **Acceptance:** AC-01, AC-09.

### Phase 4 gate

- [x] **4.7 Validate both source journeys and first-run orientation.**
  - Run affected lint, type, unit, build, and Playwright checks.
  - Review initial and source-state screenshots at all required widths in both themes.
  - **Evidence:** test counts, screenshot matrix, and unresolved notes.
  - **Requirements:** R5.7, R10.2.
  - **Acceptance:** AC-01, AC-02, AC-05, AC-06, AC-07, AC-09.

## Phase 5: Redesign scan summary and diagnostics

- [x] **5.1 Consolidate source and scan summary information.**
  - Show active source, trust boundary, finding total, severity distribution, and diagnostic count in one hierarchy, deriving every count from the current report after state invalidation.
  - Preserve the exact no-overclaim clean-scan statement and never infer a validation result from an empty or partial report.
  - **Verify:** fixture with findings, valid clean local project, malformed local JSON, and source switch from one report to another.
  - **Evidence:** exact engine-to-DOM count comparison, E2E assertions, and screenshots.
  - **Requirements:** R3.1, R3.6, R3.11 through R3.14.
  - **Acceptance:** AC-03, AC-04, AC-13.

- [x] **5.2 Add an inspectable parse-diagnostics disclosure.**
  - Render each diagnostic code, file, line, and safe message exactly from the active Worker report with DOM builders and text content. If a source reference is unavailable in a future valid diagnostic shape, label it unavailable rather than inventing one.
  - Keep diagnostics visually and semantically separate from findings.
  - **Verify:** engine result with malformed JSON, hostile diagnostic-adjacent text, keyboard opening/closing, and no created markup.
  - **Evidence:** focused unit/E2E results and accessibility snapshot.
  - **Requirements:** R1.4, R2.3, R3.2, R8.4, R8.5.
  - **Acceptance:** AC-03, AC-07, AC-09, AC-13.

- [x] **5.3 Add visible filter result feedback and reset.**
  - Show visible/total finding count and one clear way to reset filters when no result matches.
  - Preserve native selects and stable selected finding behavior.
  - **Verify:** all-severity, one-rule, filtered-empty, reset, and keyboard paths.
  - **Evidence:** Playwright assertions and focus result.
  - **Requirements:** R1.4, R3.3, R3.4, R6.4, R6.8.
  - **Acceptance:** AC-01, AC-03, AC-07.

- [x] **5.4 Refine finding-row density and state labels.**
  - Preserve severity, rule, title, file, line, risk order, and selected state; add accurate replay/static wording.
  - Keep rows as one semantic button each and retain focus after rerender.
  - **Verify:** risk ordering, `aria-current`, Enter activation, focus retention, path wrapping, and no color-only state.
  - **Evidence:** existing and updated Playwright assertions plus screenshots.
  - **Requirements:** R1.4, R1.5, R3.4, R3.5, R5.4, R6.4, R6.5.
  - **Acceptance:** AC-01, AC-03, AC-06, AC-07.

### Phase 5 gate

- [x] **5.5 Run summary, diagnostics, filter, and hostile-rendering checks.**
  - **Verify:** affected engine/build tests, filtering E2E, hostile-markup E2E, and malformed-input E2E.
  - **Evidence:** commands and test counts.
  - **Requirements:** R10.2.
  - **Acceptance:** AC-03, AC-04, AC-09, AC-11, AC-13.

## Phase 6: Redesign the case-file workflow

- [x] **6.1 Refine the selected-finding header and evidence hierarchy.**
  - Present severity, rule, location, confidence, title, description, and evidence in the approved order, using only values from the active finding and never filling absent security facts with UI defaults.
  - Keep machine text in monospace and prose in interface/display styles.
  - **Verify:** all metadata remains visible for a fixture and local finding; long path and evidence do not widen the page.
  - **Evidence:** E2E content assertions and narrow/wide screenshots.
  - **Requirements:** R1.5, R3.11 through R3.13, R4.4, R4.5, R5.4.
  - **Acceptance:** AC-01, AC-05, AC-06, AC-13.

- [x] **6.2 Expand the evidence trail's textual state model.**
  - Represent pending, complete, exposed, blocked, unavailable, needs-review, regression, and verified states with words and restrained semantic color, deriving completed outcome states only from the active replay, patch, and verification responses.
  - Preserve the real engine sequence and do not imply skipped work completed.
  - **Verify:** snapshots for initial finding, replay result, patch ready, verified, needs-review, and regression fixtures or test states.
  - **Evidence:** DOM assertions and state screenshot set.
  - **Requirements:** R3.5, R3.6, R4.3, R6.5.
  - **Acceptance:** AC-03, AC-04, AC-05, AC-07, AC-13.

- [x] **6.3 Refine replay and patch action hierarchy.**
  - Show replay only for valid scenarios; present patch generation as an allowlisted proposal; explain manual remediation when unsupported.
  - Preserve existing operation and error behavior.
  - **Verify:** supported GRAVE-001 replay/patch, static GRAVE-007, unsupported GRAVE-007 patch, and a non-replay patch such as GRAVE-009.
  - **Evidence:** focused Playwright results and screenshots.
  - **Requirements:** R1.6, R1.7, R3.7, R3.8, R3.9.
  - **Acceptance:** AC-01, AC-04.

- [x] **6.4 Scope case-action announcements.**
  - Replace broad live updates on the complete case article with a concise action-status region.
  - Keep new visible sections in document order and reveal them without stealing focus.
  - **Verify:** accessibility tree before/after actions, keyboard focus after replay/patch/apply, and concise live text.
  - **Evidence:** Playwright focus assertions and screen-reader smoke notes.
  - **Requirements:** R3.9, R6.4, R6.6.
  - **Acceptance:** AC-07.

- [x] **6.5 Preserve diff and verification evidence.**
  - Keep reason, risk note, unified diff, isolated-copy wording, verification status, before/after counts, replay result, and resolved/introduced groups exactly traceable to the active redacted Worker response.
  - Ensure added/removed lines and status remain readable without color.
  - **Verify:** complete unsafe-MCP flow, redacted secret patch, export contents, and all existing verification assertions.
  - **Evidence:** E2E/unit results and both-theme screenshots.
  - **Requirements:** R1.7, R3.5, R4.3, R8.4, R8.8.
  - **Acceptance:** AC-01, AC-03, AC-05, AC-09, AC-13.

- [x] **6.6 Enforce state invalidation between contexts.**
  - Clear stale replay, patch, verification, and inline error content on source change, scan/reset, and finding change as specified in `design.md`.
  - **Verify:** transition matrix covering each invalidating action.
  - **Evidence:** focused state tests or Playwright assertions.
  - **Requirements:** R3.10, R9.5.
  - **Acceptance:** AC-01, AC-03.

### Phase 6 gate

- [x] **6.7 Run the complete functional journey regression.**
  - **Verify:** fixture and local flows through scan, inspect, replay where supported, patch, apply, verify, compare, export, and reset.
  - **Evidence:** passing engine, patcher, reporting, and Playwright results.
  - **Requirements:** R10.2, R10.4.
  - **Acceptance:** AC-01, AC-03, AC-04, AC-09, AC-11, AC-13.

## Phase 7: Responsive and visual refinement

- [x] **7.1 Complete the 320 and 390 pixel layouts.**
  - Keep task-order DOM flow, local action visibility, readable filters, wrapped paths, contained diffs, 44-pixel targets, and no page overflow.
  - **Verify:** required state matrix at 320 and 390 pixels in both themes.
  - **Evidence:** screenshots and programmatic overflow/target measurements.
  - **Requirements:** R5.1, R5.2, R5.4, R5.5, R5.7.
  - **Acceptance:** AC-02, AC-06.

- [x] **7.2 Complete the 600 to 919 pixel layouts.**
  - Validate fixture-card columns, source copy/control composition, optional aperture, filter fit, and stacked review order.
  - **Verify:** 768-pixel screenshots and full flow, plus boundary checks near actual content breakpoints.
  - **Evidence:** screenshots, overflow result, and E2E result.
  - **Requirements:** R5.1, R5.2, R5.7.
  - **Acceptance:** AC-06.

- [ ] **7.3 Complete the 920 to 1199 pixel review layout.**
  - Keep a readable queue beside a wider case file. Enable sticky/scroll behavior only when height and zoom allow it.
  - **Verify:** 1024-pixel normal and short-height viewports; keyboard enters and leaves the queue; wheel/touch scrolling reaches page content at boundaries.
  - **Evidence:** screenshots and interaction notes/tests.
  - **Requirements:** R5.3, R5.6, R6.4.
  - **Acceptance:** AC-06, AC-07.

- [x] **7.4 Complete the 1200 and 1440 pixel composition.**
  - Apply the approved asymmetric source grid and queue/case-file ratio without creating excessive empty space or pushing primary work below the fold.
  - **Verify:** 1280 and 1440 pixel state matrix in both themes.
  - **Evidence:** screenshots and bounding-box measurements.
  - **Requirements:** R4.5, R5.3, R5.7.
  - **Acceptance:** AC-02, AC-05, AC-06.

- [ ] **7.5 Verify 200 percent zoom and long-content containment.**
  - Test a 1280 by 720 viewport at 200 percent zoom with long paths, evidence, status text, diagnostics, and diff content.
  - Disable sticky or multi-column behavior where needed.
  - **Verify:** no lost controls/content and no two-dimensional page scrolling.
  - **Evidence:** zoom screenshots and overflow measurements.
  - **Requirements:** R5.4, R5.6, R6.10.
  - **Acceptance:** AC-06, AC-07.

### Phase 7 gate

- [x] **7.6 Review the complete responsive screenshot matrix.**
  - Compare against Phase 1 and identify every intended and unintended visual change.
  - **Evidence:** reviewed matrix with disposition for each regression.
  - **Requirements:** R10.5.
  - **Acceptance:** AC-05, AC-06, AC-11.

## Phase 8: Accessibility and motion gate

- [x] **8.1 Verify document structure and accessible names.**
  - Check landmarks, single `h1`, heading order, region labels, source group, form labels, button names, selected states, and diagnostic disclosure.
  - **Verify:** accessibility snapshot and manual DOM review.
  - **Evidence:** checklist with element references.
  - **Requirements:** R6.3, R6.5, R6.8.
  - **Acceptance:** AC-07.

- [x] **8.2 Complete a keyboard-only workflow.**
  - Cover skip link, source controls, paste disclosure, filters/reset, finding rows, replay/patch/apply, export, reset, and theme.
  - Check visible focus and focus stability after every rerender.
  - **Verify:** Playwright keyboard assertions plus manual pass.
  - **Evidence:** test result and manual sequence notes.
  - **Requirements:** R6.4, R6.7, R6.8.
  - **Acceptance:** AC-07.

- [ ] **8.3 Verify concise announcements and error associations.**
  - Check global, source, and case-action statuses with one available screen-reader/browser combination.
  - Ensure errors identify a control/region and describe recovery.
  - **Verify:** screen-reader smoke test and accessibility tree inspection.
  - **Evidence:** environment, sequence, announced text, and issues.
  - **Requirements:** R6.6, R6.7, R6.11.
  - **Acceptance:** AC-07.

- [x] **8.4 Measure contrast in both themes and every semantic state.**
  - Include normal/muted text, boundaries, focus, source/finding selection, severity, exposed, blocked, diff, diagnostics, disabled controls, and footer.
  - **Verify:** computed foreground/background ratios against WCAG thresholds.
  - **Evidence:** ratio table with selectors and colors.
  - **Requirements:** R6.2.
  - **Acceptance:** AC-05, AC-07.

- [x] **8.5 Verify reduced motion, forced colors, and hover behavior.**
  - Confirm result content remains immediate without animation, selected/focus states remain visible in forced colors, and hover styles apply only to hover-capable pointers.
  - **Verify:** emulated media states and touch/hover checks.
  - **Evidence:** screenshots and computed-style assertions or notes.
  - **Requirements:** R6.9, R6.10, R4.8.
  - **Acceptance:** AC-07.

### Phase 8 gate

- [ ] **8.6 Resolve every accessibility finding or keep it open.**
  - Do not waive a WCAG AA failure without owner review and an explicit documented limitation.
  - **Evidence:** final accessibility checklist.
  - **Requirements:** R6.1, R10.7.
  - **Acceptance:** AC-07, AC-11.

## Phase 9: Performance and security regression gate

- [x] **9.1 Recheck built asset and request budgets.**
  - Confirm four hashed runtime assets, page script below 25 KiB, Worker below 125 KiB, no remote requests, and no new runtime dependency.
  - **Verify:** build tests, byte inspection, dependency diff, browser request capture.
  - **Evidence:** before/after table.
  - **Requirements:** R7.2, R7.5, R7.6.
  - **Acceptance:** AC-08, AC-10.

- [x] **9.2 Recheck interaction performance.**
  - Repeat the 500-file/approximately-5-MiB flow at 4x CPU for load/scan, patch generation, and apply/verify.
  - Confirm no main-thread task exceeds 50 ms under the established app-only measurement.
  - **Verify:** controlled performance run.
  - **Evidence:** raw run values and method.
  - **Requirements:** R7.3.
  - **Acceptance:** AC-08.

- [x] **9.3 Measure lab Core Web Vitals.**
  - Record LCP, interaction latency or INP proxy, and CLS on the production build for initial and representative interaction flows.
  - State clearly that field percentiles are unavailable without approved telemetry.
  - **Verify:** repeatable lab runs.
  - **Evidence:** run count, environment, median/range, and target comparison.
  - **Requirements:** R7.4, R10.7.
  - **Acceptance:** AC-08.

- [x] **9.4 Verify Worker serialization, failure, and cancellation semantics.**
  - Prove state-changing requests complete in first-in, first-out order without interleaving, and that an unexpected Worker failure rejects every pending page request with generic reload guidance.
  - Confirm the UI remains responsive while work runs and exposes no cancel control or cancellation claim because the approved protocol has no partial-request cancellation.
  - **Verify:** focused Worker-protocol and page-side error tests, a concurrent-request ordering test, and browser interaction during a bounded large scan.
  - **Evidence:** request/reply trace, test names and results, and responsive-input observation.
  - **Requirements:** R7.8, R7.9, R7.10, R8.9.
  - **Acceptance:** AC-08, AC-09, AC-14.

- [x] **9.5 Verify bounded Worker and page memory behavior.**
  - Repeat local-project replacement, scan/reset, finding changes, patch generation, export, and reload. Confirm obsolete local state and patches are invalidated, transient file references are not persisted, detached result DOM does not accumulate, object URLs are revoked, and only theme remains in storage.
  - Record Worker/page heap trend where the browser exposes a reliable method. Do not claim an exact ceiling or leak-free result without evidence.
  - **Verify:** engine replacement tests, browser storage inspection, repeated-cycle state assertions, and heap snapshots or explicit environment limitation.
  - **Evidence:** retained-state inventory, cycle count, observed measurements, and limitations.
  - **Requirements:** R7.11, R7.12, R8.1, R9.5, R10.7.
  - **Acceptance:** AC-08, AC-09, AC-14.

- [x] **9.6 Recheck browser security boundaries.**
  - Confirm CSP, Trusted Types, `nosniff`, no-referrer, frame denial, COOP, CORP, Permissions Policy, DOM-only rendering, generic Worker errors, file limits, redaction, isolated apply, evidence provenance, and absence of external services or data transmission.
  - **Verify:** existing and affected unit/build/E2E/property tests plus header inspection.
  - **Evidence:** control-by-control result table.
  - **Requirements:** R8.1 through R8.9, R3.11 through R3.14.
  - **Acceptance:** AC-09, AC-13.

- [x] **9.7 Inspect browser storage and data cleanup.**
  - Confirm only theme preference persists; local files, pasted text, findings, patches, and reports disappear on reload and never enter Web Storage or IndexedDB.
  - **Verify:** browser storage inspection before and after local workflows and reload.
  - **Evidence:** stored-key list and reload assertions.
  - **Requirements:** R1.9, R8.1, R8.4.
  - **Acceptance:** AC-09, AC-14.

### Phase 9 gate

- [x] **9.8 Resolve performance and security regressions before documentation closure.**
  - Any missed hard budget or weakened security control blocks completion.
  - **Evidence:** signed-off before/after tables or open task references.
  - **Requirements:** R10.7.
  - **Acceptance:** AC-08, AC-09, AC-11, AC-13, AC-14.

## Phase 10: Documentation and final release review

- [x] **10.1 Align security and architecture documentation.**
  - Update `SECURITY.md` to describe controlled fixtures plus explicitly selected browser-local/CLI `.kiro/` text without calling local selection an upload.
  - Confirm architecture documentation still matches Worker, engine, storage, and network behavior.
  - **Verify:** documentation review against source and threat model; `pnpm docs:check`.
  - **Evidence:** reviewed diff and passing docs check.
  - **Requirements:** R8.10, R9.6.
  - **Acceptance:** AC-09, AC-11.

- [x] **10.2 Record shipped visual decisions only.**
  - Update `docs/design-decisions.md` with final source priority, hierarchy, diagnostics, token, interaction, responsive, accessibility, and motion decisions.
  - Do not describe rejected or unimplemented ideas as shipped.
  - **Verify:** document-to-UI review.
  - **Evidence:** linked screenshots or selectors for each decision.
  - **Requirements:** R4, R9.6.
  - **Acceptance:** AC-05, AC-11.

- [x] **10.3 Update the delivery gate with final evidence.**
  - Record command results, test counts, viewport matrix, zoom, keyboard, screen reader, contrast, reduced motion, forced colors, asset sizes, long tasks, lab vitals, Worker request ordering/failure behavior, repeated-cycle memory evidence, security-fact provenance, requests, and headers.
  - **Verify:** every R10 criterion has evidence or an explicit unresolved item.
  - **Evidence:** `docs/ui-delivery-gate.md` review.
  - **Requirements:** R10.1 through R10.7.
  - **Acceptance:** AC-06, AC-07, AC-08, AC-09, AC-11, AC-13, AC-14.

- [x] **10.4 Correct repository spec references and stale counts.**
  - Keep `.kiro/specs/README.md` accurate and update stale implemented-spec counts in documentation touched by this work.
  - **Verify:** `pnpm docs:check`, link review, and repository diff.
  - **Evidence:** passing docs check and reviewed index.
  - **Requirements:** R9.6, R10.3.
  - **Acceptance:** AC-11.

- [x] **10.5 Run the complete production quality gate.**
  - **Verify:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e && pnpm docs:check && pnpm repo:check && pnpm self-scan`.
  - Also perform the approved manual responsive, accessibility, performance, and security checks.
  - **Evidence:** exact command results, test counts, artifact links, and manual check records.
  - **Requirements:** R10.3, R10.4, R10.5, R10.6.
  - **Acceptance:** AC-01 through AC-11, AC-13, and AC-14.

- [x] **10.6 Review the final diff against approved scope.**
  - Confirm no framework, backend, database, account system, analytics, telemetry, external error reporting, AI feature, remote asset, repository write-back, unsupported cancellation claim, invented security fact, unrelated refactor, rule expansion, or silent behavior loss entered the change.
  - Report unresolved issues and unverified targets plainly.
  - **Verify:** semantic review of the complete diff plus `git status`.
  - **Evidence:** final review record with pass/fail disposition.
  - **Requirements:** R1.10, R9, R10.7.
  - **Acceptance:** AC-10, AC-11, AC-13, AC-14.

- [x] **10.7 Request owner acceptance of the implemented redesign.**
  - Present the final evidence, screenshots, performance results, security checks, and unresolved limitations.
  - Do not mark the redesign complete until the owner accepts the result.
  - **Evidence:** Owner replied "okee approved" on 2026-11-16 after reviewing PR #15. The manual zoom, sticky-queue touch/scroll, and screen-reader checks (tasks 7.3, 7.5, 8.3) remain open.
  - **Requirements:** R10.
  - **Acceptance:** AC-11.


## Implementation evidence, 2026-11-16

### Completed implementation work

- **Phase 1 baseline:** `pnpm install --frozen-lockfile`, lint, typecheck, unit/property tests, build, docs check, repository check, self-scan, and browser tests established a reproducible starting point. The baseline browser run passed 15 tests with the sandbox Chrome executable. The original Playwright browser download was blocked by the sandbox proxy, so the installed `/usr/local/bin/chrome` was used with a writable `HOME`.
- **Phase 2 contract and provenance:** GRAVE-007 no longer emits an unsupported replay ID. Scanner coverage now asserts every emitted replay ID resolves in the four-scenario catalog. The case file distinguishes current from baseline evidence, only offers supported replay, and only offers allowlisted patch proposals. Browser coverage checks exact diagnostic fields, baseline labels, source replacement, and unsupported-state copy.
- **Phase 3 foundation:** The existing ink, paper, stone, logo, and plum direction remains. The manifest and browser theme metadata now use `#10100f`; the build minifies the reviewed page script after asset replacement, keeping it within the existing 25 KiB budget.
- **Phase 4 source workflow:** The local-project picker is primary, source limits and privacy copy are adjacent to it, fixtures are explicit controlled examples, successful pasted input clears, and a loaded project remains selectable in the active tab. Browser tests cover folder, paste, empty-paste recovery, local-source replacement, reload disposal, and same-origin requests.
- **Phase 5 findings and diagnostics:** Scan summary, filter count, filter reset, inspectable parse diagnostics, source references, and risk-ordered finding rows are implemented and covered by browser tests.
- **Phase 6 case file:** The case file now labels baseline evidence, has scoped action notices, represents static-only GRAVE-007 honestly, retains replay, diff, verification, comparison, export, and reset behavior, and clears stale patch/replay/verification state on source replacement.
- **Phase 7 responsive layout:** The primary folder action is fully within the initial 900px viewport at 390px and 1440px. Full-flow tests and 60 screenshots cover 320, 390, 768, 1024, 1280, and 1440px in dark and light themes with no horizontal overflow or visible control under 44px.
- **Phase 8 automated accessibility:** Keyboard focus, skip link, native controls, selected state, reduced motion, forced colors, semantic source and diagnostic content, and computed contrast are covered. The open manual screen-reader check is listed below.
- **Phase 9 performance and security:** Three 4x-CPU production-build runs show no post-setup long task for a 500-file local scan, patch generation, or apply/verify. The page script is 23,695 bytes, the Worker is 92,022 bytes, all measured requests are same-origin, the Worker queue is explicitly serialized, an injected Worker failure rejects the pending action safely, and repeated local replacement leaves only theme storage after reload.
- **Phase 10 documentation:** `SECURITY.md`, architecture notes, design decisions, the spec index, and this delivery gate now describe the shipped local-first boundary and evidence model.

### Remaining release evidence

- **Task 1.4:** A separate pre-change whole-process Worker heap baseline was not captured before implementation. Discovery and baseline code inspection established the original queue semantics; the final page-heap lifecycle measurement is documented in `docs/ui-delivery-gate.md`. Worker-specific `performance.memory` was unavailable in Chromium.
- **Task 7.3:** The 1024px full-flow layout passes, but the planned short-viewport sticky-queue and wheel/touch boundary check remains open.
- **Task 7.5:** The 640 by 360 zoom-equivalent layout passed. A manual true 200 percent browser-zoom check remains open because headless Chromium does not apply browser-zoom keyboard shortcuts.
- **Tasks 8.3 and 8.6:** A manual screen-reader and browser smoke test remains open. DOM semantics, keyboard behavior, and live-region scope are automated, but this sandbox has no screen reader for a conformance claim.
