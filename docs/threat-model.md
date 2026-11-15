# Threat Model

GraveScan itself is a target, especially as a public demo.

| Threat | Mitigation |
|---|---|
| Arbitrary repo upload leading to code execution | No upload. A visitor's own files are read as text in their tab and only parsed, never executed. `scan --path` and `self-scan` read `.kiro/` text files only and reject symlinks. |
| Hostile or oversized local files freeze the tab | Only `.kiro/` text files are read: 500 files, 1 MB each, 5 MB in total, checked before reading and again at the engine. Secret matching is linear time; a test scans 200 KB hostile lines. |
| Real secrets shown on screen, in CI logs, or in shared reports | Engine responses and CLI output pass through `redactDeep`; secret-like values become `[REDACTED]` in evidence, diffs, and Markdown reports |
| Path traversal in fixture or patch paths | Reject `..`, absolute paths, escaping symlinks |
| Simulator used for SSRF or exfiltration | No network code in simulator; bounded static steps. The page only fetches its own static files (Playwright test) |
| Patch modifies originals | The web engine patches an in-memory copy in the visitor's tab; the CLI patches a copy under `.gravescan-work/` |
| One visitor changes another visitor's results | No server state. Each tab runs its own engine with its own copies, patches, and baselines (unit and Playwright tests) |
| Resource exhaustion from many visitors | The host serves static files only; scans run on each visitor's own CPU and memory |
| Script injection in the UI | All rendered values are assigned through DOM nodes and `textContent`; `dist/_headers` sets a Content Security Policy that allows same-origin scripts, styles, and requests only, plus `nosniff`, `X-Frame-Options: DENY`, and Trusted Types for script URL sinks. The engine runs in a dedicated worker with no DOM access. |
| Cross-origin windows or embeds reach the page | `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, and a `Permissions-Policy` that turns off camera, microphone, geolocation, payment, and USB |
| Error details leak internals | The worker returns only engine error messages; any other exception becomes "The request could not be completed." (unit tested) |
| Secret leakage in reports | Reports are built from redacted engine output. Redaction reduces accidental exposure but cannot prove recognition of every secret format; exported reports must still be treated as sensitive. |
| False sense of security | UI and README never claim "secure"; show verification status |
| Patch hides risk by deleting or moving findings | Success requires the rule's count in the file to drop AND replay `blocked`; a move-only patch is `Needs review` |
