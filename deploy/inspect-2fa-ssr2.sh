#!/bin/bash
set -euo pipefail
docker exec invoicepilot-app node -e '
const fs=require("fs");
const s=fs.readFileSync("/app/.output/server/_ssr/2fa-D8ruIDZh.mjs","utf8");
const needle="Mode démo";
const i=s.indexOf("Un code à 6 chiffres");
console.log(s.slice(i, i+900));
'
echo '==== refs to 2fa asset ==='
docker exec invoicepilot-app sh -c 'grep -R "2fa-DeJXIJE4" -l /app/.output 2>/dev/null | head -20'
