#!/bin/bash
cd /opt/invoicepilot
set -a
source .env
set +a
echo "SMTP/MAIL related:"
grep -E '^(SMTP|MAIL|RESEND|SENDGRID|AUTH_)' .env || echo "(none)"
echo "NODE_ENV in container:"
docker exec invoicepilot-app printenv NODE_ENV AUTH_SHOW_2FA_CODE 2>/dev/null || true
