#!/bin/sh
set -e

# Always use unique container hostname (avoid DNS collision on gsms network)
DB_HOST="${DB_HOST:-invoicepilot-postgres}"

if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_PASSWORD" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_HOST}:5432/${POSTGRES_DB}?schema=public"
fi

echo "[invoicepilot] prisma db push (${DB_HOST})"
npx prisma db push --skip-generate

if [ "$#" -gt 0 ]; then
  echo "[invoicepilot] exec: $*"
  exec "$@"
fi

echo "[invoicepilot] starting server on :${PORT:-3010}"
exec node .output/server/index.mjs
