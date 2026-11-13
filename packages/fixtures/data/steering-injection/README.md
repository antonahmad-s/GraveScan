# Fixture: steering-injection

This fixture is intentionally vulnerable test data. Do not copy it into a real project.

It models a steering file that asks the agent to print secrets, grants filesystem access outside the workspace, and claims priority over other safety rules. The token in it is a fake canary (`GRAVESCAN_CANARY_DO_NOT_USE_123`). Nothing in this folder is ever executed.

The Kiro config lives in `dot-kiro/` so Kiro does not load it. GraveScan exposes it as `.kiro/`.
