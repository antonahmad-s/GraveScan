function count(lines: readonly string[]): number {
  return lines.length === 1 && lines[0] === "" ? 0 : lines.length;
}

export function unifiedDiff(file: string, before: string, after: string): string {
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) prefix += 1;

  let suffix = 0;
  while (
    suffix < oldLines.length - prefix &&
    suffix < newLines.length - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) suffix += 1;

  const oldChanged = oldLines.slice(prefix, oldLines.length - suffix);
  const newChanged = newLines.slice(prefix, newLines.length - suffix);
  const oldStart = prefix + 1;
  const newStart = prefix + 1;
  return [
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -${oldStart},${count(oldChanged)} +${newStart},${count(newChanged)} @@`,
    ...oldChanged.map((line) => `-${line}`),
    ...newChanged.map((line) => `+${line}`),
  ].join("\n");
}
