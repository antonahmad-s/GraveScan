# Requirements: Production Workbench Redesign

## Status

Implemented on 2026-11-16. Automated release validation passed; the remaining manual browser-zoom, sticky-queue touch/scroll, screen-reader, and owner-acceptance checks are recorded in `tasks.md` and `docs/ui-delivery-gate.md`.

## Introduction

Modernize GraveScan's existing single-page security workbench without changing its core product contract. The redesign must make the real-project workflow easier to understand and operate, preserve every working scan, replay, patch, verification, reset, export, and theme behavior, and retain the browser-local privacy and security boundaries. Evidence accuracy and transparent unknown or unsupported states are critical product requirements; presentation must never substitute invented security information for engine output.

This is an incremental redesign of the implemented workbench from Specs 05 through 10. It is not a framework migration, a hosted-team product, or a replacement of the scanner architecture.

## Approved direction and final-review assumptions

The owner approved the following direction on 2026-11-16. The final review confirms that the detailed requirements, design, acceptance criteria, and task evidence preserve it.

1. The primary production audience is a developer inspecting a local Kiro project. Bundled fixtures remain available as safe examples and demo paths.
2. The established "architectural security atelier" direction remains the product identity: dark ink, mineral paper, warm stone, rounded display type, and a restrained plum evidence signal.
3. The application remains one public route with no account, backend application server, database, project upload, cloud history, or cross-device persistence.
4. Existing TypeScript packages, the dedicated Web Worker, vanilla DOM renderer, static build, and Cloudflare assets-only deployment remain in place.
5. No new runtime dependency, remote font, third-party script, analytics service, icon pack, or stock imagery is required.
6. Changes outside the web UI are limited to defects or contract mismatches that directly expose a broken UI action, plus documentation needed to describe the approved behavior accurately.

## Requirements

### R1. Preserve the existing product workflow

- **R1.1** THE application SHALL continue to offer the three controlled fixtures: `steering-injection`, `unbounded-hook`, and `unsafe-mcp`.
- **R1.2** THE application SHALL continue to let a visitor select a project folder or paste an `mcp.json` without login.
- **R1.3** THE application SHALL continue to read only supported text files inside the shallowest `.kiro/` folder and enforce the existing limits of 500 files, 1 MiB per file, and 5 MiB total.
- **R1.4** WHEN a source is scanned, THE application SHALL preserve deterministic findings, diagnostics, risk ordering, highest-risk initial selection, severity filtering, and rule filtering.
- **R1.5** EACH finding SHALL continue to show its rule ID, severity, title, description, confidence, file, line, evidence, remediation, and available workflow actions.
- **R1.6** WHEN a supported replay is requested, THE application SHALL show the capability request, policy decision, bounded trace, result, evidence, and exact safety notice: `Safe simulation. No arbitrary code or network request was executed.`
- **R1.7** WHEN a safe patch is available, THE application SHALL continue to show its reason, risk note, unified diff, isolated-apply action, verification status, before/after counts, replay result when applicable, and resolved and introduced findings.
- **R1.8** THE application SHALL preserve reset, Markdown export, dark theme, light theme, and local theme preference behavior.
- **R1.9** Reloading the page SHALL continue to clear local project files, scan state, patches, and verification state. Theme preference MAY remain in `localStorage`.
- **R1.10** THE redesign SHALL NOT change stable rule IDs, severities, finding semantics, patch verification semantics, CLI output contracts, SARIF output, or MCP tool contracts unless a separately approved scope change requires it.

### R2. Improve first-run orientation and source selection

- **R2.1** BEFORE a visitor selects local files, THE page SHALL state what GraveScan reads, what it does not execute, where processing occurs, and that no project file is uploaded.
- **R2.2** THE source-selection area SHALL present the real-project path as the primary production action and the bundled fixtures as clearly labeled examples, while preserving all four source choices.
- **R2.3** THE folder and paste paths SHALL explain their accepted scope and limits before activation, not only after an error.
- **R2.4** WHEN a local source loads successfully, THE page SHALL identify the active source, report accepted and skipped files, and provide a clear way to replace or clear the local source through existing reset or reload behavior.
- **R2.5** AFTER a successful paste import, THE plaintext textarea SHALL no longer retain the pasted configuration unless preserving it is necessary to recover from an error.
- **R2.6** THE page SHALL keep one clear primary action for the current stage. Secondary actions SHALL not compete visually with the next required action.

