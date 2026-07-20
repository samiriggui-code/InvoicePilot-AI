#!/bin/bash
cd /opt/invoicepilot
set -a
source .env
set +a
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\d users'
echo '==='
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT email FROM users LIMIT 20;'
echo '==='
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\d organizations'
echo '==='
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT id, siren FROM organizations LIMIT 10;'
