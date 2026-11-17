# Submission Checklist (Kiroween, Frankenstein)

Source: requirements pasted by the team. Re-check the official Rules tab before submitting.

## Repository
- [x] Public GitHub repo (not GitLab or Bitbucket)
- [x] LICENSE detected in the About section (GitHub reports MIT)
- [x] `/.kiro` at root, with specs, hooks, steering; NOT in `.gitignore`
- [x] All source, assets, and run instructions included (`README.md` Quick start)
- [x] Fixtures labeled intentionally vulnerable; fake tokens only (`packages/fixtures/data/*/README.md`)

## Deliverables
- [x] Working app URL: https://gravescan.antonahmadsusilo.workers.dev/ (no credentials needed)
- [ ] Text description of features (Devpost form; `README.md` "What it does" is the source)
- [ ] Demo video: under 3 minutes, public on YouTube, shows the app running (`docs/demo-script.md`)
- [ ] No copyrighted music, no third-party trademarks or logos
- [ ] Kiro write-up (`docs/kiro-workflow.md`): IDE/CLI/Web/Crew, custom agents, hooks, specs vs vibe, steering, MCP, PBT, powers
- [ ] Category selected: Frankenstein; bonus prizes chosen if any

## Product
- [x] Full flow works without login: scan, replay, patch, apply to copy, rescan, report (Playwright `demo flow` test in CI)
- [x] Every button has behavior; loading/empty/error/success states exist (Playwright e2e in CI)
- [x] Public deploy accepts no uploads and runs no user code (assets-only Worker; local files stay in the tab; e2e asserts same-origin static requests only)
