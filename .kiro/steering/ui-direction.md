# UI Direction

Architectural security atelier with an editorial interface. ENERGY 3 / RHYTHM 3 / MOTION 2. Audience: developers and technical judges.

- Visual reference: dark structural panels, mineral paper, warm stone fields, large rounded display type, deliberate asymmetry, and generous space. Use these qualities as inspiration, never as a clone of a named site or a copied composition.
- Identity: the owner's tombstone logo becomes a scanning aperture in the masthead. Its plum scan line marks active evidence only.
- Dark ink, mineral paper, and warm stone are structural surfaces. Red only marks severity and danger. Green only marks verified results.
- Large rounded display type for primary headings and risk counts. System sans for interface text. Monospace only for evidence, diffs, pasted config, and machine identifiers.
- Identity motif: a circular scan aperture in the masthead and an evidence trail linking scan, replay, patch, and verify.
- Dark mode default for evidence and diff reading; light mode is a real inverted reading surface, not a recolored dark mode.
- Animate only state changes: the aperture and its orbit settle on page load, findings arrive after a scan, replay steps and verification status arrive in order. Nothing loops. Respect `prefers-reduced-motion`.
- Severity and status always have a text label, not color alone. Meet WCAG AA contrast.
- Every control is keyboard accessible with a visible focus state.
- No decorative buttons: every button has real behavior.
- Every view has loading, empty, error, and success states.
