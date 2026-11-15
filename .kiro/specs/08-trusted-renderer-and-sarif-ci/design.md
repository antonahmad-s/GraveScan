# Design: Trusted Renderer and SARIF CI

`app.js` uses three small DOM builders: `node`, `text`, and `append`. Dynamic values are assigned to `textContent`; attributes are assigned from fixed code paths. The scanner worker has no DOM access. This removes the need to prove escaping at each render site.

CSP uses `require-trusted-types-for 'script'; trusted-types gravescan`. Chromium treats `new Worker(string)` as a TrustedScriptURL sink. The only policy returns its provided URL, and the URL originates from a build-time constant replaced with a content-hashed path. The fallback string is reached only in browsers without Trusted Types.

`.github/workflows/gravescan.yml` generates SARIF from `self-scan` and uploads it. It owns only `contents: read` and `security-events: write`; it has no write access to source, issues, pull requests, deployments, or packages.
