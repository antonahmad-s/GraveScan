# Requirements: Trusted Renderer and SARIF CI

## Introduction
Eliminate DOM XSS by construction and run the existing SARIF output through a least-privilege GitHub workflow.

## Requirements

### 1. Trusted rendering
- 1.1 THE browser renderer SHALL have no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write` sink.
- 1.2 THE browser SHALL render untrusted findings, evidence, diff text, report text, and local files with DOM nodes and `textContent`.
- 1.3 CSP SHALL require Trusted Types for script sinks and name only the `gravescan` policy.
- 1.4 THE worker URL SHALL use that policy, and a browser without Trusted Types support SHALL retain the same functional fallback.

### 2. SARIF CI
- 2.1 A GitHub workflow SHALL scan this repository's `.kiro/` with `--format sarif` and upload it under `security-events: write` and `contents: read` only.
- 2.2 The workflow SHALL run for `.kiro/` changes and manual dispatch.

### 3. Verification
- 3.1 A static test SHALL reject HTML injection sinks in the renderer.
- 3.2 Browser E2E SHALL verify hostile text containing an `img` with an error handler stays text, with no created image or event handler.
