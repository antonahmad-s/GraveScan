# Design: Editorial Workbench and Icon Set

## Design Read
Reading this as: security workbench for developers and technical judges, in a forensic incident-room language with an editorial voice, dial ENERGY 2 / RHYTHM 3 / MOTION 2.

The owner asked for a page that feels designed rather than generated and that works on every screen. The previous UI was three equal columns of bordered boxes with wide-tracked uppercase labels, so it read as a generic dashboard. Heavy motion, WebGL, and scroll effects stay out: the modernization audit rejects them for a reading-heavy security tool, and they would not help a triage decision.

## Screen structure

- **Header (sticky):** logo and name, a context label on wide screens, the live status line, and the theme toggle. The status box fills the free space so a new message never moves it.
- **Masthead:** a serif headline, a one-paragraph description, and the safety boundary. The logo's scan line closes the masthead.
- **01 Choose a case:** three described case cards (`aria-pressed`), Run scan and Reset, and "Scan your own .kiro" with the folder button and the paste box.
- **02 Findings:** export, source context, the severity counts in large serif numerals, filters, and the risk-ordered queue with numbered rows.
- **03 Case file:** the selected finding's title, its evidence trail (scan, replay, patch, verify), the evidence block, the recommended boundary and actions, then the replay trace, the patch diff, and the verification report as they happen. Before a selection it explains the four stages.

Above 960px, 02 and 03 sit side by side and the queue is sticky with its own scroll. Below that width every stage stacks in DOM order.

## Behavior changes in `app.js`

- The bundled case buttons stay in the markup and are updated in place, so their descriptions survive and keyboard focus is never lost. A loaded project is added once.
- Selecting a finding moves the `aria-current` marker instead of rebuilding the list.
- `reveal()` scrolls a new result into view only when its top is above the screen or below its middle.
- `fail()` records the message for the case file, and `setBusy(true)` clears it when the next action starts.
- The engine protocol, routes, and DOM-only rendering are unchanged. The page script stays under its 25 KB budget.

## Icon set

`apps/web/public/` holds the icon files and `manifest.json`. `scripts/build-web.ts` copies them to the root of `dist/` after the fingerprinted assets, skips dotfiles, and throws if a file would replace a build output. `scripts/serve-dist.ts` serves `.svg`, `.png`, and `.ico` with image types. The CSP already allows same-origin images, and the manifest falls under `default-src 'self'`.

The owner supplied the logo as an image. The repository holds a hand-redrawn SVG of it; the PNG sizes (96, 180, 192, 512px) and the 16, 32, and 48px ICO frames are rendered from that SVG. The 180, 192, and 512px versions sit on white with margin so they work as maskable and home-screen icons.

## Design decisions
See `docs/design-decisions.md`.
