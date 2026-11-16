# UI Delivery Gate

## Spec 12 delivery evidence, 2026-11-16

Antislop mode: during (project steering). Dial: ENERGY 2 / RHYTHM 2 / MOTION 1. All checks ran against the built static site served with `dist/_headers`, in the sandbox Chromium (`/usr/local/bin/chrome`) because Playwright's browser download is blocked here.

### Hard gate

- **R-02:** PASS. `grep` finds no em dash in `index.html`, `styles.css`, `app.js`, or the Spec 12 documents.
- **R-03:** PASS. Full-page captures at 390, 768, 1060, and 1440px in both themes (initial, scanned, replay, patch, verified) and a 320px verified capture show no horizontal overflow. The Playwright responsive matrix at 320, 390, 768, 1024, 1280, and 1440px in both themes reports no overflow and no visible button under 44px.
- **R-17, R-18, R-36, R-38:** PASS. No statistics, logos, testimonials, or security claims were added. Every count on the page comes from the current Worker response.
- **R-23, R-24:** PASS. The only image is the owner's tombstone mark. No navigation links were added.
- **R-25:** PASS. Minimum normal-text ratio is 4.58:1 (`#302823` on stone `#aa8b76`, unchanged from Spec 11). New pairs: stone tile text 7.33:1, selected-source label 8.17:1 (dark) and 9.49:1 (light), selected finding meta 8.73:1 (dark) and 6.39:1 (light), diff removed line on the ink case file 4.96:1, diff added line 6.19:1 to 7.57:1, verified badge 7.31:1 (dark) and 10.15:1 (light), error notice on paper 5.78:1 and 6.91:1. Measured with `.kiro/skills/antislop-human/contrast-check.py`.
- **Non-text contrast:** PASS. Selected-source border 4.81:1 (dark) and 5.30:1 (light) on stone, radio marker edge 6.12:1, selected finding bar 7.35:1 and 6.81:1, control edges 5.06:1 and 5.31:1, stage marker edge 4.44:1 on paper and 5.32:1 on ink, focus ring 4.81:1 on stone, 13.40:1 on charcoal, and 7.97:1 on light paper.
- **R-26, R-35:** PASS. Keyboard-only click-through at 1440 by 900, 1060 by 800, 768 by 1024, and 390 by 844, no console errors:
  - Paste disclosure: Enter opens it, Tab reaches the textarea, Escape closes it and focuses the summary.
  - Unsafe MCP example: Space selects it and "Run example scan" becomes the primary button.
  - "Run example scan": the scan completes and focus moves to the Findings heading.
  - GRAVE-001: Enter selects it, the case file scrolls into view, and focus moves to the case title.
  - Shift+Tab from the case title reaches "Back to findings"; Enter returns focus to the selected finding. Mouse and touch: the link is visible at 390 by 844 and 1280 by 600, and a click from the bottom of the page brings the selected finding back into view with focus. At 1440 by 900 the sticky queue keeps another finding in view and clickable with the page scrolled to the bottom.
  - "Run safe replay": focus moves to "Replay: exposed".
  - "Propose safe patch": focus moves to "Patch: ready to review". Tab reaches the diff region, then "Apply to isolated copy".
  - "Apply to isolated copy": focus moves to "Verify: passed" and the badge reads "Simulation blocked".
  - "Export Markdown" downloads `gravescan-unsafe-mcp.md`.
  - Severity "Critical" shows the no-match message with focus kept in the select; "Clear filters" restores four findings and focuses the severity filter.
  - "Reset isolated copy" rescans and focuses the Findings heading.
  - The theme switch toggles both themes.
  - Folder input: a folder with a skipped 1 MiB file reports "2 supported files loaded from .kiro/. 1 file over 1 MiB skipped." and focuses "Scan current project" without scanning. A folder without `.kiro` shows "Files were not loaded. No .kiro folder was found." under the folder button. An empty paste shows its error under the textarea and focuses it.
  - A forced Worker failure during replay shows the reload message inside the Replay stage, focuses it, and disables source and case actions.
