#!/bin/bash
set -e
cd /opt/invoicepilot
# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source .env
set +a

echo "=== URLS ==="
echo "APP:   https://app.global-it-ss.com"
echo "API:   https://api.global-it-ss.com"
echo "WWW:   https://global-it-ss.com"
echo "FILES: https://files.global-it-ss.com"
echo "STRIPE WEBHOOK: https://app.global-it-ss.com/api/stripe/webhook"
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
docker ps --filter name=^invoicepilot-ollama$ --format 'container={{.Names}} status={{.Status}}'
docker exec invoicepilot-ollama ollama list 2>&1 || true
echo "OLLAMA_BASE_URL (app): http://invoicepilot-ollama:11434"
echo "OLLAMA_MODEL (app): qwen2.5:3b"
echo "public: NON (réseau Docker interne seulement)"
echo
echo "=== WORKER / BACKUP ==="
docker ps --filter name=invoicepilot-worker --format 'worker={{.Names}} {{.Status}}' || true
docker ps --filter name=invoicepilot-db-backup --format 'backup={{.Names}} {{.Status}}' || true
echo
echo "=== DB users ==="
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  'SELECT email, name, created_at FROM users ORDER BY created_at NULLS LAST LIMIT 15;' 2>&1 || \
docker exec invoicepilot-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  'SELECT email FROM users LIMIT 15;' 2>&1 || \
echo "(table users introuvable ou DB vide — utilise le compte démo seed local)"