### R3. Improve scan triage, evidence integrity, and workflow clarity

- **R3.1** THE scan result SHALL summarize total findings, severity distribution, parse diagnostic count, and active source before the findings queue.
- **R3.2** Parse diagnostics SHALL be inspectable in the interface with file, line, code, and safe message. A diagnostic SHALL not be presented as a security finding.
- **R3.3** Filtering SHALL report the number of visible findings and SHALL provide a clear reset path when no finding matches.
- **R3.4** THE currently selected finding SHALL remain visually and programmatically identifiable after list updates.
- **R3.5** THE Scan, Replay, Patch, and Verify trail SHALL use text labels for pending, complete, exposed, blocked, unavailable, needs-review, and regression states. Color SHALL remain supplemental.
- **R3.6** THE interface SHALL distinguish "no finding matched" from "secure" and SHALL never claim that GraveScan proves a project is secure.
- **R3.7** A control SHALL NOT promise an operation the engine cannot perform. Findings without a supported replay SHALL be labeled as static evidence, and findings without a safe automatic patch SHALL explain that manual remediation may be required.
- **R3.8** The existing `GRAVE-007` unsupported replay metadata mismatch SHALL be resolved so the UI does not offer a replay that always returns `UNKNOWN_SCENARIO`. The approved implementation SHALL keep the existing four-scenario simulator contract unless the owner separately approves a fifth scenario.
- **R3.9** Busy, success, empty, warning, and error feedback SHALL appear near the action or region that caused it and in the global status only when a page-level announcement is useful.
- **R3.10** A new scan, source change, reset, or finding selection SHALL clear stale replay, patch, verification, and error content that no longer belongs to the active context.
- **R3.11** Every displayed finding, rule ID, severity, confidence value, file, line, evidence excerpt, diagnostic, remediation, replay result, patch result, comparison, and verification status SHALL originate from the current validated engine response or an explicitly identified static product explanation.
- **R3.12** THE page SHALL NOT infer, generate, embellish, or invent security findings, confidence scores, source references, validation outcomes, remediation evidence, or claims that the engine did not return.
- **R3.13** WHEN evidence is unavailable, stale, unsupported, or not verified, THE interface SHALL say so explicitly instead of substituting a plausible value or success state.
- **R3.14** Counts, selected state, action availability, and workflow status SHALL be derived from the active source and current report so a previous source or finding cannot be presented as current evidence.

### R4. Retain and refine the visual identity

- **R4.1** THE redesign SHALL retain the owner-provided tombstone mark and SHALL NOT add third-party brand assets, stock imagery, or decorative icon packs.
- **R4.2** Dark ink, mineral paper, and warm stone SHALL remain structural surfaces rather than decoration.
- **R4.3** Plum SHALL identify active evidence and progress. Red SHALL identify danger or exposed states only. Green SHALL identify blocked or verified outcomes only.
- **R4.4** The interface SHALL use local system font stacks. Rounded display type SHALL establish major hierarchy, system sans SHALL serve interface and prose text, and monospace SHALL be limited to machine identifiers, paths, evidence, pasted configuration, and diffs.
- **R4.5** THE visual hierarchy SHALL prioritize source, current risk, selected evidence, and next action over decorative content.
- **R4.6** Dark and light themes SHALL remain deliberate inverse reading modes with equivalent hierarchy, contrast, and state meaning.
- **R4.7** Reusable controls and states SHALL use shared semantic tokens for color, typography, spacing, borders, radius, elevation, and motion rather than one-off values.
- **R4.8** The interface SHALL avoid generic dashboard decoration, fake metrics, fake terminal styling, excessive cards, animated counters, parallax, WebGL, and scroll hijacking.

