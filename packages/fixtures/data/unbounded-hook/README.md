# Fixture: unbounded-hook

This fixture is intentionally vulnerable test data. Do not copy it into a real project.

It models a hook that treats the saved file's path as a command, with no allowlist and no input validation. Nothing in this folder is ever executed.

The Kiro config lives in `dot-kiro/` so Kiro does not load it. GraveScan exposes it as `.kiro/`.
