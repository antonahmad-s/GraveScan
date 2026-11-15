# Requirements: Worker Engine, Triage Order, and Code Scanning

## Introduction
Keep the workbench responsive on large projects, show the highest risk first, remove load waterfall and layout shift, and let teams send findings to GitHub code scanning. Driven by lab measurements in `docs/product-modernization-audit.md`.

## Requirements

### 1. Responsiveness
- 1.1 THE engine SHALL run in a dedicated worker; the page script SHALL NOT import it.
- 1.2 Loading a 500-file local project and generating or applying a patch SHALL produce no main-thread long task (over 50 ms), measured with 4x CPU throttling.
- 1.3 An engine action SHALL scan at most once, apart from the baseline scan on reset.

### 2. Triage
- 2.1 THE finding list SHALL order findings critical, high, medium, low, keeping the engine's file and line order within a level.
- 2.2 After a scan, THE highest-risk finding SHALL be selected.

### 3. Loading and layout
- 3.1 THE fixture bundle SHALL be preloaded from the document so it does not wait for the page script.
- 3.2 THE bundled fixture buttons SHALL be in the static markup, disabled until the worker is ready, so the page does not shift on load.

### 4. Code scanning
- 4.1 `scan` and `self-scan` SHALL accept `--format sarif` and write SARIF 2.1.0.
- 4.2 SARIF rules SHALL carry generic text and a GitHub `security-severity`; results SHALL carry repo-relative locations and a fingerprint independent of line number.
- 4.3 SARIF SHALL be built from redacted findings.

### 5. Headers
- 5.1 Every response SHALL send `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, and a `Permissions-Policy` that disables camera, microphone, geolocation, payment, and USB.
