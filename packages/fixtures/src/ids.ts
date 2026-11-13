export const FIXTURE_IDS = [
  "steering-injection",
  "unbounded-hook",
  "unsafe-mcp",
] as const;

export type FixtureId = (typeof FIXTURE_IDS)[number];

export function isFixtureId(value: string): value is FixtureId {
  return (FIXTURE_IDS as readonly string[]).includes(value);
}
