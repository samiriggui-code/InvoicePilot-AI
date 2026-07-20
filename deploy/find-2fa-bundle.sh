#!/bin/bash
set -euo pipefail
# Find how 2FA code exposure is compiled in the Nitro output
docker exec invoicepilot-app sh -c 'grep -R "Identifiants incorrects" -l .output 2>/dev/null | head -20'
echo '---'
docker exec invoicepilot-app sh -c 'grep -R "devCode" -l .output 2>/dev/null | head -20'
echo '---'
docker exec invoicepilot-app sh -c 'grep -R "Code connexion" -l .output 2>/dev/null | head -20'
