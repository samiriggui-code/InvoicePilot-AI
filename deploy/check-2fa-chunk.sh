#!/bin/bash
set -euo pipefail
echo '=== manifest 2fa refs ==='
docker exec invoicepilot-app sh -c 'grep -n "2fa" /app/.output/server/_tanstack-start-manifest_v-yqTP-uWo.mjs | head -40'
echo '=== index 2fa refs ==='
docker exec invoicepilot-app sh -c 'grep -o "2fa[^\"]*" /app/.output/public/assets/index-Blcfv8tf.js | sort -u | head -20'
echo '=== curl otp asset first 80 chars ==='
curl -s -m 10 'https://app.global-it-ss.com/assets/2fa-DeJXIJE4-otp.js' | head -c 120; echo
echo '=== check JS syntax of otp ==='
docker exec invoicepilot-app node --check /app/.output/public/assets/2fa-DeJXIJE4-otp.js && echo syntax_ok
