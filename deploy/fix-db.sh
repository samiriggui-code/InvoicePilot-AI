#!/bin/bash
set -e
cd /opt/invoicepilot

echo "=== networks ==="
docker network inspect invoicepilot -f '{{range .Containers}}{{.Name}} {{end}}'
echo
docker network inspect gsms -f '{{range .Containers}}{{.Name}} {{end}}'
echo

echo "=== one-off connect test ==="
docker compose run --rm --no-deps --entrypoint sh app -c '
echo USER=$POSTGRES_USER
echo DB=$POSTGRES_DB
echo PWLEN=${#POSTGRES_PASSWORD}
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public"
echo URL_HOST=$(echo "$DATABASE_URL" | sed -E "s#.*@([^:/]+).*#\1#")
getent hosts postgres || true
npx prisma db push --skip-generate
'
