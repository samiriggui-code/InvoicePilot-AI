#!/bin/bash
cd /opt/invoicepilot
set -a
source .env
set +a
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT email, name, role FROM users LIMIT 20;'
echo '--- orgs ---'
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT name, siren FROM organizations LIMIT 10;'
