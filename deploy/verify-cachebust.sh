#!/bin/bash
set -euo pipefail
echo '=== container sizes ==='
docker exec invoicepilot-app sh -c 'ls -la /app/.output/public/assets/2fa*.js; md5sum /app/.output/public/assets/2fa*.js'

echo '=== curl sizes/hashes ==='
for u in \
  https://app.global-it-ss.com/assets/2fa-DeJXIJE4.js \
  https://app.global-it-ss.com/assets/2fa-DeJXIJE4-otp.js
do
  echo "-- $u"
  curl -s -m 10 "$u" -o /tmp/out.js
  wc -c /tmp/out.js
  md5sum /tmp/out.js
  grep -c 'Code de vérification' /tmp/out.js || true
  grep -c '!1,_&&' /tmp/out.js || true
  grep -c 'O&&(0,H.jsx)(y' /tmp/out.js || true
done

echo '=== remaining old refs ==='
docker exec invoicepilot-app sh -c 'grep -R "2fa-DeJXIJE4\.js" -n /app/.output 2>/dev/null | head -20'