- **R-27:** PASS. Loading, empty, selected-not-scanned, scanning, clean scan, filtered-empty, folder loaded, folder error, paste error, case-action error, and success states each say what happened and what to do next. The clean scan reads "No rule matched these files. A clean scan is not proof that the project is secure."
- **R-32, R-39:** PASS. First Tab reaches the skip link. Tab order matches visual order at every width. All controls are native buttons, selects, `details`, or textarea with visible labels, `cursor: pointer`, and distinct hover, active, focus, and disabled states. One `h1`, ordered `h2` to `h5`, and `header`, `main`, and `footer` landmarks.
- **R-34:** PASS. Dark theme: charcoal page, stone source panel, paper case file. Light theme: paper page, stone source panel, ink case file. Both were reviewed in every captured state.
- **R-40:** PASS. Images keep intrinsic dimensions. No third-party script, font, or request. The same-origin request allowlist test passes.

### Purpose, liveliness, and craft

- **Dials:** PASS. ENERGY 2 / RHYTHM 2 / MOTION 1 in `.kiro/steering/ui-direction.md`, Spec 12, and `docs/design-decisions.md`.
- **Focal point:** PASS. The headline and folder action before a scan; the case file after it.
- **Accent:** PASS. Plum marks the selected source, the selected finding, and the active stage.
- **Motif:** PASS. The numbered Scan, Replay, Patch, Verify trail with text states and shape markers.
- **Motion:** PASS. No animations remain. Transitions and smooth scrolling sit inside `prefers-reduced-motion: no-preference`; Playwright confirms `scroll-behavior` is not smooth under reduced motion.
- **Decoration:** PASS. No gradients, glow, glass, grids, terminal styling, or elevation shadows were added. Box-shadow is used only for the inset selected-radio ring and an inset hover tint.
- **CTAs:** PASS. Labels name their action: Choose project folder, Scan current project, Run example scan, Run safe replay, Propose safe patch, Apply to isolated copy, Export Markdown, Reset isolated copy.

### Zoom

- **Page zoom:** PASS. A 640 by 360 CSS-pixel viewport at device scale 2 (200 percent on 1280 by 720) completes the full flow with no overflow, no clipped text, and no target under 44px. The header and queue stop sticking there.
- **Text size:** PASS. A 200 percent root font size at 1280 by 720 and 1440 by 900 completes the flow with no overflow. Two defects found by this check were fixed: grid tracks that refused to shrink below their content and a fixed header offset that let the sticky queue slide under a taller header.

### Automated checks

- `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`: PASS.
- `pnpm test`: PASS, 28 files and 250 tests.
- `pnpm build`: PASS. Page script 22,820 bytes (budget 25 KiB), Worker 92,022 bytes (budget 125 KiB), stylesheet 31,768 bytes, fixtures 2,598 bytes.
- `pnpm test:e2e`: PASS, 31 Chromium tests.
- `pnpm docs:check`, `pnpm repo:check`, `pnpm self-scan` (0 findings): PASS.

### Final validation after owner review

- **Functional integrity:** PASS. The 31 browser tests cover folder scan, paste scan, filters, diagnostics, evidence, replay, patch, isolated verification, Markdown export, reset, theme, reload clearing, Worker failure, per-tab isolation, and the new mouse and touch return path. CLI `list`, JSON and SARIF scans of all three fixtures, JSON and SARIF `--path` scans, and the `--fail-on high` exit code (1) are byte-identical to `main`. SARIF reports version 2.1.0.
- **Build change:** PASS. Only `apps/web/src/static/app.js` goes through the `format: "esm"` minification; the Worker is built by a separate `build()` call that did not change, and `worker.dfc3921264cf.js` is byte-identical to `main`. The page has always loaded `app.js` with `type="module"`, so its top-level names were already module-scoped. The minified script parses as a module, contains no import or export statement, starts a classic Worker from the hashed URL, and keeps the `es2022` target. `wrangler deploy --dry-run` completes.
- **Security and privacy:** PASS. No file under `packages/` or the Worker sources changed. `_headers` (CSP, Trusted Types, `nosniff`, no-referrer, frame denial, COOP, CORP, Permissions Policy) is byte-identical to `main`. The page script's only network call is the same same-origin `fetch` of the fixture bundle as on `main`. Browser tests confirm same-origin requests only during the full flow and during a local folder scan, redacted secrets, DOM-only rendering of hostile markup, and `gravescan-theme` as the only stored key.
- **Simulator contract:** PASS. `has exactly four bounded scenarios` and the emitted-scenario consistency test pass; the scenario catalog is unchanged.
- **Accessibility after the final change:** PASS. After the full flow: `lang="en"`, one `h1`, no skipped heading levels across 17 headings, one `header`, `main`, and `footer`, no unnamed control, no image without `alt`, two live regions (header status and filter count), no `outline: none` rule. Keyboard audits at 1440 by 900, 1280 by 600, 1060 by 800, 768 by 1024, and 390 by 844, with and without reduced motion, found no focus target left under the header or out of view once scrolling settled.
- **Light theme:** PASS. The `#f8f1eb` page raises muted text from 5.98:1 on the earlier `#e3d8cf` canvas to 7.48:1, and control edges from 4.24:1 to 5.31:1. The stone panel and ink case file keep the earlier balance of one warm and one dark block.

