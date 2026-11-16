# UI Design Decisions

Design Read (current, Spec 12): security workbench for developers and technical judges, with a clean editorial interface, strong evidence hierarchy, and restrained architectural visual language, dial ENERGY 2 / RHYTHM 2 / MOTION 1. The owner set this direction on 2026-11-16.

## Calm review workbench, Spec 12

Each line gives the reason for one decision (antislop R-31).

### Orientation

- **Headline states the job:** "Inspect Kiro configuration before an agent can cross a risky boundary." The sentence below it says which files are read and that they stay in the tab.
- **Four plain capabilities instead of a stepped graphic:** Scan a project, Inspect evidence, Replay a risk safely, and Review and verify a patch are the four things the product actually does, so the list has four items, separated only by a hairline.
- **Aperture becomes an emblem:** the tombstone aperture shrinks to about 11rem beside the copy and is hidden below 760px. The headline and the folder action are the first focus at every width.
- **No framed masthead:** the intro sits on the page surface. Removing its panel removed one of three competing cards from the first screen.

### Source choice

- **One primary per stage:** "Choose project folder" is the only solid button until a source is selected. Then the selected source's scan becomes the solid button and the folder picker turns outlined.
- **Examples read as choices:** each controlled example is a full-width row with a radio-style marker, its description, its ID, and a "Selected" word when pressed. They no longer look like three equal promotional cards.
- **Folder choice no longer scans silently:** choosing a folder loads and validates its files, reports how many were loaded and skipped, selects "Your project", and moves focus to "Scan current project". Paste still scans at once, because its button is labeled "Scan pasted mcp.json".
- **Errors sit at their cause:** folder errors appear under the folder button, paste errors directly under the textarea (which is also marked `aria-invalid`), and scan errors in the selected-source bar.
- **The selected source keeps its boundary:** the source bar names the active source and its privacy boundary, and the findings queue repeats both after a scan.

### Review workspace

- **One focal surface:** the case file is the only card in the review area. The findings queue sits on the page surface, so the two regions no longer look equal.
- **Narrow queue, wide case file:** at 960px and wider the queue is capped at 23rem or 38 percent, whichever is smaller. Capping by share keeps the case file wide at 200 percent text size.
- **Sticky queue only when it helps:** the queue sticks beside the case file at 960 by 640 CSS pixels and larger. Its own scroll chains to the page at both ends. Smaller and zoomed screens stack instead.
- **Selection is a shape:** the selected finding has a 4px plum bar, a tint, and `aria-current="true"`.
- **Filter feedback is one line:** "3 of 8 findings shown" or "No findings match these filters. Clear filters to review all current findings." The filter panel stays hidden until a scan has findings.

### Case file and evidence trail

- **The trail is the case file:** the case file is the numbered Scan, Replay, Patch, Verify sequence. Evidence, replay output, the diff, and verification each live inside their own stage, so the order of work is the order of reading.
- **States use words and shapes:** every stage heading names its state ("Replay: exposed", "Patch: ready to review"). Markers are a number while pending, a drawn check when done or passed, an exclamation mark when exposed or failed, and a dashed ring when unavailable.
- **Replay leads, patch follows:** "Run safe replay" is the solid button while the replay has not run; "Propose safe patch" stays outlined until then. After a patch is proposed, "Apply to isolated copy" is the only solid button.
- **Verification is the largest status:** the result appears as a display-type badge with a drawn check or an exclamation mark, followed by a sentence derived from the engine fields (target finding present, replay result, High or Critical counts).
- **Before and after stay distinct:** after a patch, the Replay stage keeps the result from before the patch and says so. The Verify stage shows the replay after the patch, with its steps in a disclosure.
- **Static evidence stays honest:** findings without a scenario show "Replay: unavailable"; rules without an allowlisted patch show "Patch: manual remediation" and no patch control.

### Keyboard and announcements

- **Focus follows results:** selecting a finding focuses the case title. A scan or reset focuses the Findings heading. Replay, patch, and apply focus the stage heading that holds the new result. A failed action focuses its error inside the stage.
- **No unexpected jumps:** filter changes keep focus in the select. "Clear filters" hides itself, so focus moves to the severity filter.
- **A way back:** "Back to findings" sits before the case title. On wide screens it is visually hidden until it receives focus, because the queue is already beside the case file.
- **Focus is never under the header:** scroll padding and the sticky queue use the header's measured height, and a control that receives focus under the sticky header scrolls just enough to show it.
- **One live status:** the header status line announces page-level results. Inline notices are visible but not live, so a result is announced once.
- **Escape closes disclosures:** inside an open `details` (paste box, diagnostics, replay steps), Escape closes it and returns focus to its summary. Typed text stays in the field.
- **Long machine text scrolls in place:** evidence and diffs keep their line structure and scroll horizontally inside a focusable, labeled region.

