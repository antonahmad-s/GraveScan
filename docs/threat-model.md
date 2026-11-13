# Threat Model

GraveScan itself is a target, especially as a public demo.

| Threat | Mitigation |
|---|---|
| Arbitrary repo upload leading to code execution | No upload. Fixtures only. |
| Path traversal in fixture or patch paths | Reject `..`, absolute paths, escaping symlinks |
| Simulator used for SSRF or exfiltration | No network code in simulator; step limit and timeout |
| Patch modifies originals | Patches apply only to `.gravescan-work/` copy |
| Secret leakage in reports | Fake canary tokens only; reports exclude environment |
| False sense of security | UI and README never claim "secure"; show verification status |
| Patch hides risk by deleting findings | Success requires rescan AND replay `blocked` |
