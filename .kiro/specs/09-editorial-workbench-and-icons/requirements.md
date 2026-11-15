# Requirements: Editorial Workbench and Icon Set

## Introduction
Rework the web workbench so a first-time visitor understands it at a glance and works through it on any screen, and ship the owner's tombstone logo as the favicon and app icon. The engine, its routes, and the security boundary do not change.

## Requirements

### 1. Orientation
- 1.1 THE page SHALL open with one sentence on what GraveScan does and the safe-simulation notice, before any action.
- 1.2 Each bundled case SHALL describe the risk it models in one sentence.
- 1.3 THE stages SHALL be numbered in the order they are used: choose a case, findings, case file.

### 2. Evidence trail
- 2.1 THE selected finding SHALL show its scan, replay, patch, and verify stages with a text state for each.
- 2.2 After a scan, a selection, a replay, a patch, or a verification, THE new result SHALL be scrolled into view when it would otherwise be off screen.
- 2.3 A failed action SHALL be reported next to the control that started it as well as in the header status.
- 2.4 A scan with no findings SHALL say that no rule matched and SHALL NOT imply the project is secure.

### 3. Responsive layout
- 3.1 THE layout SHALL have no horizontal overflow and 44px tap targets at 390, 768, 1060, and 1440px.
- 3.2 On wide screens THE findings queue SHALL stay in view beside the case file.
- 3.3 Hover styles SHALL apply only to hover-capable pointers.

### 4. Icon set
- 4.1 THE site SHALL serve `favicon.ico`, `icon0.svg`, `icon1.png`, `apple-icon.png`, `manifest.json`, and the 192 and 512px manifest icons from its root, with the same security headers as every other file.
- 4.2 THE build SHALL refuse a public file that would replace `index.html`, `_headers`, or `assets/`.
- 4.3 E2E SHALL fail on any request other than the document, the fingerprinted assets, and the icon set.

### 5. Accessibility and motion
- 5.1 All text SHALL meet WCAG AA in both themes; component boundaries and focus indicators SHALL meet 3:1.
- 5.2 Motion SHALL mark state changes only and SHALL stop under `prefers-reduced-motion: reduce`.
