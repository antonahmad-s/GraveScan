# Requirements: Scanner and Rule Engine

## Introduction
Create GraveScan's deterministic static scanner. It reads controlled fixture files or explicitly supplied in-memory files. It does not execute fixture content, call network services, or use an LLM.

## Requirements

### 1. Scan contract
- 1.1 THE scanner SHALL accept files as `{ path, content }` objects and return `{ findings, diagnostics }`.
- 1.2 THE scanner SHALL sort findings deterministically by file, line, and rule ID.
- 1.3 GIVEN identical files, THE scanner SHALL return identical findings and diagnostics.
- 1.4 THE scanner SHALL not perform filesystem writes, shell execution, network requests, or time-based operations.

### 2. Finding quality
- 2.1 EVERY finding SHALL have stable `id`, `ruleId`, `severity`, `title`, `description`, `file`, `line`, `evidence`, `remediation`, and `confidence`.
- 2.2 EVERY finding SHALL cite an input file and a line greater than zero.
- 2.3 EVERY finding SHALL have a known rule ID and non-empty remediation.
- 2.4 THE scanner SHALL never use an LLM to decide severity or confidence.

### 3. Input formats and diagnostics
- 3.1 THE scanner SHALL inspect JSON, Markdown, YAML-like text, and text prompts.
- 3.2 IF JSON is malformed, THEN the scanner SHALL return a diagnostic with file, line, and message, without throwing.
- 3.3 IF another supported text format is malformed or unsupported, THEN the scanner SHALL continue scanning and return a diagnostic when a reliable parser-level error exists.

### 4. Static rules
- 4.1 THE scanner SHALL implement stable rules `GRAVE-001` through `GRAVE-010` with the severity defined in the product PRD.
- 4.2 GRAVE-001 SHALL detect enabled MCP tools with shell-capable auto-approval.
- 4.3 GRAVE-002 SHALL detect enabled MCP servers without a tool allowlist.
- 4.4 GRAVE-003 SHALL detect hooks that run commands outside the command allowlist.
- 4.5 GRAVE-004 SHALL detect hooks that interpolate save/input values without validation.
- 4.6 GRAVE-005 SHALL detect steering instructions requesting secrets, credentials, or environment export.
- 4.7 GRAVE-006 SHALL detect steering instructions granting filesystem access outside the workspace.
- 4.8 GRAVE-007 SHALL detect agent network capability without a stated business reason.
- 4.9 GRAVE-008 SHALL ensure scanner-generated findings have remediation; it SHALL emit only for an internal contract breach.
- 4.10 GRAVE-009 SHALL detect secret-like values in configuration, including GraveScan fake canaries.
- 4.11 GRAVE-010 SHALL detect Kiro configuration without a stated sandbox policy.

### 5. Fixture scan and CLI
- 5.1 THE scanner SHALL scan a fixture selected by its known fixture ID.
- 5.2 THE CLI command `gravescan scan --fixture <id> --format json` SHALL print deterministic JSON and exit 0.
- 5.3 THE CLI SHALL reject unknown options, unsupported format, unknown fixture ID, and attempts to scan arbitrary repository paths.

### 6. Tests
- 6.1 EVERY rule SHALL have a positive and a negative test.
- 6.2 Property tests SHALL cover scanner determinism, malformed JSON never crashing, and finding evidence validity.

## Out of scope
- Patching, replay simulation, persistence, UI, uploading repositories, and arbitrary path scanning.
