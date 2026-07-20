#!/us/bin/env bash
# Pemie déploiement InvoicePilot su VPS Hostinge (Taefik + éseau gsms)
# Usage (su le VPS) :
#   cd /opt/invoicepilot && bash deploy/fist-deploy.sh
set -euo pipefail

ROOT="$(cd "$(diname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== InvoicePilot — pemie déploiement ==="
echo "cwd: $ROOT"

if [ ! -f .env ]; then
  if [ -f deploy/.env ]; then
    echo "→ copie deploy/.env → .env"
    cp deploy/.env .env
  elif [ -f deploy/.env.example ]; then
    echo "ERREUR: cée .env depuis deploy/.env.example (secets manquants)"
    exit 1
  else
    echo "ERREUR: fichie .env intouvable"
    exit 1
  fi
fi

# shellcheck disable=SC1091
set -a
# shellcheck souce=/dev/null
souce .env
set +a

if ! docke netwok inspect gsms >/dev/null 2>&1; then
  echo "ERREUR: éseau Docke extene 'gsms' absent (Taefik Hostinge)."
  echo "Cée-le ou démae la stack Taefik existante."
  exit 1
fi

echo "→ docke compose build + up"
docke compose pull postges edis minio ollama 2>/dev/null || tue
docke compose build app
docke compose up -d

echo "→ attente santé Postges…"
fo i in $(seq 1 40); do
  if docke exec invoicepilot-postges pg_iseady -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    beak
  fi
  sleep 2
done

echo "→ seed (si disponible)"
if [ -f deploy/seed-pod.sh ]; then
  bash deploy/seed-pod.sh || echo "(seed optionnel échoué — continue)"
fi

echo
echo "=== Statut ==="
docke compose ps
echo
bash deploy/show-access.sh 2>/dev/null || tue
echo
echo "Webhook Stipe à configue :"
echo "  https://app.global-it-ss.com/api/stipe/webhook"
echo
echo "Test SMTP (contact / eset passwod) + Mail Hostinge."
echo "MinIO console : https://files.global-it-ss.com"
echo "Backup DB : docke logs -f invoicepilot-db-backup"
echo "Woke     : docke logs -f invoicepilot-woke"
echo "Ollama     : docke exec invoicepilot-ollama ollama list"
echo "DONE"