### Open checks

- Screen-reader smoke test (VoiceOver or NVDA) for the case-title announcement, stage headings, and the single live status.
- True 200 percent browser zoom in a non-headless desktop browser.
- Field performance remains unmeasured; no lab performance numbers were re-measured for Spec 12.

## Earlier gate runs

Antislop mode: during. Last run 2026-11-16 for the Spec 10 responsive cleanup (task 7), and before that for Spec 10 with `pnpm verify`, `pnpm test:e2e`, computed contrast checks, and screenshots at 390, 768, 1060, and 1440px in both themes. The local browser used the same built static files that Cloudflare serves.

## Hard gate

- **R-02:** PASS. `grep` found no em dash character in the HTML, CSS, or browser JavaScript sources.
- **R-03:** PASS. The responsive cleanup was checked with screenshots at 390x844, 768x1024, 1024x768, 1280x800, and 1440x900 in both themes, before and after. No width shows horizontal overflow. The case picker now starts at y=552 to 624 at every width instead of y=1032 to 1405. Playwright completes the full scan, patch, and verification flow at 390, 768, 1060, and 1440px. Every run reported no horizontal overflow and no visible button shorter than 44px. The layout has distinct stages at 640, 920, and 1200px rather than only a phone and desktop state.
- **R-17, R-18, R-36, R-38:** PASS. The page adds no testimonials, customers, dashboard statistics, or security claims. "Ten deterministic rules" comes from GRAVE-001 through GRAVE-010. The risk counts come from the scanner's live output.
- **R-23:** PASS. The only visual image is the tombstone mark the owner supplied. The masthead uses the same local SVG as an abstract scanning aperture with one CSS ring; the decorative orbits and dots were removed. No third-party logo, icon pack, stock image, or illustration was added.
- **R-24, R-26:** PASS. The page adds no navigation links. Every control has a real behavior. E2E clicks fixture choice, scan, filters, finding detail, replay, patch generation, apply, export, reset, theme, folder input, and paste.
- **R-25:** PASS. Computed normal-text contrast is at least 4.58:1 in both themes. That minimum is the small text on the warm stone surface. Component boundaries and focus rings are at least 3.19:1 on ink, 4.44:1 on mineral paper, and 3.62:1 on stone. Diff foregrounds have at least 6.08:1 on their highlighted line.
- **R-27:** PASS. Empty, loading, busy, filter-empty, clean-scan, error, and success states remain. A clean scan says no rule matched and does not call the project secure. An error appears in the header and next to the local loader or case-file action that caused it.
- **R-32, R-39:** PASS. First Tab reaches the skip link. Enter activates cases and findings. Focus stays on the selected case or finding after a list update. Native buttons, selects, `details`, and textarea remain keyboard accessible with visible focus. The page has one `h1`, ordered headings, `header`, `main`, and `footer` landmarks.
- **R-33:** PASS. UI changes live in HTML, CSS, and browser JavaScript source. No source or CSS patching script exists.
- **R-34:** PASS. The light theme uses a paper review field with a dark case file; the dark theme uses an ink review field with a paper case file. Both were clicked through and reviewed in screenshots.
- **R-35:** PASS. `pnpm verify` reports 246 passing tests. `pnpm test:e2e` reports 15 passing browser tests. The local visual pass at 390, 768, and 1440px in both themes reported no console errors or horizontal overflow.
- **R-40:** PASS. The masthead's local SVG has intrinsic `width` and `height`, and `fetchpriority="high"`. No third-party script, font, image, or remote request was added. The built site keeps its strict same-origin CSP. The E2E network allowlist accepts only the document, fingerprinted assets, and local icon set.

## Purpose and liveliness

