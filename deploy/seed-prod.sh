#!/bin/bash
set -euo pipefail
cd /opt/invoicepilot

echo "[seed] copy seed sources into app container…"
docker exec invoicepilot-app mkdir -p /app/src/lib
docker cp /opt/invoicepilot/prisma/seed.ts invoicepilot-app:/app/prisma/seed.ts
# password helper may not be on host image tree — inject if present
if [ -f /opt/invoicepilot/src/lib/password.ts ]; then
  docker cp /opt/invoicepilot/src/lib/password.ts invoicepilot-app:/app/src/lib/password.ts
fi

echo "[seed] ensure tsx…"
docker exec invoicepilot-app sh -c 'npx --yes tsx --version'

echo "[seed] run prisma db seed…"
docker exec -e NODE_ENV=production invoicepilot-app sh -c 'npx --yes tsx prisma/seed.ts'

echo "[seed] verify users…"
set -a
# shellcheck disable=SC1091
source .env
set +a
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT email, name FROM users ORDER BY email;'
