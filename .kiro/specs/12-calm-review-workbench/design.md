# Design: Calm Review Workbench

## Status

Implemented on 2026-11-16. The reasons for each visual decision are recorded in `docs/design-decisions.md` under "Calm review workbench, Spec 12". Gate evidence is in `docs/ui-delivery-gate.md`.

## Design Read

Security workbench for developers and technical judges, with a clean editorial interface, strong evidence hierarchy, and restrained architectural visual language. ENERGY 2 / RHYTHM 2 / MOTION 1.

- **Focal point:** the case file on every screen after a scan; the headline and folder action before it.
- **Accent:** plum, used for selection and the active stage.
- **Motif:** the numbered Scan, Replay, Patch, Verify trail.
- **Rhythm:** two structural blocks (stone source panel, case file) with the intro and the findings queue on the page surface between them.

## Page structure

```text
header.topbar        brand, global status (role=status), theme switch
main
  section.intro      h1, supporting sentence, four capabilities, safety notice, aperture emblem (>=760px)
  div#workbench
    section.source-stage   h2 Choose what to scan
      section.local-project     h3 Your project, folder button, load notice, loaded source, scope list, paste disclosure
      section.fixture-examples  h3 Controlled examples, three source options
      div.source-bar            selected source and boundary, scan and reset, scan error
    section.review-stage
      section.evidence-board    h2 Findings, export, source context, scan summary, diagnostics, filters, list
      section.case-file         h2 Case file, back link, empty state or case header + trail
footer
```

DOM order matches visual order at every width. On narrow screens the review grid stacks: source context, scan summary, findings queue, case file.

## Surface tokens

Components read `--surface`, `--fg`, `--muted`, `--edge`, `--line`, `--signal`, `--danger`, `--success`, `--focus`, `--primary-bg`, `--primary-fg`, `--code-bg`, and `--diff-bg`. Three token sets cover every surface:

| Context | Dark theme | Light theme |
|---|---|---|
| Page and findings queue | charcoal `#10100f` | mineral paper `#f8f1eb` |
| Source panel | warm stone `#aa8b76` | warm stone `#b1937e` |
| Case file | mineral paper `#e8ddd3` | ink `#191715` |

Palette values are unchanged from Spec 11. The light page now uses the existing light paper value instead of the darker `#e3d8cf` canvas.

## Interaction model

### Source flow

| Event | Result | Focus |
|---|---|---|
| Choose an example | Source selected; scan button becomes primary with "Run example scan" | Stays on the example |
| Choose a folder | Worker reads and validates files; notice reports loaded and skipped files; "Your project" selected; no scan | Moves to "Scan current project" |
| Folder error | Notice under the folder button; header status | Stays on the folder button |
| Paste and scan | Worker accepts the file; textarea clears; scan runs | Moves to the Findings heading |
| Paste error | Notice under the textarea; `aria-invalid="true"` | Moves to the textarea |
| Scan or reset | Report replaces the old one; highest-risk finding selected | Moves to the Findings heading |

### Case file

The case file renders one ordered list. Each stage is an `li` with a marker (`aria-hidden`) and an `h4` heading (`tabindex="-1"`) whose text reads "Name: state".

| Stage | States | Primary control |
|---|---|---|
| Scan | current evidence, baseline evidence | none |
| Replay | not run, exposed, blocked, unavailable | "Run safe replay" while not run |
| Patch | not generated, ready to review, applied to isolated copy, manual remediation | "Propose safe patch" after the replay result, or when no replay exists; "Apply to isolated copy" once a patch exists |
| Verify | not run, passed, needs review, regression, unavailable | none |

`nextStage()` picks the one recommended stage: a proposed patch waiting to be applied, else an unrun replay, else the patch proposal. Only that stage's control is solid.

After apply, the Replay stage keeps the result from before the patch and says so. The Verify stage shows the engine's verification status, a sentence derived from `targetFindingPresent`, `replay.result`, and the High or Critical counts, the replay steps after the patch in a disclosure, and the comparison groups.

### Focus and scrolling

- `focusTarget(element, { show, nearest })` reveals `show` (default: the element) and focuses with `preventScroll`. New results scroll near the top; returning to a control only scrolls when it is hidden. A scroll still in motion always gets an explicit scroll, and a target that looked in place is checked again after 150 ms, so a scroll the browser started for the activated control cannot carry the result away.
- `--header` holds the sticky header's measured height (ResizeObserver plus resize). `html` uses it as `scroll-padding-top`, and the sticky queue uses it for `top` and `max-height`.
- A `focusin` safety net scrolls any control that receives focus under the sticky header just into view. A ResizeObserver on the queue does the same when the resting sticky queue grows upward under a focused control.
- "Back to findings" returns focus to the selected finding. It is visible everywhere except where the sticky queue keeps the findings beside the case file; there it appears on keyboard focus, and mouse and touch users click the next finding directly.
- Escape inside an open `details` closes it and returns focus to its summary, except during IME composition.

### Busy handling

Work is serialized in the Worker. While a request runs, handlers return early instead of disabling controls, so focus is not lost to the browser's focus fix-up. A control relabels itself ("Scanning…", "Running replay…") if the request takes longer than 250 ms. After an unexpected Worker failure, source and case actions are disabled and the page asks for a reload.

## Responsive states

| Width | Layout |
|---|---|
| below 600px | Single column. Header status wraps to its own row. Capability descriptions hidden. Facts stack. |
| 600px and up | Folder button and source actions size to content. |
| 720px and up, height 560px and up | Sticky header. |
| 760px and up | Aperture emblem beside the intro copy. |
| 960px and up | Two-column source panel, four capabilities in one row, review grid with the queue capped at min(23rem, 38%). |
| 960 by 640px and up | Sticky findings queue with its own scroll. "Back to findings" shows on keyboard focus only. |

## Motion

Transitions on background, border, color, and box-shadow for controls, source options, finding rows, selects, and summaries, plus smooth scrolling. All inside `prefers-reduced-motion: no-preference`. No entrance animations.

## Out of scope

Scanner rules, simulator scenarios, patcher allowlist, Worker protocol, CSP and headers, CLI, MCP server, and any new product feature.
