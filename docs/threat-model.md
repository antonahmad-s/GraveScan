# Threat Model

GraveScan itself is a target, especially as a public demo.

| Threat | Mitigation |
|---|---|
| Arbitrary repo upload leading to code execution | No upload. The web UI accepts fixture IDs only. `self-scan` reads the repo's own `.kiro/` from a fixed path and is CLI-only. |
| Path traversal in fixture or patch paths | Reject `..`, absolute paths, escaping symlinks |
| Simulator used for SSRF or exfiltration | No network code in simulator; bounded static steps. The page only fetches its own static files (Playwright test) |
| Patch modifies originals | The web engine patches an in-memory copy in the visitor's tab; the CLI patches a copy under `.gravescan-work/` |
| One visitor changes another visitor's results | No server state. Each tab runs its own engine with its own copies, patches, and baselines (unit and Playwright tests) |
| Resource exhaustion from many visitors | The host serves static files only; scans run on each visitor's own CPU and memory |
| Script injection in the UI | All rendered values are HTML-escaped; `dist/_headers` sets a Content Security Policy that allows same-origin scripts, styles, and requests only, plus `nosniff` and `X-Frame-Options: DENY` |
| Secret leakage in reports | Fake canary tokens only; reports are built from findings and never read the environment (tested) |
| False sense of security | UI and README never claim "secure"; show verification status |
| Patch hides risk by deleting or moving findings | Success requires the rule's count in the file to drop AND replay `blocked`; a move-only patch is `Needs review` |
