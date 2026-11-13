# UI Direction

Forensic incident room. ENERGY 2 / RHYTHM 3 / MOTION 1. Audience: developers and technical judges.

- Red only for severity and danger. Green only for truly verified results.
- Monospace only for evidence and diffs.
- Identity motif: an evidence trail linking finding, replay, and patch.
- Dark mode default (log and diff readability); light mode available.
- Animate only replay steps and verification status changes. Respect `prefers-reduced-motion`.
- Severity and status always have a text label, not color alone. WCAG AA contrast.
- Every control is keyboard accessible with a visible focus state.
- No decorative buttons: every button has real behavior.
- Every view has loading, empty, error, and success states.
