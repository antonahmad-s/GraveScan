# Design: Architectural Security Atelier

## Design Read
Reading this as: security workbench for developers and technical judges, in an architectural security atelier language, dial ENERGY 3 / RHYTHM 3 / MOTION 2.

The owner supplied a visual reference with large rounded typography, dark structural panels, warm mineral surfaces, deliberate asymmetry, and generous space. GraveScan adopts those visual qualities, not the reference's brand, wording, imagery, or exact layout.

## Composition

### Header

The sticky header stays small and functional: local tombstone logo, product name, contextual label on wide screens, live status, and theme control. It has no navigation links because this is a single workbench.

### Masthead

The masthead is one framed panel, sized to its content. From 720px it splits into a wide mineral-paper field and a narrower ink column. The paper field holds a sentence describing what the tool actually does, an explanatory paragraph, and three factual process labels. The ink column contains the local SVG tombstone mark inside a CSS-built aperture with one ring, and a stone base stating that the scan runs in the tab. Below 720px the ink column is hidden, because the header already shows the mark.

Every stage (masthead, case picker, review) sits in the same 1320px container as a framed panel with the same gap and radius, so the page reads as one aligned system at every width.

### Source selection

The case picker uses a warm stone field. The three controlled cases are neutral rectangular cards until selected. A selected case becomes ink with a plum active mark. The local-project route stays a paper panel inside the same stage, with the existing folder and paste controls.

### Review

The review is a two-column ink field from 920px. The finding queue stays sticky and scrollable when it outgrows the viewport. The selected case file becomes a mineral-paper panel, wider than the queue, with bigger display type. In the light theme, the review field becomes paper and the case file becomes ink. This preserves the focal contrast in both modes.

Existing DOM IDs and interactive HTML stay in place. The CSS custom properties are scoped to each surface, so controls and content keep sufficient contrast as they cross from stone to ink or paper.

## Color and contrast

| Surface | Normal text | Muted text | Interactive line and focus |
|---|---:|---:|---:|
| Ink | 15.59:1 or higher | 9.82:1 or higher | 3.19:1 or higher |
| Mineral paper | 12.95:1 or higher | 6.35:1 or higher | 4.44:1 or higher |
| Warm stone | 5.49:1 or higher | 4.58:1 or higher | 3.62:1 or higher |

A paper-context red and green are used on mineral paper. Brighter ink-context red and green are used on ink, including the diff, so semantic colors remain readable in both themes.

## Motion

The masthead is static. New findings, replay trace steps, and the verification status arrive in sequence only after a real state change. No animation loops. All animation is inside `prefers-reduced-motion: no-preference`.

## Scope

Only `apps/web/src/static/index.html`, `styles.css`, and the theme-color constants in `app.js` change runtime behavior or presentation. The worker protocol, scanner, simulator, patcher, reporting, content security policy, static asset build, icon set, and network boundary are unchanged.

## Design decisions

See `docs/design-decisions.md` for the rationale behind every major visual decision.
