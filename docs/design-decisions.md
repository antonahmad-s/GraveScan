# UI Design Decisions

Design Read: security workbench for developers and technical judges, forensic incident room with an editorial voice, ENERGY 2 / RHYTHM 3 / MOTION 2. Spec 09 records the redesign; one-line reasons follow.

## Identity

- **Owner's tombstone logo:** the owner supplied the mark (a tombstone crossed by a violet scan line) on 2026-11-15, so the header shows it next to the name. The repository copy is an SVG redrawn from the owner's image, plus PNG and ICO sizes rendered from that SVG.
- **Violet accent from the logo's scan line:** one accent that belongs to this product; it marks only the current selection and evidence trail.
- **Red and green keep their meaning:** red is severity and danger only, green is a verified result only, so neither competes with the accent.
- **Ink and paper neutrals:** a near-black with a violet cast for night, a warm paper for day; both are real themes with checked contrast.
- **Scan line as the one decorative gesture:** it is the logo's beam, drawn once under the masthead and reused as the busy indicator, so the decoration also reports state.

## Typography

- **Serif display face (Iowan Old Style, Palatino, Georgia, then the platform serif):** it reads like an engraved epitaph and like a case report, which suits a product called GraveScan. It uses fonts already on the device, so no font file is downloaded and nothing shifts while one loads.
- **System sans for interface text:** labels, prose, and actions stay familiar and fast to read.
- **Monospace for evidence and identifiers only:** evidence, diffs, pasted JSON, file paths, and rule IDs need fixed character alignment or are typed and searched exactly as shown.
- **Sentence-case labels, no wide-tracked uppercase:** the previous uppercase kickers ("EVIDENCE BOARD") added a reading step without adding information.

## Layout

- **Masthead with one sentence and the safety boundary:** a first-time visitor learns what the tool does, and the required safe-simulation notice is visible before any action.
- **Numbered stages 01, 02, 03:** they follow the real order of work (choose a case, read findings, inspect the case file) and help orientation when the stages stack on a phone.
- **Case picker as three described cards plus "Scan your own .kiro":** each fixture names the risk it models, so the choice is informed rather than a list of IDs.
- **Two-column board on wide screens:** the findings queue stays in view (sticky, with its own scroll when long) beside the case file, which is the focal point.
- **Case file as the only raised panel:** it holds the selected finding and its trail, so it is the one surface that sits above the page.
- **Breakpoints where content breaks:** cases go to three columns at 640px, the board splits at 960px, the masthead splits at 1000px, and the picker gains a side panel at 1200px.

## Interaction

- **Evidence trail on every finding:** scan, replay, patch, and verify show their state in words ("not run", "blocked", "passed"), with a solid link once two stages are done.
- **Results come into view:** after a scan, a selection, a replay, a patch, or a verification, the new result scrolls into view when it would otherwise be off screen.
- **Errors appear twice:** in the sticky header status and next to the control that failed (the local loader, or the case file action), so the message is where the visitor is looking.
- **Highest risk first:** the queue orders findings critical, high, medium, low and selects the top one after a scan. The engine keeps file and line order for reports and SARIF.
- **A clean scan says only that no rule matched:** it does not imply the project is secure.
- **Hover styles only on hover-capable pointers:** a tapped card or row does not stay highlighted on a touch screen.
- **Native `<details>` for pasting and native selects:** keyboard and screen-reader behavior come from the platform.

## Motion

- **State changes only:** the scan line powers on once, new findings and the newest case-file section rise in (380 to 420 ms), replay steps arrive in order, and the verification status settles in. The busy sweep repeats only while the engine works. Everything is inside `prefers-reduced-motion: no-preference`.
- **No WebGL, parallax, scroll hijacking, or animated counters:** they would slow a reading-heavy tool without helping a decision.

## Delivery

- **Content-hashed static assets:** JavaScript, CSS, and fixtures get a SHA-256-derived URL, so Cloudflare can cache them immutably. HTML stays revalidated.
- **Fixed-name icon set:** `apps/web/public/` is copied to the site root because browsers and the manifest request icons by name; those files are revalidated like the HTML.
- **Fixture buttons in the markup:** the three bundled cases are known at build time, so the list renders before any script runs and does not shift when the engine becomes ready.
