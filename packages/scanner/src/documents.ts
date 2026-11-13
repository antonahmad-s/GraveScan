import type { FixtureFile } from "@gravescan/fixtures";
import type { Diagnostic } from "./schemas.ts";

export type ScanDocument = {
  readonly file: string;
  readonly content: string;
  readonly lines: readonly string[];
  readonly json?: unknown;
};

function lineFromJsonError(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  const match = /position (\d+)/i.exec(message);
  const position = match?.[1] === undefined ? 0 : Number(match[1]);
  return Number.isSafeInteger(position) ? position : 0;
}

function lineAtOffset(content: string, offset: number): number {
  return content.slice(0, Math.max(0, offset)).split("\n").length;
}

function isJson(file: string): boolean {
  return file.toLowerCase().endsWith(".json");
}

export function parseDocuments(files: readonly FixtureFile[]): {
  documents: ScanDocument[];
  diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];
  const documents = files.map((file) => {
    const document: ScanDocument = {
      file: file.path,
      content: file.content,
      lines: file.content.split("\n"),
    };
    if (!isJson(file.path)) return document;
    try {
      return { ...document, json: JSON.parse(file.content) as unknown };
    } catch (error) {
      diagnostics.push({
        code: "MALFORMED_JSON",
        file: file.path,
        line: lineAtOffset(file.content, lineFromJsonError(error)),
        message: "Invalid JSON. Static JSON rules were skipped for this file.",
      });
      return document;
    }
  });

  return {
    documents: documents.sort((a, b) => compareText(a.file, b.file)),
    diagnostics: diagnostics.sort(compareDiagnostic),
  };
}

export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compareDiagnostic(a: Diagnostic, b: Diagnostic): number {
  return (
    compareText(a.file, b.file) ||
    a.line - b.line ||
    compareText(a.code, b.code)
  );
}

export function lineWith(document: ScanDocument, expression: RegExp): {
  line: number;
  evidence: string;
} {
  const match = document.lines.findIndex((line) => expression.test(line));
  const line = match === -1 ? 1 : match + 1;
  return { line, evidence: document.lines[match] ?? document.lines[0] ?? "(empty file)" };
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}
