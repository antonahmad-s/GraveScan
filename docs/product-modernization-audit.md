# Product Modernization Audit

**Scope:** GraveScan as a security workbench for professional users. The current delivery is a static Cloudflare Worker and a browser-local scan engine. This audit separates the improvements implemented in this branch from later product decisions.

## 1. Executive Summary

GraveScan has a credible security boundary, but its current product maturity is below a serious production security tool. It is a useful single-user workbench, not yet a team security platform. The previous fixed asset URLs also prevented safe long-term browser caching, which is bad for repeat visits and unnecessary origin traffic.

The correct near-term decision is to keep the browser-local engine. It preserves the strongest product promise: a developer can inspect their own `.kiro/` files without sending them to a service. The implementation in this branch improves the decision surface with a live triage summary and fingerprints static assets so Cloudflare can cache them for a year without serving old code after deploy.

Do not add WebGL, scroll hijacking, decorative video, an AI chat panel, or a fake command terminal. They would make the workbench slower and less trustworthy without improving scan decisions.

## 2. Gap Analysis

| Area | Current gap | What to change | What is unsafe or wasteful to keep |
|---|---|---|---|
| Information hierarchy | The prior UI showed a list but did not summarize risk before a user read each row. | Implemented: a source-aware triage strip and actual severity counts above the queue. | Making users derive priority from a long list wastes expert time. |
| Real-project workflow | Folder and paste entry exist, but the experience ends at an in-memory patch. | Next: export a reviewable patch instruction or open a local CLI workflow. | Pretending the browser can safely rewrite a repository would be misleading. |
| Collaboration | No projects, history, owners, approvals, or audit log. | Add only after an explicit identity and retention design. | Adding a database without access control and retention rules creates a data-risk product. |
| Rule coverage | Rules focus on Kiro settings, hooks, agents, and steering. | Add versioned rule packs, rule tests, and confidence rationale. | Claiming broad security coverage now would be false. |
| AI | No AI assistance. | Use AI only to explain a finding or draft remediation from a redacted, user-approved excerpt. | Sending raw configurations or secrets to an LLM is a boundary violation. |
| Delivery performance | Static assets previously had stable URLs, so they could not be cached immutably. | Implemented: SHA-256 content-hashed JS, CSS, and fixture assets. | Long caching at stable URLs risks a stale engine after deploy. |
| Observability | No privacy-preserving product telemetry or error reporting. | Add opt-in, aggregate telemetry only after a data contract. | Third-party analytics by default conflicts with the local-analysis promise. |

## 3. Discovery & Alternatives

### A. Keep the static browser engine on Cloudflare Workers (recommended now)

- **UX maturity:** instant, private, no sign-in path for an individual developer.
- **Speed and architecture:** the Worker serves static assets; scan work uses the visitor's CPU. Content-hashed assets are cacheable indefinitely.
- **AI leverage:** optional local or user-approved explanation can sit above the same pure engine later.
- **Security posture:** no upload API, no database, no service-side project files, and CSP remains `connect-src 'self'`.
- **Trade-off:** no persistence, team workflow, or direct patch write-back. Browser file APIs vary slightly across browsers.

### B. Local-first VS Code or Kiro extension backed by the existing CLI

- **UX maturity:** scan on save, inline evidence, and a deliberate “apply reviewed patch” action can fit the developer's existing workflow.
- **Speed and architecture:** use the Node CLI against the local checkout. No browser file transfer or separate hosted backend is necessary.
- **AI leverage:** an extension can ask for a redacted excerpt before using an approved model provider.
- **Security posture:** least-privilege workspace access and explicit commands. The extension must never inherit shell or network permissions by default.
- **Trade-off:** install friction and editor-specific maintenance. It does not solve centralized policy or reporting.

### C. Hosted team control plane with a narrow Cloudflare API and GitHub App

- **UX maturity:** policy baselines, pull-request annotations, findings ownership, approval history, and scheduled scans.
- **Speed and architecture:** keep scanning in CI runners or GitHub Actions; use a Worker plus D1/Durable Objects only for metadata and job state.
- **AI leverage:** redacted finding summaries can be triaged in a controlled service with auditability.
- **Security posture:** GitHub App installation scopes, per-tenant authorization, encrypted secrets, retention policy, audit logs, and rate limits are mandatory.
- **Trade-off:** this is a different product with operating cost and compliance duties. Building it for a hackathon without identity, tenancy, and retention design would be irresponsible.

## 4. Update Plan

### Now, implemented in this branch

1. Fix Workers preview configuration with `"previews": {}` so `wrangler preview` can create a pull-request preview.
2. Fingerprint static assets and cache `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`; keep `index.html` revalidated.
3. Add source-aware triage context and actual finding counts by severity.
4. Enforce browser-local byte limits using UTF-8 bytes, not JavaScript character count.
5. Add build, cache, security, unit, and browser-flow verification.

