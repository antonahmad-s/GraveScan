# Requirements: Calm Review Workbench

## Status

Implemented on 2026-11-16 from the owner's brief in the same session. Automated validation passed. The manual screen-reader smoke test and a true browser-zoom check in a non-headless browser remain open; see `tasks.md`.

## Introduction

Make the GraveScan web workbench cleaner, calmer, and easier to follow for a hackathon demo, without changing what it does. The brief reads the product as a security workbench for developers and technical judges, with a clean editorial interface, strong evidence hierarchy, and restrained architectural visual language, at ENERGY 2 / RHYTHM 2 / MOTION 1.

Scope is the static UI (`apps/web/src/static/index.html`, `styles.css`, `app.js`), its browser tests, and documentation. The scanner, simulator, patcher, reporting, Worker protocol, redaction, CSP, and data flow do not change.

## Requirements

### R1. Preserve behavior and boundaries

- **R1.1** Every Spec 11 journey keeps working: fixture scan, folder scan, pasted `mcp.json`, filters, diagnostics, replay, patch, isolated apply, verification, export, reset, theme switch, and reload clearing.
- **R1.2** The browser-local security model, dedicated Worker, redaction, scan engine, patch flow, CSP, Trusted Types policy, and same-origin request list are unchanged.
- **R1.3** No new runtime dependency, third-party script, remote asset, or external request is added. The page script stays below 25 KiB and the Worker below 125 KiB.
- **R1.4** No fake statistics, customer logos, testimonials, security claims, product features, or navigation links are added.

### R2. First screen

- **R2.1** The headline states the job: "Inspect Kiro configuration before an agent can cross a risky boundary."
- **R2.2** A supporting sentence says which files are read and that they stay in the browser tab and are not uploaded.
- **R2.3** The process explanation lists what a visitor can do in short, concrete copy: scan a project, inspect evidence, replay a risk safely, and review and verify an isolated patch.
- **R2.4** The scanning aperture stays, but the product explanation and the primary action are the first focus.

### R3. Source selection

- **R3.1** "Choose project folder" is the strongest action until a source is selected. Paste stays a secondary path inside the existing disclosure.
- **R3.2** Controlled examples look like selectable cases with distinct selected, hover, focus, disabled, and loading states, and never rely on color alone.
- **R3.3** Choosing a folder does not start a scan. The UI confirms how many supported files were loaded, shows "Scan current project", and waits for the visitor.
- **R3.4** The selected source and its privacy boundary stay visible. Targets are at least 44px high.

### R4. Review workspace

- **R4.1** On wide screens the findings queue is narrower than the case file, the case file is the focal surface, and the queue stays reachable while reading. A sticky queue is used only where it does not trap scrolling.
- **R4.2** On narrow screens the order is source context, scan summary, findings queue, and selected case detail.
- **R4.3** The page never scrolls horizontally. Evidence and diffs scroll inside their own container. Content is not clipped at 390, 768, 1060, and 1440px or at 200 percent text size.

### R5. Findings list

- **R5.1** Each finding shows rule ID, file, line, and a text severity. The selected finding has a restrained active marker and accurate `aria-current`.
- **R5.2** Severity and rule filters remain. Feedback reads "3 of 8 findings shown" or "No findings match these filters. Clear filters to review all current findings."
- **R5.3** A clean scan never implies the project is secure.

### R6. Keyboard and focus

- **R6.1** Selecting a finding updates the case file, scrolls it into view when needed, and moves focus to the case title so the new detail is announced.
- **R6.2** After a scan, replay, patch generation, or verification, the status is announced and focus moves only when it helps locate the new result. Filtering never moves focus unexpectedly.
- **R6.3** Tab order matches visual order, Enter and Space activate controls, Escape closes disclosures, and focus is visible in both themes.

### R7. Action sequence

- **R7.1** The case file reads as Scan, Replay, Patch, Verify.
- **R7.2** "Run safe replay" is the first recommended action when replay exists. "Propose safe patch" does not compete with it before the replay result is known. "Apply to isolated copy" is the main action after a patch is generated.
- **R7.3** Verification status is prominent and readable without green or red. Static-only findings stay honest about unavailable replay or patching.
- **R7.4** Action labels are specific. Generic labels such as Get started, Learn more, Try now, Explore, and Discover are not used.

### R8. States

- **R8.1** Every data view has empty, loading, success, and error states that say what happened and what to do next.
- **R8.2** Errors appear near the affected control, while the header status keeps the overall state.

### R9. Visual system

- **R9.1** The charcoal, mineral paper, warm stone, and plum identity and its semantic colors stay. Plum marks selection and the active stage; red marks severity and danger; green marks a blocked replay or a passed verification.
- **R9.2** Fewer borders and separators, intentional radius, and no decorative shadows, gradients, glow, glass, grids, fake terminals, or excess pills.
- **R9.3** System sans for interface text; monospace only for evidence, diffs, pasted configuration, and machine identifiers.

### R10. Accessibility and motion

- **R10.1** Semantic landmarks, one `h1`, ordered headings, skip link, accessible names, visible labels, reduced-motion support, WCAG AA text contrast, and 3:1 for component boundaries and focus indicators.
- **R10.2** All nonessential motion sits inside `@media (prefers-reduced-motion: no-preference)`. Motion only communicates real state changes; nothing loops.

### R11. Verification

- **R11.1** Lint, type check, unit tests, build, and browser tests pass.
- **R11.2** The full flow is exercised by keyboard: load, choose an example, scan, select a finding, replay, patch, review the diff, apply, inspect verification, export, reset, switch theme, and the folder and paste input states.
- **R11.3** Layout is checked at 390, 768, 1060, and 1440px in both themes, with reduced motion and at 200 percent zoom.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-01 | All existing journeys pass in Playwright with no regression and no console error. |
| AC-02 | Choosing a folder never starts a scan; the visitor starts it with "Scan current project". |
| AC-03 | Each focus move in R6 is asserted in a browser test or recorded in the keyboard audit. |
| AC-04 | Only one solid primary button is shown for each stage of the source and case-file workflow. |
| AC-05 | No page overflow, no clipped content, and no visible button under 44px at the required widths, themes, and zoom levels. |
| AC-06 | Every changed color pairing meets WCAG AA text contrast or 3:1 for boundaries and focus, measured with the contrast checker. |
| AC-07 | Engine, Worker, CSP, redaction, and request-list tests are unchanged and pass. |
