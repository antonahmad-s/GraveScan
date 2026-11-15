import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";

// Local stand-in for Cloudflare static assets: GET and HEAD only, no directory listings, nothing
// outside dist/. It applies the wildcard and prefix rules written to dist/_headers.

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export type HeaderRule = { readonly pattern: string; readonly headers: Record<string, string> };

export function parseHeaderRules(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  let pattern: string | undefined;
  let headers: Record<string, string> = {};
  const finish = () => {
    if (pattern !== undefined) rules.push({ pattern, headers });
  };
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    if (!/^\s/.test(line)) {
      finish();
      pattern = line.trim();
      headers = {};
      continue;
    }
    const separator = line.indexOf(":");
    if (pattern !== undefined && separator > 0) headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  finish();
  return rules;
}

function matches(pattern: string, pathname: string): boolean {
  if (pattern === "/*") return true;
  if (pattern.endsWith("/*")) return pathname.startsWith(pattern.slice(0, -1));
  return pathname === pattern;
}

export function headersFor(rules: readonly HeaderRule[], pathname: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const rule of rules) if (matches(rule.pattern, pathname)) Object.assign(headers, rule.headers);
  return headers;
}

// Kept for callers that only need the catch-all headers from the original helper.
export function parseHeaders(text: string): Record<string, string> {
  return headersFor(parseHeaderRules(text), "/");
}

export function createStaticServer(dist: string): Server {
  const root = path.resolve(dist);
  const headersFile = path.join(root, "_headers");
  const rules = existsSync(headersFile) ? parseHeaderRules(readFileSync(headersFile, "utf8")) : [];

  return createServer((request, response) => {
    const send = (status: number, type: string, body: string | Buffer, pathname = "/") => {
      const headers = headersFor(rules, pathname);
      response.writeHead(status, { ...headers, "Content-Type": type, "Cache-Control": headers["Cache-Control"] ?? "no-store" });
      response.end(request.method === "HEAD" ? undefined : body);
    };
    if (request.method !== "GET" && request.method !== "HEAD") return send(405, "text/plain; charset=utf-8", "Method not allowed");

    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    } catch {
      return send(400, "text/plain; charset=utf-8", "Bad request");
    }
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const file = path.resolve(root, relative);
    const type = TYPES[path.extname(file)];
    const inside = file.startsWith(root + path.sep) && !relative.split("/").some((part) => part.startsWith("."));
    if (!inside || type === undefined || path.basename(file) === "_headers" || !existsSync(file) || !statSync(file).isFile()) {
      return send(404, "text/plain; charset=utf-8", "Not found", pathname);
    }
    send(200, type, readFileSync(file), pathname);
  });
}

if (process.argv[1] === import.meta.filename) {
  const port = Number(process.env.PORT ?? "3000");
  const host = process.env.HOST ?? "127.0.0.1";
  const safePort = Number.isInteger(port) && port > 0 && port < 65536 ? port : 3000;
  const safeHost = host === "0.0.0.0" || host === "::" ? host : "127.0.0.1";
  createStaticServer(path.resolve(import.meta.dirname, "../dist")).listen(safePort, safeHost, () => {
    console.log(`GraveScan is running at http://${safeHost === "127.0.0.1" ? safeHost : "localhost"}:${safePort}`);
  });
}