### R5. Responsive behavior

- **R5.1** THE page SHALL support viewport widths from 320 CSS pixels upward without horizontal page overflow.
- **R5.2** At narrow widths, content SHALL follow the task order: orientation, source selection, scan summary and filters, findings, selected case file, and footer.
- **R5.3** At wide widths, the findings queue MAY remain beside the selected case file only when both regions remain readable and the queue does not trap keyboard or pointer scrolling.
- **R5.4** Evidence, paths, labels, diffs, status text, and translated or zoomed text SHALL wrap or scroll within their own bounded region without widening the page.
- **R5.5** Every visible interactive target SHALL be at least 44 by 44 CSS pixels, except native inline controls whose accessible target is provided by an associated label.
- **R5.6** The layout SHALL reflow at 200 percent browser zoom without loss of content or function and without requiring two-dimensional page scrolling at a 1280 by 720 CSS-pixel viewport.
- **R5.7** Responsive acceptance SHALL cover at least 320, 390, 768, 1024, 1280, and 1440 CSS-pixel widths in both themes and in representative empty, scanned, diff, error, and verification states.

### R6. Accessibility

- **R6.1** THE redesigned page SHALL meet WCAG 2.2 Level AA for affected content and workflows.
- **R6.2** Normal text SHALL have at least 4.5:1 contrast, large text SHALL have at least 3:1 contrast, and component boundaries and focus indicators SHALL have at least 3:1 contrast against adjacent colors.
- **R6.3** THE page SHALL preserve one descriptive `h1`, ordered headings, `header`, `main`, and `footer` landmarks, labeled regions, and a first-focus skip link.
- **R6.4** Every operation SHALL be available by keyboard with a visible focus indicator. Focus SHALL remain stable when a list or detail region rerenders.
- **R6.5** Source choice and finding choice SHALL expose selected state programmatically. Status, severity, replay result, and verification result SHALL never depend on color alone.
- **R6.6** Async actions SHALL expose busy state and concise live announcements without repeatedly announcing entire rerendered regions.
- **R6.7** Error messages SHALL identify the affected control or region and provide a recovery action when recovery is possible.
- **R6.8** Native buttons, selects, file input, `details`, `summary`, and textarea semantics SHALL be retained unless a custom interaction has equivalent keyboard and assistive-technology behavior.
- **R6.9** Nonessential animation and smooth scrolling SHALL stop under `prefers-reduced-motion: reduce`.
- **R6.10** Selected controls, focus, findings, and status SHALL remain distinguishable in forced-colors mode.
- **R6.11** The completed workflow SHALL be manually checked with keyboard-only navigation and at least one screen-reader/browser combination available to the team.

### R7. Performance

- **R7.1** THE application SHALL remain a static site with the scan engine in a dedicated Web Worker.
- **R7.2** The built page script SHALL remain below 25 KiB uncompressed and the built engine worker SHALL remain below 125 KiB uncompressed, unless the owner approves a measured budget change before implementation.
- **R7.3** Loading and scanning a 500-file, approximately 5 MiB local project and generating or applying a patch SHALL create no main-thread task longer than 50 ms under the existing 4x CPU-throttled lab method.
- **R7.4** The production target SHALL be LCP below 2.5 seconds, INP below 200 ms, and CLS below 0.1 at the 75th percentile. Lab evidence SHALL be reported separately from field evidence, and no field claim SHALL be made without field data.
- **R7.5** The redesign SHALL add no remote font, remote image, third-party script, analytics request, or new render-blocking runtime dependency.
- **R7.6** Content-hashed JavaScript, CSS, worker, and fixture assets SHALL retain immutable caching, while HTML and fixed-name public icons SHALL remain revalidated.
- **R7.7** Static fixture controls and reserved visual dimensions SHALL prevent avoidable load-time layout shifts.
- **R7.8** THE redesign SHALL preserve the current Worker request lifecycle: requests are processed in first-in, first-out order without interleaving state mutations; an unexpected Worker failure rejects every pending page request with generic reload guidance; reloading or leaving the page discards the Worker and all in-memory scan state.
- **R7.9** Because the current application has no partial-request cancellation protocol, THE interface SHALL NOT advertise an in-flight cancel action. Adding cancellable requests requires a separately approved protocol and state-consistency design.
- **R7.10** Scanning, file reading, replay, patch generation, patch application, verification, report generation, and redaction SHALL remain off the main thread. UI rendering and message dispatch SHALL remain the page's only application work.
- **R7.11** Browser memory use SHALL remain bounded by the existing source limits and active per-tab workflow. Loading a replacement local project SHALL release the prior local source state and patches; the redesign SHALL add no scan history, unbounded result cache, duplicate project-content store, or retained file-handle collection.
- **R7.12** Temporary export object URLs and transient source references SHALL be released as soon as their operation completes. Memory-efficiency evidence SHALL distinguish observed measurements from inferred behavior and SHALL not claim a numeric limit without a reproducible baseline.

