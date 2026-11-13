# Requirements: Patch and Verification Loop

## Introduction
Generate minimal allowlisted patches for findings, apply them only to an isolated fixture copy, then rescan and replay to determine whether the security outcome changed.

## Requirements

### 1. Patch generation
- 1.1 EVERY patch SHALL include finding ID, target file, before content, after content, unified diff, reason, risk note, and baseline high/critical finding count.
- 1.2 THE generator SHALL support the PRD allowlist: remove risky auto-approval, add tool allowlist, restrict path, remove secret-like value, add sandbox policy, and add approval requirement.
- 1.3 THE generator SHALL return a typed `PATCH_UNSUPPORTED` error for a rule without a safe minimal patch.
- 1.4 THE generator SHALL produce the same patch for the same isolated copy and finding.

### 2. Applying a patch
- 2.1 THE patcher SHALL apply only within the validated isolated work copy.
- 2.2 THE patcher SHALL reject absolute paths, traversal, symlink targets, forged copy roots, and before-content conflicts.
- 2.3 THE patcher SHALL be idempotent: applying the same patch twice has the same resulting file tree as applying it once.
- 2.4 THE patcher SHALL not modify original fixtures.

### 3. Verification
- 3.1 Verification SHALL rescan the isolated copy.
- 3.2 Verification SHALL re-run the associated safe replay when a patch's finding has an attack scenario.
- 3.3 A patch SHALL be `Regression detected` when it adds a High or Critical finding above its baseline.
- 3.4 A patch SHALL be `Needs review` when the target finding remains or replay remains exposed.
- 3.5 A patch SHALL be `Simulation blocked` when the target finding is absent and associated replay is blocked.
- 3.6 A patch SHALL be `Verified` when the target finding is absent and it has no replay scenario.

### 4. Tests
- 4.1 EACH allowlisted patch kind SHALL have a test.
- 4.2 Tests SHALL prove original fixtures are unchanged.
- 4.3 fast-check SHALL verify patch idempotence and no newly verified patch adds High or Critical findings.
