#!/bin/bash
set -euo pipefail

echo '=== local file in container ==='
docker exec invoicepilot-app sh -c 'wc -c /app/.output/public/assets/2fa-DeJXIJE4.js; grep -c "Code de vérification" /app/.output/public/assets/2fa-DeJXIJE4.js; ls -la /app/.output/public/assets/2fa-DeJXIJE4.js'

echo '=== curl body snippet ==='
curl -s -m 10 "https://app.global-it-ss.com/assets/2fa-DeJXIJE4.js" | grep -o 'Code de vérification[^"]\{0,20\}\|!1,_&&\|Mode démo' | head -5
curl -s -m 10 "https://app.global-it-ss.com/assets/2fa-DeJXIJE4.js" | wc -c

echo '=== SSR 2fa gate ==='
docker exec invoicepilot-app node -e '
const fs=require("fs");
const s=fs.readFileSync("/app/.output/server/_ssr/2fa-D8ruIDZh.mjs","utf8");
const i=s.indexOf("demoCode");
console.log(s.slice(i, i+500));
const j=s.indexOf("import.meta");
console.log("import.meta idx", j);
const k=s.indexOf("DEV");
console.log("DEV contexts:", [...s.matchAll(/DEV/g)].length);
'
