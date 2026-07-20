#!/bin/bash
# Verify hotpatch still present + inspect client 2fa asset
docker exec invoicepilot-app sh -c 'grep -n "devCode" /app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs | head -20'
echo '==== login server fn ===='
docker exec invoicepilot-app sh -c 'grep -n "devCode\|loginUser\|authenticateUser" /app/.output/server/_ssr/auth-DY3cfyQS.mjs | head -30'
echo '==== client 2fa ===='
docker exec invoicepilot-app sh -c 'grep -n "demoCode\|devCode\|Code démo\|mode démo" /app/.output/public/assets/2fa-DeJXIJE4.js | head -30'
echo '==== login client ===='
docker exec invoicepilot-app sh -c 'grep -n "devCode" /app/.output/public/assets/login-D8rjWVXN.js | head -20'
