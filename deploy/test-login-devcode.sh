#!/bin/bash
set -euo pipefail
# Hit login server function and see if challenge.devCode is returned
# TanStack Start RPC — find the endpoint pattern from the app

echo '=== find login RPC URL pattern ==='
docker exec invoicepilot-app sh -c 'grep -R "loginUser\|_createServerFn\|_/_server" /app/.output/public/assets/auth-Duewf1CB.js 2>/dev/null | head -5'
docker exec invoicepilot-app node -e '
const fs=require("fs");
const s=fs.readFileSync("/app/.output/public/assets/auth-Duewf1CB.js","utf8");
const m=s.match(/loginUser[^,]{0,200}/);
console.log(m&&m[0]);
const m2=s.match(/\/_serverFn\/[^\"]+/);
console.log("serverFn", m2&&m2[0]);
const ids=[...s.matchAll(/id:"([^"]+)"/g)].slice(0,10).map(x=>x[1]);
console.log("ids", ids);
'

# Try common TanStack Start endpoints
echo '=== try login via curl (form) ==='
# Use the app's server fn - look at auth module for URL
docker logs invoicepilot-app --since 2m 2>&1 | tail -20
