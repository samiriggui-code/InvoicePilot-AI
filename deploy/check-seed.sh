#!/bin/bash
# Check how we can seed on VPS
docker exec invoicepilot-app ls -la /app/prisma/ 2>&1 | head -20
echo '---'
docker exec invoicepilot-app ls /app/node_modules/.bin/tsx 2>&1
docker exec invoicepilot-app ls /app/src 2>&1 | head -5
docker exec invoicepilot-app node -e "console.log(require.resolve('bcryptjs'))" 2>&1
docker exec invoicepilot-app node -e "console.log(Object.keys(require('bcryptjs')))" 2>&1
docker exec invoicepilot-app sh -c 'ls node_modules | head -5; ls node_modules/bcrypt* 2>&1; ls node_modules/@node-rs 2>&1; ls node_modules/argon2 2>&1'
