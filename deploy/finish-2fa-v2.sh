#!/bin/bash
set -euo pipefail
NAME=2fa-otp-show.js

# Ensure files are in the container
docker cp /tmp/$NAME invoicepilot-app:/app/.output/public/assets/$NAME
docker cp /tmp/auth-patched.mjs invoicepilot-app:/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs
docker cp /tmp/2fa-ssr-patched.mjs invoicepilot-app:/app/.output/server/_ssr/2fa-D8ruIDZh.mjs
docker cp /tmp/index-patched.js invoicepilot-app:/app/.output/public/assets/index-Blcfv8tf.js
docker cp /tmp/manifest-patched.mjs invoicepilot-app:/app/.output/server/_tanstack-start-manifest_v-yqTP-uWo.mjs
docker cp /tmp/server-index-patched.mjs invoicepilot-app:/app/.output/server/index.mjs

docker exec invoicepilot-app ls -la /app/.output/public/assets/2fa*.js
docker exec invoicepilot-app grep -c '2fa-otp-show' /app/.output/public/assets/index-Blcfv8tf.js
docker exec invoicepilot-app grep -c 'devCode: challenge.code' /app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs

docker restart invoicepilot-app
sleep 6

curl -s -m 15 "https://app.global-it-ss.com/assets/$NAME" -o /tmp/served-v2.js
echo "served=$(wc -c < /tmp/served-v2.js)"
tail -c 100 /tmp/served-v2.js; echo
grep -c 'Code de vérification' /tmp/served-v2.js || true
grep -c 'export{X as component}' /tmp/served-v2.js || true
node --check /tmp/served-v2.js && echo SYNTAX_OK

docker exec invoicepilot-app node --input-type=module -e '
import * as m from "/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs";
const r = await m.authenticateUser({email:"owner@dupont.fr", password:"Test1234!"});
console.log("devCode", r.challenge?.devCode);
'
