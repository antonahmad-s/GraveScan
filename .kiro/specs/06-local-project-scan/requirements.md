# Requirements: Scan a Real Project

## Introduction
Let a developer scan their own Kiro configuration, not only the bundled fixtures, without sending files anywhere and without exposing secrets in the UI, the CLI output, or exported reports.

## Requirements

### 1. Web: the visitor's own files
- 1.1 THE web app SHALL let a visitor choose a project folder or paste an `mcp.json`, and SHALL scan, replay, patch, verify, and report on it like a fixture.
- 1.2 THE web app SHALL read files only in the visitor's tab and SHALL make no network request with their content.
- 1.3 THE web app SHALL read only `.json`, `.md`, `.yaml`, `.yml`, and `.txt` files inside the shallowest `.kiro/` folder, skipping `node_modules` and `.git`.
- 1.4 THE engine SHALL re-validate every file at its boundary: a relative path under `.kiro/`, no traversal, no duplicates, at most 500 files, 1 MB per file, and 5 MB in total.
- 1.5 Loading new files SHALL replace the earlier local project and its patches. Reloading the page SHALL clear them.

### 2. CLI
- 2.1 `gravescan scan --path <dir> --format json` SHALL scan `<dir>/.kiro/` with the same limits and symlink rejection as `self-scan`.
- 2.2 `scan` SHALL require exactly one of `--fixture` and `--path`.
- 2.3 `--fail-on` and option names SHALL reject prototype keys such as `constructor`.

### 3. Secrets
- 3.1 Every web response, CLI output, diff, and Markdown report SHALL show secret-like values as `[REDACTED]`. Environment references such as `${API_TOKEN}` SHALL stay visible.
- 3.2 Redaction SHALL cover key-named assignments and well-known token formats without a key name.
- 3.3 A GRAVE-009 patch SHALL replace the value on the finding's own line with an environment reference named after its key.

### 4. Hostile input
- 4.1 Secret detection and redaction SHALL run in linear time, so one long line cannot freeze the tab or the CLI.

### 5. Tests
- 5.1 Unit tests SHALL cover import planning, validation, redaction, the CLI path mode, and the GRAVE-009 patch on a realistic config.
- 5.2 Playwright SHALL cover the paste flow and the folder flow, including redaction and same-origin-only requests.
