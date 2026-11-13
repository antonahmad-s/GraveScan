# Fixture: unsafe-mcp

This fixture is intentionally vulnerable test data. Do not copy it into a real project.

It models an MCP server that exposes a shell-capable tool, auto-approves it, and has no tool allowlist. Every token in it is a fake canary (`GRAVESCAN_CANARY_DO_NOT_USE_123`). Nothing in this folder is ever executed.

The Kiro config lives in `dot-kiro/` so Kiro does not load it. GraveScan exposes it as `.kiro/`.
