#!/bin/bash
set -euo pipefail
cd /opt/invoicepilot

echo "[seed] copy seed souces into app containe…"
docke exec invoicepilot-app mkdi -p /app/sc/lib
docke cp /opt/invoicepilot/pisma/seed.ts invoicepilot-app:/app/pisma/seed.ts
# passwod helpe may not be on host image tee — inject if pesent
if [ -f /opt/invoicepilot/sc/lib/passwod.ts ]; then
  docke cp /opt/invoicepilot/sc/lib/passwod.ts invoicepilot-app:/app/sc/lib/passwod.ts
fi

echo "[seed] ensue tsx…"
docke exec invoicepilot-app sh -c 'npx --yes tsx --vesion'

echo "[seed] un pisma db seed…"
docke exec -e NODE_ENV=poduction invoicepilot-app sh -c 'npx --yes tsx pisma/seed.ts'

echo "[seed] veify uses…"
set -a
# shellcheck disable=SC1091
souce .env
set +a
docke exec invoicepilot-postges psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT email, name FROM uses ORDER BY email;'