- **Dials:** PASS. ENERGY 3 / RHYTHM 3 / MOTION 2, declared in Spec 10, `.kiro/steering/ui-direction.md`, and `docs/design-decisions.md`.
- **Focal point:** PASS. The selected case file uses the contrasting surface and larger type. On wide screens, the queue stays beside it instead of competing as another equal panel.
- **Whitespace:** PASS. The split masthead gives the product explanation and scanning aperture separate fields. The source-selection and review stages use different density for different decisions.
- **Accent and motif:** PASS. The plum scan line from the owner-provided mark appears only in active evidence and the scan aperture. The aperture and evidence trail are product-specific motifs.
- **Motion:** PASS. The masthead is static. Results, trace, and verification use only one-time state transitions. No animation repeats. `prefers-reduced-motion` turns the nonessential animation off.
- **Originality:** PASS. The owner-provided reference guided dark panels, mineral paper, warm stone, rounded display type, and asymmetric spacing. No reference artwork, wording, brand, or exact page composition was copied.


## Spec 11 final delivery evidence, 2026-11-16

### Scope and visual direction

- **Local-project-first:** PASS. The folder picker is the first source action. At a 390 by 900 viewport its top and bottom were y=812 and y=856. At 1440 by 900 they were y=845 and y=889. The primary action is fully visible in both themes before the first scroll.
- **Established identity:** PASS. Ink, mineral paper, warm stone, the owner-provided tombstone mark, and plum evidence treatment remain. No remote font, stock image, third-party logo, icon pack, dashboard chart, fake metric, fake terminal, or new navigation was introduced.
- **Controlled examples:** PASS. The three existing fixtures remain in a separate Controlled examples section with their fake-token boundary. The source selection still exposes fixture, folder, and pasted `mcp.json` flows.
- **State matrix:** PASS. 60 JPEG screenshots cover initial, validation-error, scanned, patch-diff, and verification states at 320, 390, 768, 1024, 1280, and 1440 CSS pixels in dark and light themes. Artifacts: `test-results/redesign-final/`.

### Evidence integrity and workflow correctness

- **Engine provenance:** PASS. The page renders finding, diagnostic, replay, patch, comparison, and verification values from the active redacted Worker response. The browser suite checks current source text, exact diagnostic source references, baseline labeling after a verified patch, local-source replacement, and redacted evidence.
- **Historical evidence:** PASS. When a target finding is absent after patching, its case file is labeled `Baseline scan` and `baseline evidence`; it is not presented as a current finding.
- **Diagnostics:** PASS. A malformed pasted `mcp.json` exposes `MALFORMED_JSON`, `.kiro/settings/mcp.json:1`, and the parser message in a native disclosure. Diagnostics are absent from the findings queue.
- **GRAVE-007:** PASS. Scanner output leaves GRAVE-007 static-only. The UI shows Static evidence and provides neither a nonexistent replay nor an automatic-patch control. The simulator remains a four-scenario catalog.
- **Core flow:** PASS. Browser tests cover example scan, local folder scan, pasted config, filters and reset, source switching, safe replay, allowlisted patch review, isolated apply, verification, export, reset, and per-tab isolation.

### Automated quality checks

- `pnpm install --frozen-lockfile`: PASS. pnpm 10.26.0 installed the locked workspace dependencies.
- `pnpm lint`: PASS after the final source changes.
- `pnpm typecheck`: PASS after the final source changes.
- `pnpm test`: PASS, 28 files and 250 tests, including fast-check properties.
- `pnpm build`: PASS. The build writes the static site and rewrites hashed asset URLs.
- `pnpm test:e2e`: PASS, 30 Chromium browser tests.
- `pnpm docs:check`, `pnpm repo:check`, and `pnpm self-scan`: PASS after the final documentation changes.
- The sandbox could not download Playwright Chromium from `cdn.playwright.dev` because the proxy returned HTTP 403. Final browser checks used the sandbox-provided `/usr/local/bin/chrome` with a writable `HOME`; this is an environment limitation, not a skipped browser test.

### Responsive and accessibility checks

