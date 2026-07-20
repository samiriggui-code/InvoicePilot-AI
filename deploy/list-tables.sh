#!/bin/bash
cd /opt/invoicepilot
set -a
source .env
set +a
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\dt'
echo '---'
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;"