### Visual system

- **Same palette, fewer surfaces:** charcoal, mineral paper, warm stone, and plum keep their earlier values. The page now has two structural blocks, the stone source panel and the case file, instead of four framed panels.
- **Light theme inverts the focal surface:** the light page is mineral paper and the case file becomes ink, so both themes keep one dark or light reading block.
- **Fewer lines:** separators are a 55 percent tint of the edge color, used only between rows and stage content. Component boundaries keep at least 3:1.
- **Radius by role:** 4px for severity tags, 6px for controls and code, 10px for source rows, and 16px for the two structural blocks.
- **No elevation shadows:** nothing on the page floats. Hover uses a tint, and the selected radio ring is an inset ring.
- **MOTION 1:** only color, border, and tint transitions on hover and selection, plus smooth scrolling to a new result. Both sit inside `prefers-reduced-motion: no-preference`. The previous rise and stamp animations were removed.
- **The page script is minified as a module:** `scripts/build-web.ts` now passes `format: "esm"`, which matches the page's module script and lets esbuild shorten top-level names. The script is 22 KiB, inside the 25 KiB budget, with the added focus and state handling.

The sections below record Specs 10 and 11. Where they differ from Spec 12 (masthead framing, headline length, the step list, motion, and the auto-scan after a folder load), Spec 12 applies.

## Identity

- **Owner's tombstone logo:** the owner supplied the mark on 2026-11-15. It appears in the header and becomes the centre of the masthead's scanning aperture. No third-party image or copied artwork appears in the product.
- **Dark ink, mineral paper, warm stone:** the three structural surfaces create hierarchy before decorative treatment. Ink holds active work, paper holds long-form inspection, and stone marks the source-selection phase.
- **Plum scan line:** this comes from the logo. It marks an active evidence trail, an active case, and the aperture line. It does not style every control.
- **Red and green keep their meaning:** red is severity and danger only. Green is a replay blocked or patch verified only.
- **Aperture with one ring:** a tombstone-shaped aperture inside a single hairline ring makes scanning visible without stock imagery. The earlier orbits, dots, and the "Local examination 01 / 10" label were removed on 2026-11-16: they overflowed the panel and implied a sequence the product does not have.

## Typography

- **Rounded display type:** `ui-rounded`, then local system fallbacks, gives the headline, section titles, case title, and severity counts a direct human voice. It also avoids a network font request and layout shift.
- **System sans for interface text:** controls, descriptions, status, and metadata stay compact and familiar to read.
- **Monospace only for machine text:** evidence, diffs, pasted JSON, fixture IDs, rule IDs, and file paths preserve their technical meaning without turning the whole product into a terminal costume.
- **Sentence case:** labels carry enough meaning without wide uppercase tracking or repeated marketing-style kickers.

## Layout

- **Framed masthead, sized to content:** the product explanation sits on mineral paper and the mark on a narrower ink column, inside one rounded panel on the canvas. The panel has no minimum height, so the case picker starts within the first screen: at 1440x900 it moved from y=1251 to y=624, and at 390x844 from y=1032 to y=552.
- **Headline in three lines:** the headline is capped at 4.35rem with gentle tracking, so it reads in three lines on a laptop instead of five. Read, Replay, and Verify remain a short factual explanation of the actual engine flow.
- **One container, one panel rhythm:** the masthead, case picker, and review all sit in the same 1320px container as framed panels with the same gap and radius. Previously each stage was full bleed with its own padding, and the masthead's gutter showed an ink strip on the left.
- **Warm case-selection field:** cases are a distinct source-selection decision, so they sit on stone rather than another dark card grid.
- **Dark review field and contrasting case file:** the findings queue remains dark and dense; the selected case becomes a paper reading surface. The inverse happens in light mode, so both themes retain a focal case file.
- **Asymmetric wide layout:** at 920px, the findings queue stays beside a wider case file and may scroll within the viewport. Below that, the page stacks in the user's task order.
- **Content breakpoints:** case cards split at 600px, the masthead shows the mark at 720px, the queue moves beside the case file at 920px, and the project panel moves beside the cases at 1200px. Below 720px the mark is hidden, because the header already shows it and the explanation matters more on a phone.
- **Filters as a grid:** the two filters share one row in a two-column grid at every width, instead of wrapping into an uneven stack on phones.

