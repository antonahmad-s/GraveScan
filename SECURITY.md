# Security Policy

GraveScan processes only controlled fixture repositories bundled in `packages/fixtures/`.

- No arbitrary repository upload.
- No arbitrary code or shell execution.
- No outbound network requests from the simulator.
- No real secrets. All tokens in fixtures are fake canaries.
- Patches apply only to an isolated copy of a fixture.
- Path traversal is rejected.

To report a vulnerability, open a private security advisory on the GitHub repository.
