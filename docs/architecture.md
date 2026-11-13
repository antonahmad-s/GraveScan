# Architecture

```mermaid
flowchart LR
  F[Fixture] --> S[Scanner]
  S --> FN[Findings]
  FN --> R[Simulator replay]
  FN --> P[Patcher]
  P --> W[Isolated copy]
  W --> S2[Rescan]
  W --> R2[Replay again]
  S2 --> V[Verification report]
  R2 --> V
```

Packages: `scanner`, `simulator`, `patcher`, `reporting`, `fixtures`; consumed by `apps/web` and the `gravescan` CLI. A dev-only MCP server (`gravescan-dev`) exposes the same functions to Kiro agents.

Full requirements: see the PRD and `.kiro/specs/`.
