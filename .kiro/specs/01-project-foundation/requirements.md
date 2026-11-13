# Requirements: Project Foundation

## Introduction
Set up the GraveScan monorepo so later specs (scanner, simulator, patcher, UI) have a consistent, testable base. TypeScript end to end, pnpm workspaces.

## Requirements

### 1. Workspace structure
**User story:** As a developer, I want a monorepo with clear packages, so that each concern is isolated.
- 1.1 THE repository SHALL contain `apps/web` and packages `scanner`, `simulator`, `patcher`, `fixtures`, `reporting`.
- 1.2 WHEN `pnpm install` runs, THE workspace SHALL resolve all packages without errors.

### 2. Scripts and quality gates
**User story:** As a developer, I want one command per quality check.
- 2.1 THE root SHALL define `lint`, `typecheck`, `test`, `docs:check`, and `gravescan`.
- 2.2 WHEN `pnpm test` runs, THE system SHALL run Vitest including fast-check property tests.
- 2.3 WHEN any gate fails, THE command SHALL exit non-zero.

### 3. Fixture loader
**User story:** As a user, I want to load only trusted fixtures.
- 3.1 THE loader SHALL list fixtures from `packages/fixtures/` only.
- 3.2 IF a requested path contains `..`, is absolute, or escapes the fixture root via symlink, THEN THE loader SHALL reject it with a typed error.
- 3.3 THE loader SHALL provide three fixtures: `unsafe-mcp`, `unbounded-hook`, `steering-injection`.
- 3.4 THE fixtures SHALL contain only fake tokens such as `GRAVESCAN_CANARY_DO_NOT_USE_123`.
- 3.5 EACH fixture SHALL include a README labeling it intentionally vulnerable.

### 4. Isolated work copy
- 4.1 THE system SHALL create work copies under `.gravescan-work/` only.
- 4.2 THE original fixture files SHALL remain unchanged after any operation.
- 4.3 THE system SHALL support resetting a work copy to its original state.

### 5. Determinism
- 5.1 GIVEN the same fixture, THE loader SHALL return files in a stable sorted order.

### 6. CI
- 6.1 THE GitHub Actions workflow SHALL run lint, typecheck, and test on pull requests.

### 7. Submission readiness
- 7.1 THE repository SHALL include an MIT `LICENSE` and a root `.kiro/` directory.
- 7.2 `.gitignore` SHALL NOT match `.kiro/` or any subfolder.

## Decisions (resolved before Design)
- SQLite is deferred to Spec 05 (scan history). The foundation has no database.
- Fixtures store their Kiro config in `dot-kiro/` and the work copy renames it to `.kiro`. This avoids confusion with the root `.kiro` and keeps Kiro from loading fixture hooks as real hooks.
- Deploy target is still open (read-only API, no uploads). Decide in Spec 05.