## Interaction

- **Evidence trail:** Scan, Replay, Patch, and Verify name their current state in text, then the connecting line changes from dashed to solid only after real completion.
- **Results stay discoverable:** the page scrolls to a new result only when it is out of view. A scan leads to findings, a selection leads to its case file, and later actions lead to their newest result.
- **Errors appear at the source:** failed case-file actions and local project loads show an inline message as well as the header status.
- **No security overclaim:** a no-findings state says only that no rule matched.
- **Hover belongs to mouse pointers:** hover styles only appear for `hover: hover`; touch states do not get stuck in a hover appearance.
- **Native controls remain native:** buttons, selects, `details`, and textarea preserve browser, keyboard, and screen-reader behavior.

## Motion

- **No load animation:** the masthead is static. Motion is reserved for changes the visitor caused.
- **State feedback:** scan findings rise in after a real result, replay steps come in sequence, and the final verification status settles in. These movements make a changed state easier to locate.
- **Reduced motion:** all nonessential motion lives inside `prefers-reduced-motion: no-preference`.

## Delivery

- **No new remote dependency:** the workbench remains a static site that makes same-origin requests only.
- **Content-hashed engine assets:** JavaScript, CSS, and fixture data remain fingerprinted for immutable caching. The favicon and app icons remain fixed-name root files for browser and manifest discovery.
- **Contrast:** text has a minimum checked ratio of 4.58:1 on the warm stone surface and higher elsewhere; component boundaries and focus states are 3:1 or higher.


## Production workbench redesign, Spec 11

### Source priority

- **Local project first:** The folder picker is the primary source action. It sits directly below the local-project heading on narrow screens, so a 390px viewport exposes the action without a scroll. The three fixtures remain in a separate Controlled examples section with their original descriptions and fake-token boundary.
- **Loaded project remains selectable:** A successful folder or pasted-config import creates a compact `Your project` selector inside the local panel. A visitor can return to the validated local source after inspecting an example without sending or re-reading its files.
- **Paste data does not linger:** The `mcp.json` field clears only after the Worker accepts its text. Invalid input stays in place for correction.

### Evidence and state

- **Engine truth stays visible:** Finding fields, diagnostic fields, replay output, patch output, and verification output come from the active redacted Worker response. The page only groups, orders, counts, and labels those values. A finding removed by a verified patch is marked as Baseline scan evidence instead of being presented as current.
- **Diagnostics are not findings:** Parse diagnostics appear in a native disclosure with their code, file, line, and message. The disclosure states that parsing diagnostics are not security findings.
- **Static means static:** GRAVE-007 no longer advertises a replay scenario that the simulator does not support. The case file labels it Static evidence, removes replay and automatic-patch controls, and directs the user to the documented boundary.
- **Action feedback stays near the action:** Source, report-export, and case-file actions each use a short local status. The global status is reserved for page-level progress and failure. The long case-file article is no longer a live region.

### Responsive behavior

- **Mobile begins with a real action:** The masthead keeps factual orientation, but its process descriptions collapse to labels below 600px. This protects the Read, Replay, Verify structure while making the folder action visible at 390px.
- **Content breakpoints remain task-led:** The page stacks source, findings, and case file until the finding queue can sit beside the case file without trapping scroll. The examples return to a single right-side column at wide widths instead of becoming a second dense card grid.
- **Long evidence is contained:** Paths, diagnostics, evidence, and diffs remain in wrapping or bounded scrolling regions. The page itself does not scroll horizontally.

### Color, motion, and delivery

- **The atelier surfaces remain structural:** Ink holds evidence, mineral paper holds explanatory and selected reading surfaces, and warm stone holds source selection. The local-first layout changes task order, not the product identity.
- **Stone uses a darker plum label:** The primary-workflow and example labels use `#351b42` on warm stone, measured at 4.81:1. This replaces the previous near-threshold plum for normal text.
- **Motion remains state feedback:** No new motion was added. Existing transition and result behavior stays inside `prefers-reduced-motion: no-preference`.
- **Worker lifecycle stays honest:** Work remains serialized in the dedicated Worker. The page disables source actions and asks the visitor to reload after an unexpected Worker failure. It exposes no cancel control because the protocol has no safe partial-request cancellation or rollback state.
- **The page script is minified at build time:** `scripts/build-web.ts` minifies the already-reviewed DOM renderer after replacing fixed asset URLs. This preserves the 25 KiB page-script budget without adding a runtime dependency.