### R8. Security and privacy

- **R8.1** Local file contents, paths, findings, evidence, and derived scan artifacts SHALL remain in the visitor's browser tab and SHALL never be transmitted to an external service, including analytics, telemetry, error reporting, AI, or hosted storage.
- **R8.2** The page SHALL continue to make only same-origin requests for the document, fingerprinted assets, and approved fixed-name public assets.
- **R8.3** Scanning, local file reading, replay, patch generation, apply, verification, and report generation SHALL remain in the dedicated worker.
- **R8.4** All worker responses, rendered evidence, diffs, reports, and CLI output SHALL retain secret redaction at the output boundary.
- **R8.5** Untrusted content SHALL continue to render through DOM nodes and `textContent`; `innerHTML`, `outerHTML`, `insertAdjacentHTML`, and `document.write` SHALL remain prohibited.
- **R8.6** The Content Security Policy, Trusted Types worker URL policy, `nosniff`, no-referrer policy, frame denial, cross-origin isolation headers, and disabled browser permissions SHALL remain at least as restrictive as the current build.
- **R8.7** The simulator SHALL remain deterministic and SHALL NOT execute code, invoke a shell, or make a network request.
- **R8.8** Patches SHALL continue to apply only to an in-memory browser copy or the CLI's validated isolated work copy. The web redesign SHALL NOT add repository write-back.
- **R8.9** Unexpected worker failures SHALL continue to return generic user-safe errors without internal stack details or source content.
- **R8.10** Privacy and security copy SHALL accurately distinguish local file selection from file upload. Repository documentation SHALL be updated when current statements conflict with the implemented local-scan behavior.

### R9. Architecture and maintainability

- **R9.1** THE redesign SHALL reuse the current pnpm workspace, TypeScript packages, browser entry points, Worker protocol, engine routes, static HTML, CSS, and DOM renderer where they remain fit for purpose.
- **R9.2** THE redesign SHALL NOT introduce a client framework, router, server API, database, state library, CSS framework, or component library without a separately reviewed technical decision.
- **R9.3** Existing DOM IDs used by behavior and end-to-end tests SHALL remain stable unless the same approved task updates all references and preserves behavior.
- **R9.4** Reusable visual components SHALL have documented markup, states, and semantic token usage. Repeated rendering logic SHALL use the existing DOM-builder pattern rather than HTML strings.
- **R9.5** UI state transitions SHALL remain explicit and deterministic for source, report, selected finding, replay, patch, verification, busy state, and error state.
- **R9.6** Documentation SHALL identify the single page, the worker message boundary, the lack of authentication, and the local-only data lifecycle accurately.

### R10. Verification and release evidence

