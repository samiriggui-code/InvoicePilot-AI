#!/bin/bash
set -euo pipefail

echo "=== Avant nettoyage ==="
docker ps -a --filter name=invoicepilot --format 'table {{.Names}}\t{{.Status}}' || true
docker volume ls | grep -i invoicepilot || true
ls -la /opt/invoicepilot 2>/dev/null | head -20 || echo "(pas de /opt/invoicepilot)"

echo
echo "=== Stop + remove stack ==="
if [ -f /opt/invoicepilot/docker-compose.yml ]; then
  cd /opt/invoicepilot
  docker compose down --remove-orphans --volumes || true
fi

# Au cas où des containers resteraient hors compose
for c in $(docker ps -aq --filter name=invoicepilot 2>/dev/null); do
  echo "force remove $c"
  docker rm -f "$c" || true
done

echo
echo "=== Volumes InvoicePilot ==="
for v in $(docker volume ls -q | grep -E '^invoicepilot' || true); do
  echo "remove volume $v"
  docker volume rm "$v" || true
done
# volumes nommés par compose project
for v in $(docker volume ls -q | grep -i invoicepilot || true); do
  echo "remove volume $v"
  docker volume rm "$v" || true
done

echo
echo "=== Image app ==="
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep -i invoicepilot || true
docker rmi invoicepilot-app:latest 2>/dev/null || true
# dangling from builds
docker image prune -f --filter 'label=com.docker.compose.project=invoicepilot' 2>/dev/null || true

echo
echo "=== Dossier /opt/invoicepilot ==="
rm -rf /opt/invoicepilot
rm -f /tmp/debug-files.sh /tmp/show-access.sh /tmp/seed-prod.sh /tmp/*invoice* /tmp/*2fa* /tmp/skip-2fa.sh /tmp/restore* 2>/dev/null || true

echo
echo "=== Après nettoyage ==="
echo "containers restants:"
docker ps -a --filter name=invoicepilot --format '{{.Names}}' || echo "(aucun)"
echo "volumes restants:"
docker volume ls | grep -i invoicepilot || echo "(aucun)"
echo "dossier:"
ls /opt/invoicepilot 2>&1 || echo "/opt/invoicepilot supprimé"
echo
echo "=== Services NON touchés (vérif) ==="
docker ps --format '{{.Names}}' | grep -E 'traefik|gsms|pizzeria' || true
echo "DONE"
