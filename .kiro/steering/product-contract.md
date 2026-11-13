# Product Contract

GraveScan is a security workbench for Kiro agent projects. Category: Frankenstein (static analysis + safe red-team replay + patch verification).

- Process only controlled fixtures in `packages/fixtures/`.
- Every finding is evidence-based: rule ID, severity, file, line, evidence, remediation.
- A patch is successful only when rescan AND replay confirm it. Fewer findings alone is not success.
- Never claim a project is "secure". Report evidence and verification status.
- Severity comes from deterministic rules, never from an LLM.
- Core flow: select fixture, scan, review, replay, patch, apply to isolated copy, rescan, report.
- UI must always show: "Safe simulation. No arbitrary code or network request was executed."