- **Overflow and targets:** PASS. The 60-screen matrix found zero page-width overflows and zero visible buttons shorter than 44 CSS pixels. The 30-test browser suite exercises a full scan, patch, and verification flow at every required width in both themes.
- **Zoom:** PARTIAL. A 640 by 360 CSS-pixel viewport, equivalent to the CSS space available at 200 percent zoom on a 1280 by 720 display, completed the full flow with no horizontal overflow. Native browser zoom keyboard shortcuts do not change zoom in the headless environment, so a manual true-browser-zoom check remains open.
- **Keyboard and focus:** PASS in Chromium. The first Tab reaches the skip link. Enter selects examples and findings. Focus stays on source and finding controls after rerender. All action controls use native elements and visible focus rules.
- **Reduced motion and forced colors:** PASS in Chromium emulation. Reduced motion disables smooth scrolling, and selected source state remains outlined under forced colors.
- **Contrast:** PASS for the changed and semantic pairs measured with `.kiro/skills/antislop-human/contrast-check.py`:
  - `#351b42` on warm stone `#aa8b76`: 4.81:1.
  - `#1d1a18` on the composited safety-note surface `#dbcfca`: 11.37:1.
  - `#1d1a18` on mineral paper `#e8ddd3`: 12.95:1.
  - muted paper text `#554b44` on mineral paper: 6.35:1.
  - muted stone text `#302823` on warm stone: 4.58:1.
  - plum `#5c3d70` on mineral paper: 6.67:1.
  - danger `#ff8b80` on ink `#181715`: 7.90:1.
  - success `#75dda4` on ink: 10.78:1.
  - paper-context danger `#9b2820` on mineral paper: 5.78:1.
  - paper-context success `#11633c` on mineral paper: 5.47:1.
- **Screen reader:** NOT VERIFIED in this headless sandbox. Semantic roles, labels, selected state, live-region scope, and keyboard behavior are covered by DOM and browser tests, but a manual screen-reader and browser smoke test remains required before a WCAG 2.2 AA conformance claim.

### Performance and Worker lifecycle

- **Built assets:** PASS. The final minified page script is 23,695 bytes, below the 25 KiB budget. The Worker is 92,022 bytes, below the 125 KiB budget. The stylesheet is 41,641 bytes and fixture data is 2,598 bytes.
- **4x CPU action measurement:** PASS. Three production-build runs loaded and scanned a 500-file, approximately 5 MiB local project, generated a patch, and applied it. After the in-page fixture setup, the Long Tasks observer recorded no task above 50 ms for scan, patch generation, or apply/verification in any run.
- **Cold-load lab metrics:** PASS as lab evidence only. On the local static server with Chromium 151 and 4x CPU throttling, LCP values were 200, 216, and 208 ms, median 208 ms. CLS was 0.000009929055212620027 in each run. The maximum observed click Event Timing duration was 24 ms. These are not field LCP or INP percentiles.
- **Requests:** PASS. Each measured page load made seven same-origin GET requests: document, stylesheet, fixture JSON, page script, Worker, and two requests for the local logo. No external request occurred.
- **Worker lifecycle:** PASS. Unit coverage proves queued Worker messages execute in arrival order without interleaving and that later work can proceed after an unexpected handler failure. Browser coverage forces a Worker handler failure, confirms that the pending source action receives generic reload guidance, clears `aria-busy`, and disables source actions. The page exposes no cancel control because the protocol has no safe partial-request cancellation or rollback behavior.
- **Memory lifecycle:** PASS with stated limit. Ten alternating 500,000-character local pasted-source replacements, with explicit garbage collection between cycles, held page heap use between 1,851,959 and 2,337,598 bytes instead of accumulating ten copies. It was 2,154,958 bytes after cycle 10 and 1,611,779 bytes after reload. Only `gravescan-theme` appeared in `localStorage`, and the loaded-project selector disappeared after reload. Worker-specific `performance.memory` was unavailable in Chromium, so this is page-heap and state evidence, not a whole-process memory bound.

### Security and privacy

- **Local-only data boundary:** PASS. Folder and pasted-source browser tests confirm only same-origin static requests while source content is processed in the Worker. No upload endpoint, backend API, analytics, telemetry, AI service, hosted storage, account, or repository write-back was added.
- **Renderer boundary:** PASS. Static tests reject `innerHTML`, `outerHTML`, `insertAdjacentHTML`, and `document.write`. The hostile steering-file test confirms markup remains text with no created image or event-handler node.
- **Headers and asset delivery:** PASS. CSP, Trusted Types, `nosniff`, no-referrer, frame denial, COOP, CORP, Permissions Policy, hashed asset caching, and public icon headers remain covered by build, static-server, and browser tests.
- **Redaction and isolation:** PASS. Local-secret and report paths remain redacted. Browser patches stay in a tab-local in-memory copy. The per-visitor browser test confirms that one tab's patch does not affect another tab.

### Open release checks

- Run a manual 200 percent browser-zoom check in a non-headless browser.
- Run the manual screen-reader and browser smoke test required for a WCAG 2.2 AA conformance claim.
- Field performance percentiles remain unmeasured because this local-first product has no approved telemetry. Do not describe the lab measurements as production field data.
