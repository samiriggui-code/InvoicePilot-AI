# InvoicePilot AI — production (Node / Nitro)
FROM node:22-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

COPY . .
ARG VITE_DOCS_URL=https://docs.global-it-ss.com
ENV VITE_DOCS_URL=$VITE_DOCS_URL
ENV NITRO_PRESET=node-server
ENV NODE_ENV=production
RUN npx prisma generate && npm run build

# Keep runtime deps for Prisma + Nitro output
RUN npm prune --omit=dev


FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3010
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/.output ./.output
COPY deploy/entrypoint.sh /entrypoint.sh
COPY deploy/worker.mjs /app/deploy/worker.mjs
RUN chmod +x /entrypoint.sh \
  && npm install prisma@6.19.3 --omit=dev --no-fund --no-audit

EXPOSE 3010
ENTRYPOINT ["/entrypoint.sh"]
