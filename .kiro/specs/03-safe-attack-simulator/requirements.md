# Requirements: Safe Attack Simulator

## Introduction
Build a deterministic replay engine that demonstrates an unsafe capability state without executing agent code, shell commands, or network traffic.

## Requirements

### 1. Scenario catalog
- 1.1 THE simulator SHALL expose exactly four named scenarios: `MCP-TOOL-ESCALATION`, `HOOK-INPUT-EXECUTION`, `STEERING-SECRET-EXPOSURE`, and `STEERING-FILESYSTEM-ESCAPE`.
- 1.2 EVERY scenario SHALL have a stable ID, name, target rule ID, preconditions, bounded steps, and an expected result.
- 1.3 EVERY scenario SHALL have at most five steps.

### 2. Replay
- 2.1 GIVEN scan findings containing a scenario's target rule ID, THE replay SHALL return `exposed`.
- 2.2 GIVEN no finding for a scenario's target rule ID, THE replay SHALL return `blocked`.
- 2.3 THE replay SHALL return a capability request, policy decision, step results, evidence references, and a result label.
- 2.4 THE replay SHALL be deterministic for the same scan result and scenario ID.

### 3. Safety
- 3.1 THE simulator SHALL not execute shell commands, fixture content, agents, or arbitrary user input.
- 3.2 THE simulator SHALL not make outbound network requests.
- 3.3 THE result SHALL include the notice: `Safe simulation. No arbitrary code or network request was executed.`

### 4. Errors and tests
- 4.1 THE simulator SHALL return a typed `UNKNOWN_SCENARIO` error for an unknown ID.
- 4.2 EACH scenario SHALL have exposed and blocked tests.
- 4.3 A property test SHALL verify deterministic replay and the step limit.
