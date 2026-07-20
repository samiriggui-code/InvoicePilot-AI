#!/bin/bash
curl -s -m 10 https://app.global-it-ss.com/login > /tmp/login.html
grep -oE 'assets/[^" ]+\.js' /tmp/login.html | sort -u | head -20
echo '---'
# Also check if login-skip2fa is in index-skip2fa
docker exec invoicepilot-app grep -o 'login-[A-Za-z0-9_-]*\.js' /app/.output/public/assets/index-skip2fa.js | sort -u
echo 'auth has createAuthSession on login:'
docker exec invoicepilot-app grep -c 'createAuthSession(user.id, input.rememberMe' /app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs
