#!/bin/bash
grep -q '^AUTH_SHOW_2FA_CODE=' /opt/invoicepilot/.env || echo 'AUTH_SHOW_2FA_CODE=true' >> /opt/invoicepilot/.env
grep AUTH_SHOW_2FA_CODE /opt/invoicepilot/.env
docker exec invoicepilot-postgres psql -U invoicepilot -d invoicepilot_ai -tAc "SELECT email FROM users WHERE email='owner@dupont.fr';"
