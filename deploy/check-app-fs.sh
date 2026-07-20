#!/bin/bash
set -euo pipefail
echo '=== container status ==='
docker ps -a --filter name=invoicepilot-app --format '{{.Names}} {{.Status}}'
echo '=== ls .output ==='
docker exec invoicepilot-app ls -la /app/.output/ 2>&1 | head -20
echo '=== ls public ==='
docker exec invoicepilot-app ls -la /app/.output/public/ 2>&1 | head -20
echo '=== ls assets ==='
docker exec invoicepilot-app ls -la /app/.output/public/assets/ 2>&1 | head -40
echo '=== logs ==='
docker logs invoicepilot-app --tail 30 2>&1
