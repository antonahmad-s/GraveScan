# UI Direction

Forensic incident room with an editorial voice. ENERGY 2 / RHYTHM 3 / MOTION 2. Audience: developers and technical judges.

- Identity: the owner's tombstone logo and its violet scan line. The scan line appears once as the edge between the brief and the workspace, and again as the busy indicator.
- Violet marks only the current selection and evidence trail. Red only for severity and danger. Green only for truly verified results.
- Serif display type for headings and the severity counts; system sans for interface text.
- Monospace only for evidence, diffs, pasted config, and machine identifiers (file paths, rule IDs, fixture IDs).
- Identity motif: an evidence trail linking scan, replay, patch, and verify.
- Dark mode default (log and diff readability); light mode available.
- Animate only state changes: the scan line on load and while the engine is busy, new results arriving, replay steps, and the verification status. Only the busy indicator repeats, and it stops when the engine replies. Respect `prefers-reduced-motion`.
- Severity and status always have a text label, not color alone. WCAG AA contrast.
- Every control is keyboard accessible with a visible focus state.
- No decorative buttons: every button has real behavior.
- Every view has loading, empty, error, and success states.
