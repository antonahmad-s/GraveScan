import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";

// Local stand-in for Cloudflare static assets: serves files from dist/ with the headers in
// dist/_headers. GET and HEAD only, no directory listings, nothing outside dist/.

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// Supports the subset of the _headers format the build writes: a "/*" block of "Name: value" lines.
export function parseHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  let active = false;
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    if (!/^\s/.test(line)) {
      active = line.trim() === "/*";
      continue;
    }
    const separator = line.indexOf(":");
    if (active && separator > 0) headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return headers;
}

export function createStaticServer(dist: string): Server {
  const root = path.resolve(dist);
  const headersFile = path.join(root, "_headers");
  const shared = existsSync(headersFile) ? parseHeaders(readFileSync(headersFile, "utf8")) : {};

  return createServer((request, response) => {
    const send = (status: number, type: string, body: string | Buffer) => {
      response.writeHead(status, { ...shared, "Content-Type": type, "Cache-Control": "no-store" });
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
      return send(404, "text/plain; charset=utf-8", "Not found");
    }
    send(200, type, readFileSync(file));
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
