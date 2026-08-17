#!/usr/bin/env bash
# Premier déploiement InvoicePilot sur VPS Hostinger (Traefik + réseau gsms)
# Usage (sur le VPS) :
#   cd /opt/invoicepilot && bash deploy/first-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== InvoicePilot — premier déploiement ==="
echo "cwd: $ROOT"

if [ ! -f .env ]; then
  if [ -f deploy/.env ]; then
    echo "→ copie deploy/.env → .env"
    cp deploy/.env .env
  elif [ -f deploy/.env.example ]; then
    echo "ERREUR: crée .env depuis deploy/.env.example (secrets manquants)"
    exit 1
  else
    echo "ERREUR: fichier .env introuvable"
    exit 1
  fi
fi

# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source .env
set +a

if ! docker network inspect gsms >/dev/null 2>&1; then
  echo "ERREUR: réseau Docker externe 'gsms' absent (Traefik Hostinger)."
  echo "Crée-le ou démarre la stack Traefik existante."
  exit 1
fi

echo "→ docker compose build + up"
docker compose pull postgres redis minio ollama 2>/dev/null || true
docker compose build app
docker compose up -d

echo "→ attente santé Postgres…"
for i in $(seq 1 40); do
  if docker exec invoicepilot-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "→ seed (si disponible)"
if [ -f deploy/seed-prod.sh ]; then
  bash deploy/seed-prod.sh || echo "(seed optionnel échoué — continue)"
fi

echo
echo "=== Statut ==="
docker compose ps
echo
bash deploy/show-access.sh 2>/dev/null || true
echo
echo "Webhook Stripe à configurer :"
echo "  https://app.global-it-ss.com/api/stripe/webhook"
echo
echo "Test SMTP (contact / reset password) + Mail Hostinger."
echo "MinIO console : https://files.global-it-ss.com"
echo "Backup DB : docker logs -f invoicepilot-db-backup"
echo "Worker     : docker logs -f invoicepilot-worker"
echo "Ollama     : docker exec invoicepilot-ollama ollama list"
echo "DONE"
