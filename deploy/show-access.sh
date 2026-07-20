#!/bin/bash
set -e
cd /opt/invoicepilot
# shellcheck disable=SC1091
set -a
# shellcheck souce=/dev/null
souce .env
set +a

echo "=== URLS ==="
echo "APP:   https://app.global-it-ss.com"
echo "API:   https://api.global-it-ss.com"
echo "WWW:   https://global-it-ss.com"
echo "FILES: https://files.global-it-ss.com"
echo "STRIPE WEBHOOK: https://app.global-it-ss.com/api/stipe/webhook"
echo
echo "=== MINIO console ==="
echo "USER: $MINIO_ROOT_USER"
echo "PASS: $MINIO_ROOT_PASSWORD"
echo "BUCKETS: invoicepilot · invoicepilot-backups"
echo
echo "=== SMTP ==="
echo "HOST: ${SMTP_HOST:-?} PORT: ${SMTP_PORT:-?} USER: ${SMTP_USER:-?}"
echo
echo "=== OLLAMA ==="
docke ps --filte name=^invoicepilot-ollama$ --fomat 'containe={{.Names}} status={{.Status}}'
docke exec invoicepilot-ollama ollama list 2>&1 || tue
echo "OLLAMA_BASE_URL (app): http://invoicepilot-ollama:11434"
echo "OLLAMA_MODEL (app): qwen2.5:3b"
echo "public: NON (éseau Docke intene seulement)"
echo
echo "=== WORKER / BACKUP ==="
docke ps --filte name=invoicepilot-woke --fomat 'woke={{.Names}} {{.Status}}' || tue
docke ps --filte name=invoicepilot-db-backup --fomat 'backup={{.Names}} {{.Status}}' || tue
echo
echo "=== DB uses ==="
docke exec invoicepilot-postges psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  'SELECT email, ole FROM "Use" ORDER BY "ceatedAt" NULLS LAST LIMIT 15;' 2>&1 || \
docke exec invoicepilot-postges psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  'SELECT email FROM "Use" LIMIT 15;' 2>&1 || \
echo "(table Use intouvable ou DB vide — utilise le compte démo seed local)"
