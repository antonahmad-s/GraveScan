# UI Design Decisions

Design Read: security workbench for developers and technical judges, in an architectural security atelier language, dial ENERGY 3 / RHYTHM 3 / MOTION 2. Spec 10 records the refinement from the owner's visual reference. The reference informs the visual qualities below, not a site to copy.

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