- **R10.1** Each implementation task SHALL have a stated verification method and SHALL not be marked complete without recorded evidence.
- **R10.2** After each meaningful phase, affected lint, type, unit, integration, property, build, and Playwright checks SHALL run.
- **R10.3** Before completion, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm docs:check`, `pnpm repo:check`, and `pnpm self-scan` SHALL pass.
- **R10.4** The final review SHALL cover fixture scan, folder scan, pasted config, filtering, diagnostic inspection, finding selection, evidence provenance, supported replay, unsupported replay absence, patch generation, diff review, isolated apply, all verification statuses reachable by existing fixtures/tests, export, reset, theme persistence, reload clearing, error recovery, Worker failure handling, serialized request behavior, and local-project replacement memory lifecycle.
- **R10.5** The final review SHALL compare responsive screenshots in both themes at the required widths and inspect keyboard focus, reduced motion, forced colors, text zoom, contrast, and page overflow.
- **R10.6** The final review SHALL inspect the production build's request list, response headers, content hashes, asset size budgets, console output, and source diff.
- **R10.7** Any unmet performance target, browser limitation, accessibility limitation, or unresolved product defect SHALL be reported plainly and SHALL keep the affected task open.

## Acceptance criteria

| ID | Acceptance criterion |
|---|---|
| **AC-01** | All existing source choices and the complete scan, inspect, replay, patch, verify, export, reset, and theme journeys work with no regression. |
| **AC-02** | A first-time user can identify the local-project path, example-fixture path, privacy boundary, accepted file scope, and next action from the initial viewport at 390 and 1440 pixels. |
| **AC-03** | Scan summary, severity distribution, filter result count, parse diagnostics, selected finding, and workflow state remain understandable without color. |
| **AC-04** | The UI never offers an unsupported replay, never promises an unavailable automatic patch, and never claims a clean result proves security. |
| **AC-05** | Both themes conform to the approved ink, paper, stone, plum, danger, and verified color roles and pass required contrast checks. |
| **AC-06** | Required viewport, zoom, wrapping, target-size, sticky-region, and no-horizontal-overflow checks pass in all representative states. |
| **AC-07** | WCAG 2.2 AA checks for semantics, keyboard use, focus, announcements, contrast, reduced motion, and forced colors pass for affected journeys. |
| **AC-08** | Existing script and Worker budgets, main-thread responsiveness, serialized request lifecycle, failure cleanup, bounded local-project memory behavior, Core Web Vitals targets, static caching, and no-third-party-request constraints are met or explicitly left open with evidence. |
| **AC-09** | Existing CSP, Trusted Types, DOM-only rendering, redaction, file limits, same-origin request, Worker isolation, and isolated patch guarantees remain enforced by tests and review. |
| **AC-10** | No client framework, backend, database, account system, analytics, telemetry, AI feature, remote asset, or repository write-back is introduced. |
| **AC-11** | All repository quality gates and browser tests pass, and the final diff contains only approved redesign, direct contract-fix, test, and documentation changes. |
| **AC-12** | Requirements, technical design, visual direction, and tasks receive explicit owner approval before the first implementation change. |
| **AC-13** | Every rendered security fact is traceable to the active validated engine result or clearly labeled static product copy; tests and manual review find no invented finding, confidence, evidence, remediation result, source reference, count, or validation status. |
| **AC-14** | Worker operations remain off the main thread and serialized without state interleaving; unexpected Worker failure rejects pending requests safely; reload and local-project replacement discard obsolete in-memory state; no unsupported cancel control or unbounded content cache is added. |

## Out of scope

- Hosted accounts, teams, projects, roles, authorization, audit history, or cloud persistence.
- A GitHub App, hosted API, database, billing, notifications, collaboration workflow, analytics, telemetry, or external error-reporting service.
- AI-generated explanations or sending any project content to a model provider.
- New scanner rules, changed severities, a broader source-code scanner, or a fifth replay scenario without separate approval.
- A new in-flight cancellation protocol or cancel control. The current serialized Worker, failure, reload, and state-disposal behavior is preserved.
- Automatic writes to the visitor's repository.
- A redesign of the CLI or MCP developer server beyond regression compatibility.
- Replacing the owner-provided logo or importing external visual assets.
