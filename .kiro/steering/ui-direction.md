# UI Direction

Calm security evidence workbench with a clean editorial interface, a strong evidence hierarchy, and a restrained architectural visual language. ENERGY 2 / RHYTHM 2 / MOTION 1. Audience: developers and technical judges. The owner set this direction on 2026-11-16 (Spec 12); it replaces ENERGY 3 / RHYTHM 3 / MOTION 2.

- Identity: charcoal, mineral paper, and warm stone are structural surfaces. Plum marks selection and the active stage only. Red only marks severity and danger. Green only marks a blocked replay or a passed verification.
- The owner's tombstone logo stays the brand mark and a small scanning aperture beside the intro. It never competes with the headline or the primary action.
- One focal surface: the case file. The findings queue sits beside it on wide screens without a card of its own. Avoid making every region an equal card.
- One primary button per stage: the folder picker first, then the selected source's scan, then replay, patch proposal, and isolated apply in order.
- Choosing a folder only loads it. The visitor starts the scan with "Scan current project". Pasted `mcp.json` scans at once because its button says so.
- Large rounded display type for the headline, section titles, case title, and counts. System sans for interface text. Monospace only for evidence, diffs, pasted config, and machine identifiers.
- Identity motif: the numbered Scan, Replay, Patch, Verify trail. Each stage names its state in text and marks it with a shape.
- Dark mode default for evidence and diff reading; light mode is a real inverted reading surface (paper page, ink case file), not a recolored dark mode.
- Motion: color and border transitions on hover and selection, and smooth scrolling to a new result. All of it sits inside `prefers-reduced-motion: no-preference`. Nothing loops or enters on its own.
- Focus follows results: selecting a finding focuses the case title; scan, replay, patch, and apply focus the region that holds the new result; filtering never moves focus.
- Severity, status, error, and selection always have a text label or shape, not color alone. Meet WCAG AA contrast and 3:1 for boundaries and focus.
- Every control is keyboard accessible with a visible focus state and at least a 44px target.
- No decorative buttons: every button has real behavior.
- Every view has loading, empty, error, and success states that say what happened and what to do next.
