# Sandbox Runtime Notes

This repository is developed in a sandbox where `/root` is read-only and outbound requests to npm may be blocked.

- `pnpm-workspace.yaml` sets `storeDir: .pnpm-store` so pnpm never tries to create `/root/.local/share/pnpm/store/v10`. It lives there, not in `.npmrc`, because npm warns about pnpm-only keys in `.npmrc`.
- This local store is ignored by Git. It contains no source and must not be committed.
- Do not change the npm registry, add authentication, or disable TLS to work around a registry 403.
- If npm registry access is blocked, report the exact error and run no dependency-install workaround that vendors unreviewed code.
- For headless browser validation in this sandbox, use the bundled `chrome-headless-shell` executable and a writable `HOME` such as `/tmp/gravescan-browser-home`. Standard Chrome requires `--no-zygote` here because crashpad cannot use read-only `/root`.
- Background processes end with their tool invocation. Start any local server and browser check in the same bounded validation command.
