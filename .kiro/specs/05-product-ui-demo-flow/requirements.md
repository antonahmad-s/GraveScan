# Requirements: Product UI and Demo Flow

## Introduction
Build the GraveScan web workbench around the trusted end-to-end flow: fixture scan, finding evidence, safe replay, patch preview, isolated apply, and verification.

## Requirements

### 1. Workspace
- 1.1 THE UI SHALL list only the three controlled fixtures.
- 1.2 THE user SHALL select a fixture and run its scan without login.
- 1.3 THE UI SHALL support reset and Markdown report export.

### 2. Findings and evidence
- 2.1 THE findings list SHALL show rule ID, severity, title, file, line, remediation state, and replay state.
- 2.2 THE user SHALL open a finding detail that shows evidence, remediation, file, line, and attack scenario.
- 2.3 THE UI SHALL provide severity and rule filters.

### 3. Replay, patch, and verification
- 3.1 THE user SHALL run an associated safe replay and see its steps, policy decision, result, evidence, and the required safety notice.
- 3.2 THE user SHALL generate a patch, inspect its unified diff, apply it only to the isolated copy, and see the verification report.
- 3.3 THE verification report SHALL compare before/after findings and replay result.

### 4. Complete interaction states
- 4.1 THE UI SHALL have empty, loading, error, and success states.
- 4.2 EVERY button and form control SHALL have real behavior.
- 4.3 THE UI SHALL support keyboard operation, visible focus, and dark/light themes.
- 4.4 THE UI SHALL respect `prefers-reduced-motion`.

### 5. Security
- 5.1 The public UI SHALL expose fixture IDs only; it SHALL not accept repository path or source uploads.
- 5.2 The server SHALL expose no route that runs shell commands, evaluates source, or sends outbound requests.
- 5.3 The server SHALL apply patches only through the patcher to `.gravescan-work/`.

### 6. Runtime constraint
- 6.1 Because this sandbox cannot install from npm, this spec SHALL provide a dependency-free Node 22 server and browser JavaScript demo.
- 6.2 The deviation from the planned Next.js runtime SHALL be documented. The scanner, simulator, patcher, and server remain TypeScript.

### 7. Verification
- 7.1 An HTTP integration test SHALL exercise fixture listing, scan, replay, patch generation, apply, verification, reset, and static asset responses.
- 7.2 The UI delivery gate SHALL be recorded in `docs/ui-delivery-gate.md` before delivery.
