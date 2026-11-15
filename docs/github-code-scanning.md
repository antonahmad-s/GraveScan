# GitHub Code Scanning

`gravescan scan --path <dir> --format sarif` writes a SARIF 2.1.0 log for `<dir>/.kiro/`. GitHub code scanning can ingest that log, so findings show up as pull request annotations and alerts in the Security tab.

## What the SARIF contains

- One rule per reported GraveScan rule, with `security-severity` set so GitHub sorts alerts: critical 9.5, high 8.0, medium 5.0, low 2.0.
- One result per finding, located at `.kiro/<file>` and its line, relative to the scanned directory.
- A `gravescanFinding/v1` fingerprint from rule, file, and evidence text, not the line number. The same finding keeps one alert when a reformat moves its line.
- Parse diagnostics as tool notifications.
- Secret-like values as `[REDACTED]`. The CLI redacts before building the log, so neither snippets nor fingerprints derive from a secret.

## Example workflow

Add this file as `.github/workflows/gravescan.yml` in the repository you want to scan. Pin `ref` to a commit SHA of GraveScan you have reviewed.

```yaml
name: GraveScan
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write # upload SARIF; nothing else

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: antonahmad-s/GraveScan
          ref: <reviewed-commit-sha>
          path: .gravescan-tool
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: corepack enable && corepack prepare pnpm@10.26.0 --activate
      - run: pnpm install --frozen-lockfile
        working-directory: .gravescan-tool
      - name: Scan .kiro/
        run: node .gravescan-tool/packages/cli/src/main.ts scan --path . --format sarif > gravescan.sarif
      - uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: gravescan.sarif
          category: gravescan
```

To also fail the job on high findings, add `--fail-on high` and set `if: always()` on the upload step so alerts are still uploaded.

## Limits

- Code scanning is free for public repositories. Private repositories need GitHub Advanced Security.
- The SARIF output is covered by unit tests for its structure, rule indexes, levels, locations, fingerprints, and redaction. GraveScan's own `.github/workflows/gravescan.yml` uploads its self-scan SARIF on `.kiro/` changes and on manual dispatch. The first live upload completed successfully in GitHub Actions on 2026-11-15. Its self-scan intentionally returned zero findings; this verifies ingestion, not alert rendering.
- GraveScan reads only `.kiro/` text files. It does not scan application source code.
