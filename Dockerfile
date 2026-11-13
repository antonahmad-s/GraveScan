# Long-running Node process: the demo keeps per-visitor isolated copies on local disk
# and patch sessions in memory, so it needs a persistent server, not serverless functions.
FROM node:22-slim

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

COPY . .
RUN pnpm install --prod --frozen-lockfile \
  && rm -rf .pnpm-store \
  && mkdir -p .gravescan-work \
  && chown -R node:node .gravescan-work

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "apps/web/src/server.ts"]
