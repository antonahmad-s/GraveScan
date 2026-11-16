# Requirements: Architectural Security Atelier

## Introduction
Refine the visual interface from the owner's supplied reference while preserving GraveScan's scanner, replay, patch, verification, privacy boundary, and accessibility behavior. The new interface must be art-directed and clean without cloning the referenced site or importing its imagery.

## Requirements

### 1. Visual direction

- 1.1 THE workbench SHALL use dark ink, mineral paper, and warm stone as structural surfaces.
- 1.2 THE masthead SHALL use the owner-provided tombstone mark as a local scanning aperture, not a copied external visual.
- 1.3 THE page SHALL use large rounded display typography for hierarchy and system sans for interface copy.
- 1.4 Plum SHALL mark active scan evidence only. Red and green SHALL keep their existing severity and verification meanings.

### 2. Workflow clarity

- 2.1 THE masthead SHALL explain the actual Read, Replay, and Verify flow before the visitor chooses a source.
- 2.2 THE source-selection phase SHALL sit on a visually distinct surface from the review phase.
- 2.3 THE selected finding SHALL remain the visual focal point with its evidence trail visible.
- 2.4 THE current routes, scanner output, replay, patch, verification, local-project scan, filters, export, and theme control SHALL retain their behavior.

### 3. Responsive and accessible presentation

- 3.1 THE masthead and review layout SHALL stack in source order below their content breakpoints.
- 3.2 THE wide review layout SHALL keep the finding queue accessible beside the selected case file.
- 3.3 THE dark and light themes SHALL be real, contrasting reading modes.
- 3.4 All normal text SHALL meet 4.5:1 contrast, all interactive boundaries and focus indicators SHALL meet 3:1, and nonessential motion SHALL obey `prefers-reduced-motion`.

### 4. Verification

- 4.1 THE existing static build, security, unit, type, lint, and Playwright checks SHALL continue to pass.
- 4.2 THE full flow SHALL have no horizontal overflow or undersized visible buttons at 390, 768, 1060, and 1440px.
- 4.3 THE browser SHALL make no new remote request.
