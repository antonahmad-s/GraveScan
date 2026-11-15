# UI Design Decisions

Design Read: security workbench for developers and technical judges, forensic incident-room visual language, ENERGY 2 / RHYTHM 3 / MOTION 1.

- **Dark default with light toggle:** logs, evidence, and unified diffs are read for extended periods, while a real toggle preserves user choice.
- **Charcoal, paper, amber, red, and green:** restrained neutrals keep evidence readable; amber marks the current trail, red is danger only, green is verified results only.
- **System sans-serif with monospace evidence:** navigation and explanations stay readable; source evidence and diffs need fixed character alignment.
- **Three-region desktop workspace that stacks on mobile:** fixture selection, evidence review, and remediation are distinct work stages, not equal cards.
- **Evidence rail marker:** it connects a finding to replay and patch actions, making the product's evidence trail visible without invented decoration.
- **Low motion:** short state transitions help track replay and verification changes; no animation competes with forensic reading.
- **Text wordmark only:** no logo asset was commissioned or supplied, so the title is typography rather than a fabricated brand asset.
- **"Your project" below the fixtures, not in a separate screen:** a real project follows the same scan, replay, and patch steps, so it joins the same rail and becomes one more case in the list.
- **Native `<details>` for pasting:** pasting is the secondary path, so it stays collapsed behind a labelled disclosure with its native marker instead of adding a second always-visible form.
- **Monospace paste box:** pasted JSON is source text, matching the evidence and diff blocks.
- **No dashboard metrics:** the UI presents actual scanner output rather than unsupported security or performance claims.
- **Triage context strip and severity counts:** the queue needs a source and a risk distribution before an expert opens individual findings; it uses real scan output rather than synthetic dashboard metrics.
- **Content-hashed static assets:** JavaScript, CSS, and fixtures get a SHA-256-derived URL, so Cloudflare can cache them immutably without serving a stale engine after a deploy. HTML stays revalidated.
- **Highest risk first:** the queue orders findings critical, high, medium, low and selects the top one after a scan. The engine keeps file and line order for reports and SARIF; ordering by risk is a presentation decision.
- **Fixture buttons in the markup:** the three bundled cases are known at build time, so the list is rendered before any script runs and does not shift when the engine becomes ready.
