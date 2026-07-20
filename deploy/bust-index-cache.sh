#!/bin/bash
set -euo pipefail

# Cache-bust the main index bundle (immutable cache otherwise keeps old login)
OLD=index-Blcfv8tf.js
NEW=index-skip2fa.js

docker exec invoicepilot-app cp /app/.output/public/assets/$OLD /app/.output/public/assets/$NEW

# Find all refs to old index and rewrite
docker exec invoicepilot-app sh -c '
  grep -RIl "index-Blcfv8tf\.js" /app/.output 2>/dev/null | while read -r f; do
    sed -i "s/index-Blcfv8tf\.js/index-skip2fa.js/g" "$f"
    echo "updated $f"
  done
'

# Also check HTML in public
docker exec invoicepilot-app sh -c 'grep -RIl "index-Blcfv8tf" /app/.output/public /app/.output/server 2>/dev/null | head -20'

docker restart invoicepilot-app
sleep 5

echo '=== verify login skip2fa served ==='
curl -s -m 10 https://app.global-it-ss.com/assets/login-skip2fa.js | grep -c 'else await e({href:t})' || true
curl -sI -m 10 https://app.global-it-ss.com/assets/index-skip2fa.js | head -6

# Confirm homepage references new index
curl -s -m 10 https://app.global-it-ss.com/login | grep -oE 'index-[A-Za-z0-9_-]+\.js' | sort -u | head -10
