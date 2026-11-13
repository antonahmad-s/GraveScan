# Security Boundaries

Forbidden in all code, tests, and generated tasks:

- Arbitrary shell or code execution from user or fixture input.
- Outbound network requests from the simulator.
- Real secrets. Use only `GRAVESCAN_CANARY_DO_NOT_USE_123`-style fake tokens.
- Writing outside the isolated work copy (`.gravescan-work/`). Fixture originals are read-only.
- Unvalidated paths. Reject `..`, absolute paths, and symlinks that escape the fixture root.
- Exporting environment variables or secrets in reports.

Required:

- Every simulator scenario has a step limit and a timeout.
- Patch operations come from an allowlist (remove risky autoApprove, add tool allowlist, restrict path, remove secret-like value, add sandbox policy, add approval requirement).
- Do not create real exploits. Scenarios are deterministic state machines.
