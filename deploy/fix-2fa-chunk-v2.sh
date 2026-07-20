#!/bin/bash
set -euo pipefail

# Build a clean patched client chunk from the ORIGINAL (pre-broken) backup if needed,
# or from current container file after verifying export footer.

OLD_IN_CONTAINER=/app/.output/public/assets/2fa-DeJXIJE4.js
NEW_NAME=2fa-otp-v2.js
NEW_PATH=/app/.output/public/assets/$NEW_NAME

docker cp invoicepilot-app:$OLD_IN_CONTAINER /tmp/2fa-src.js
wc -c /tmp/2fa-src.js
tail -c 120 /tmp/2fa-src.js; echo

python3 <<'PY'
from pathlib import Path
p = Path("/tmp/2fa-src.js")
s = p.read_text()
# Ensure we have the OTP alert (may already be patched)
if "Code de vérification" not in s:
    old = ",!1,_&&(0,H.jsxs)(y,{variant:`destructive`"
    new = (
        ",O&&(0,H.jsx)(y,{children:(0,H.jsx)(v,{className:`text-sm`,children:["
        "`Code de vérification : `,"
        "(0,H.jsx)(`span`,{className:`font-mono font-semibold tracking-widest`,children:O})"
        "]})}),_&&(0,H.jsxs)(y,{variant:`destructive`"
    )
    if old not in s:
        raise SystemExit("cannot patch: pattern missing and no existing alert")
    s = s.replace(old, new, 1)
if "export{X as component}" not in s and "export{X as component};" not in s:
    # check end
    print("FOOTER:", repr(s[-80:]))
    raise SystemExit("missing export footer — file corrupt")
p.write_text(s)
print("bytes", p.stat().st_size)
print("has alert", "Code de vérification" in s)
print("footer ok")
PY

# Push as brand-new asset name
docker cp /tmp/2fa-src.js invoicepilot-app:$NEW_PATH

# Point all refs (any previous 2fa asset names) to the new file
docker exec invoicepilot-app sh -c "
  for f in \
    /app/.output/server/_tanstack-start-manifest_v-yqTP-uWo.mjs \
    /app/.output/server/index.mjs \
    /app/.output/public/assets/index-Blcfv8tf.js
  do
    sed -i \
      -e 's/2fa-DeJXIJE4-otp\\.js/$NEW_NAME/g' \
      -e 's/2fa-DeJXIJE4\\.js/$NEW_NAME/g' \
      \"\$f\"
    echo updated \$f
  done
" NEW_NAME="$NEW_NAME"

# Fix sed with env properly
docker exec -e NEW_NAME="$NEW_NAME" invoicepilot-app sh -c '
  for f in \
    /app/.output/server/_tanstack-start-manifest_v-yqTP-uWo.mjs \
    /app/.output/server/index.mjs \
    /app/.output/public/assets/index-Blcfv8tf.js
  do
    sed -i \
      -e "s/2fa-DeJXIJE4-otp\\.js/${NEW_NAME}/g" \
      -e "s/2fa-DeJXIJE4\\.js/${NEW_NAME}/g" \
      "$f"
    echo "updated $f -> $(grep -o "2fa[^\"]*" "$f" | head -3)"
  done
'

docker restart invoicepilot-app
sleep 6

echo '=== verify sizes ==='
CSIZE=$(docker exec invoicepilot-app wc -c < /app/.output/public/assets/$NEW_NAME)
curl -s -m 15 "https://app.global-it-ss.com/assets/$NEW_NAME" -o /tmp/served.js
SSIZE=$(wc -c < /tmp/served.js)
echo "container=$CSIZE served=$SSIZE"
tail -c 100 /tmp/served.js; echo
grep -c 'Code de vérification' /tmp/served.js
grep -c 'export{X as component}' /tmp/served.js
node --check /tmp/served.js && echo served_syntax_ok
