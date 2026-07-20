#!/bin/bash
set -euo pipefail
NAME=2fa-otp-show.js

echo '=== refs ==='
docker exec invoicepilot-app grep -o '2fa[^"]*\.js' /app/.output/public/assets/index-Blcfv8tf.js | sort -u
docker exec invoicepilot-app grep -n '2fa-otp-show\|2fa-DeJXIJE4' /app/.output/server/_tanstack-start-manifest_v-yqTP-uWo.mjs | head -10
docker exec invoicepilot-app grep -c 'devCode: challenge.code' /app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs
docker exec invoicepilot-app grep -c 'Code de vérification' /app/.output/server/_ssr/2fa-D8ruIDZh.mjs

echo '=== serve ==='
curl -s -m 15 "https://app.global-it-ss.com/assets/$NAME" -o /tmp/served-v2.js
echo "served=$(wc -c < /tmp/served-v2.js)"
tail -c 100 /tmp/served-v2.js; echo
grep -c 'Code de vérification' /tmp/served-v2.js
grep -c 'export{X as component}' /tmp/served-v2.js
node --check /tmp/served-v2.js && echo SYNTAX_OK

echo '=== auth ==='
docker exec invoicepilot-app node --input-type=module -e '
import * as m from "/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs";
const r = await m.authenticateUser({email:"owner@dupont.fr", password:"Test1234!"});
console.log("devCode", r.challenge?.devCode);
'