### Done in Spec 07

1. Engine moved to a dedicated Web Worker; main-thread long tasks on a 500-file project dropped from 296 to 309 ms (4x CPU) to none over 50 ms.
2. Findings ordered by risk, highest selected after a scan.
3. Fixture bundle preloaded; fixture buttons rendered in static markup; cold-load CLS 0.0175 to 0.0000 in the lab.
4. One scan per engine action instead of up to three.
5. `--format sarif` for GitHub code scanning; see `docs/github-code-scanning.md`.
6. COOP, CORP, and Permissions-Policy headers.

### Next, highest ROI

1. Add a safe “copy remediation command” or patch instruction that never includes a raw secret value.
2. Add a rule-pack manifest with rule version, rationale, confidence, and test fixtures.
3. Add an opt-in local scan history stored only in `localStorage`, with a clear delete control. Do not store file content.
4. Ship the CLI as a versioned package, then build a Kiro or VS Code extension around it.

### Later, only after product validation

1. Design identity, tenancy, audit retention, and policy ownership before adding a hosted team backend.
2. Add GitHub App pull-request scanning with read-only repository scope by default.
3. Offer AI explanation only with explicit user confirmation and redaction before transmission.

## 5. UI/UX Modernization Blueprint

Spec 09 (2026-11-15) changed the accent from amber to the violet of the owner's logo, added a serif display face, and replaced the three columns with a case picker above a two-column board. The principles below still apply; `docs/design-decisions.md` has the current choices.

- **Color system:** charcoal is the default evidence surface; paper remains a real alternate theme. Amber marks the active evidence trail, red only marks high and critical risk, and green only marks a verified outcome. The triage strip uses amber on its left edge to connect source selection to the findings queue.
- **Typography:** use system sans-serif for labels, prose, and actions; reserve monospace for pasted configuration, evidence, and unified diffs. Headings are compact and task-led: “Choose a case”, “Static scan”, “Finding detail”.
- **Layout and density:** desktop uses three functional regions, not equal marketing cards: source selection, queue, and case detail. A narrow viewport stacks the regions in scan order. The triage strip gives the current source and risk distribution before the detail view.
- **Motion:** only short CSS color and border transitions for state changes. No scroll-driven effects, parallax, WebGL, or animated counters. Motion obeys `prefers-reduced-motion`.
- **Interaction:** native buttons, `<details>`, selects, and textarea preserve keyboard behavior. Every action has visible focus, disabled state, error state, and a status announcement. Source files never leave the tab.

## 6. Security & Performance Checklist

### Security

- [x] CSP limits scripts, styles, images, and connections to same-origin resources.
- [x] The browser engine accepts only controlled fixtures or validated `.kiro/` text files.
- [x] No upload endpoint, no server-side scan state, no database, and no third-party scripts.
- [x] Engine outputs and CLI output redact known secret-like values before rendering, exporting, or logging.
- [x] File count and byte limits are enforced before reading and again at the engine boundary.
- [x] UI data is rendered with DOM nodes and `textContent`; the renderer has no HTML injection sink.
- [x] Trusted Types requires `TrustedScriptURL` at the Worker URL sink and permits only the `gravescan` policy.
- [x] A least-privilege GitHub workflow writes and uploads redacted SARIF for this repository's `.kiro/` changes.
- [ ] Rule coverage has not been externally validated against a representative corpus of production Kiro projects.

### Performance

- [x] Browser engine JavaScript has an enforced 125 KB uncompressed build budget; the current build is validated in tests.
- [x] CSS-first state transitions respect reduced-motion preferences.
- [x] Static JS, CSS, and fixture JSON use content-hashed URLs with immutable caching; HTML remains revalidated.
- [x] The E2E suite asserts that the app loads only same-origin static resources.
- [ ] LCP < 2.5 s, INP < 200 ms, and CLS < 0.1 are product targets, not field measurements. Real-user monitoring or a controlled production test is required before claiming them.

## 7. Risks & Trade-offs

- Browser-local scanning protects project privacy, but it cannot give team history, shared policy, or server-side enforcement.
- Redaction reduces accidental leakage but cannot prove it catches every secret format. A user must still treat exported reports as sensitive.
- In-memory patching proves a remediation path without changing a checkout. That is safer for a demo, but less convenient than a local extension.
- Immutable caching increases repeat-visit speed but makes build correctness critical. The HTML references every new hash, so a failed or partial deploy must not be promoted.
- A polished visual layer helps triage. It does not make the scanner more accurate. Rule quality, false-positive management, and trust in remediation need sustained engineering work.
