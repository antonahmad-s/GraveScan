# Security Policy

GraveScan can process two kinds of input:

- controlled, intentionally vulnerable fixtures bundled in `packages/fixtures/`;
- `.kiro/` text files that a visitor explicitly selects in the browser or a local user explicitly names for the CLI.

Browser-selected files are read in the visitor's tab. They are not uploaded to GraveScan or transmitted to analytics, telemetry, error reporting, AI services, or hosted storage. The browser accepts only supported text files in the shallowest `.kiro/` folder and applies file-count and byte limits before and after reading.

- No arbitrary repository upload to a service.
- No arbitrary code or shell execution.
- No outbound network requests from the simulator.
- No real secrets. Fixture tokens are fake canaries.
- Browser patches apply only to an in-memory isolated copy. CLI patches apply only to a validated `.gravescan-work/` copy.
- Path traversal and escaping symlinks are rejected.
- Untrusted text is rendered through DOM nodes and `textContent`; secret-like values are redacted before output.

To report a vulnerability, open a private security advisory on the GitHub repository.
