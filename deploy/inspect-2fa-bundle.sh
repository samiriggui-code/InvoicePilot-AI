#!/bin/bash
set -euo pipefail
FILE=/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs
docker exec invoicepilot-app sh -c "grep -n 'production\|devCode\|2fa' $FILE | head -40"
echo '==== snippet ===='
docker exec invoicepilot-app node -e '
const fs=require("fs");
const p="/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs";
const s=fs.readFileSync(p,"utf8");
const i=s.indexOf("Identifiants incorrects");
console.log(s.slice(Math.max(0,i-400), i+800));
'
