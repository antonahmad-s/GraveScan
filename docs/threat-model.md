# Threat Model

GraveScan itself is a target, especially as a public demo.

| Threat | Mitigation |
|---|---|
| Arbitrary repo upload leading to code execution | No upload. The web UI accepts fixture IDs only. `self-scan` reads the repo's own `.kiro/` from a fixed path and is CLI-only. |
| Path traversal in fixture or patch paths | Reject `..`, absolute paths, escaping symlinks |
| Simulator used for SSRF or exfiltration | No network code in simulator; bounded static steps |
| Patch modifies originals | Patches apply only to a per-visitor copy under `.gravescan-work/sessions/` |
| One visitor changes another visitor's results | Random `HttpOnly; SameSite=Strict` session cookie, separate copies, patches, and baselines per session |
| Disk exhaustion from many visitors | At most 50 sessions; the least recently used one and its copy are deleted. Request bodies are capped at 16 KiB. |
| Misconfigured cleanup deletes the wrong directory | The sessions root must sit inside `.gravescan-work` or the OS temp directory, or the server refuses to start |
| Script injection in the UI | All rendered values are HTML-escaped; Content Security Policy allows same-origin scripts and styles only |
| Secret leakage in reports | Fake canary tokens only; reports are built from findings and never read the environment (tested) |
| False sense of security | UI and README never claim "secure"; show verification status |
| Patch hides risk by deleting or moving findings | Success requires the rule's count in the file to drop AND replay `blocked`; a move-only patch is `Needs review` |
