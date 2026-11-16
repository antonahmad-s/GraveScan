# UI Delivery Gate

Antislop mode: during. Last run 2026-11-16 for Spec 10 with `pnpm verify`, `pnpm test:e2e`, computed contrast checks, and screenshots at 390, 768, 1060, and 1440px in both themes. The local browser used the same built static files that Cloudflare serves.

## Hard gate

- **R-02:** PASS. `grep` found no em dash character in the HTML, CSS, or browser JavaScript sources.
- **R-03:** PASS. Playwright completes the full scan, patch, and verification flow at 390, 768, 1060, and 1440px. Every run reported no horizontal overflow and no visible button shorter than 44px. The layout has distinct stages at 640, 920, and 1200px rather than only a phone and desktop state.
- **R-17, R-18, R-36, R-38:** PASS. The page adds no testimonials, customers, dashboard statistics, or security claims. "Ten deterministic rules" comes from GRAVE-001 through GRAVE-010. The risk counts come from the scanner's live output.
- **R-23:** PASS. The only visual image is the tombstone mark the owner supplied. The masthead uses the same local SVG as an abstract scanning aperture. No third-party logo, icon pack, stock image, or illustration was added.
- **R-24, R-26:** PASS. The page adds no navigation links. Every control has a real behavior. E2E clicks fixture choice, scan, filters, finding detail, replay, patch generation, apply, export, reset, theme, folder input, and paste.
- **R-25:** PASS. Computed normal-text contrast is at least 4.58:1 in both themes. That minimum is the small text on the warm stone surface. Component boundaries and focus rings are at least 3.19:1 on ink, 4.44:1 on mineral paper, and 3.62:1 on stone. Diff foregrounds have at least 6.08:1 on their highlighted line.
- **R-27:** PASS. Empty, loading, busy, filter-empty, clean-scan, error, and success states remain. A clean scan says no rule matched and does not call the project secure. An error appears in the header and next to the local loader or case-file action that caused it.
- **R-32, R-39:** PASS. First Tab reaches the skip link. Enter activates cases and findings. Focus stays on the selected case or finding after a list update. Native buttons, selects, `details`, and textarea remain keyboard accessible with visible focus. The page has one `h1`, ordered headings, `header`, `main`, and `footer` landmarks.
- **R-33:** PASS. UI changes live in HTML, CSS, and browser JavaScript source. No source or CSS patching script exists.
- **R-34:** PASS. The light theme uses a paper review field with a dark case file; the dark theme uses an ink review field with a paper case file. Both were clicked through and reviewed in screenshots.
- **R-35:** PASS. `pnpm verify` reports 246 passing tests. `pnpm test:e2e` reports 15 passing browser tests. The local visual pass at 390, 768, and 1440px in both themes reported no console errors or horizontal overflow.
- **R-40:** PASS. The masthead's local SVG has intrinsic `width` and `height`, and `fetchpriority="high"`. No third-party script, font, image, or remote request was added. The built site keeps its strict same-origin CSP. The E2E network allowlist accepts only the document, fingerprinted assets, and local icon set.

## Purpose and liveliness

- **Dials:** PASS. ENERGY 3 / RHYTHM 3 / MOTION 2, declared in Spec 10, `.kiro/steering/ui-direction.md`, and `docs/design-decisions.md`.
- **Focal point:** PASS. The selected case file uses the contrasting surface and larger type. On wide screens, the queue stays beside it instead of competing as another equal panel.
- **Whitespace:** PASS. The split masthead gives the product explanation and scanning aperture separate fields. The source-selection and review stages use different density for different decisions.
- **Accent and motif:** PASS. The plum scan line from the owner-provided mark appears only in active evidence and the scan aperture. The aperture and evidence trail are product-specific motifs.
- **Motion:** PASS. The aperture, orbits, results, trace, and verification use only one-time state transitions. No animation repeats. `prefers-reduced-motion` turns the nonessential animation off.
- **Originality:** PASS. The owner-provided reference guided dark panels, mineral paper, warm stone, rounded display type, and asymmetric spacing. No reference artwork, wording, brand, or exact page composition was copied.
