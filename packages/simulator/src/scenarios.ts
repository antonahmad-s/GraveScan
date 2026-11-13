import type { AttackScenario } from "./schemas.ts";

export const SCENARIOS: readonly AttackScenario[] = [
  {
    id: "MCP-TOOL-ESCALATION",
    name: "MCP tool escalation",
    targetRuleId: "GRAVE-001",
    preconditions: ["An enabled MCP server auto-approves a shell-capable tool."],
    capabilityRequest: "shell-capable MCP tool",
    expectedResult: "exposed",
    steps: [
      { id: "request", label: "Capability request", exposedDetail: "Agent requests a shell-capable MCP tool.", blockedDetail: "Agent requests a shell-capable MCP tool." },
      { id: "inspect", label: "Policy inspection", exposedDetail: "Static evidence shows the tool is auto-approved.", blockedDetail: "No auto-approved shell-capable tool is present." },
      { id: "decision", label: "Policy decision", exposedDetail: "The request would be allowed without explicit approval.", blockedDetail: "The request is blocked because no unsafe approval exists." },
      { id: "result", label: "Simulation result", exposedDetail: "Capability exposure reproduced safely.", blockedDetail: "Unsafe capability is blocked." },
    ],
  },
  {
    id: "HOOK-INPUT-EXECUTION",
    name: "Hook input execution",
    targetRuleId: "GRAVE-003",
    preconditions: ["A hook command is outside the fixed command allowlist."],
    capabilityRequest: "execute interpolated hook command",
    expectedResult: "exposed",
    steps: [
      { id: "event", label: "Event input", exposedDetail: "A file-save event supplies a value to the hook path.", blockedDetail: "A file-save event is received." },
      { id: "inspect", label: "Command inspection", exposedDetail: "Static evidence shows a command outside the allowlist.", blockedDetail: "The hook command is within the fixed allowlist." },
      { id: "decision", label: "Policy decision", exposedDetail: "The command would reach a shell interpreter.", blockedDetail: "The command is blocked before an interpreter is reached." },
      { id: "result", label: "Simulation result", exposedDetail: "Unbounded hook execution reproduced safely.", blockedDetail: "Unbounded hook execution is blocked." },
    ],
  },
  {
    id: "STEERING-SECRET-EXPOSURE",
    name: "Steering secret exposure",
    targetRuleId: "GRAVE-005",
    preconditions: ["Steering asks an agent to expose secrets, credentials, or environment values."],
    capabilityRequest: "expose a secret or environment value",
    expectedResult: "exposed",
    steps: [
      { id: "instruction", label: "Instruction read", exposedDetail: "The simulator reads a steering request for sensitive data.", blockedDetail: "No steering request asks for sensitive data." },
      { id: "inspect", label: "Boundary inspection", exposedDetail: "The instruction lacks a protective boundary.", blockedDetail: "The protective boundary prevents the request." },
      { id: "decision", label: "Policy decision", exposedDetail: "The agent could disclose the requested value.", blockedDetail: "The disclosure request is blocked." },
      { id: "result", label: "Simulation result", exposedDetail: "Secret exposure path reproduced safely.", blockedDetail: "Secret exposure path is blocked." },
    ],
  },
  {
    id: "STEERING-FILESYSTEM-ESCAPE",
    name: "Steering filesystem escape",
    targetRuleId: "GRAVE-006",
    preconditions: ["Steering grants filesystem access outside the workspace."],
    capabilityRequest: "read or write outside the workspace",
    expectedResult: "exposed",
    steps: [
      { id: "instruction", label: "Instruction read", exposedDetail: "The simulator reads a broad filesystem grant.", blockedDetail: "No broad filesystem grant is present." },
      { id: "inspect", label: "Boundary inspection", exposedDetail: "The grant includes paths outside the workspace.", blockedDetail: "Workspace-only boundaries are in effect." },
      { id: "decision", label: "Policy decision", exposedDetail: "The agent could access outside-workspace paths.", blockedDetail: "Outside-workspace access is blocked." },
      { id: "result", label: "Simulation result", exposedDetail: "Filesystem escape reproduced safely.", blockedDetail: "Filesystem escape is blocked." },
    ],
  },
] as const;

export function getScenario(id: string): AttackScenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
