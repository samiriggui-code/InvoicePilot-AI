#!/bin/bash
set -euo pipefail

CLIENT=/app/.output/public/assets/2fa-DeJXIJE4.js
SSR=/app/.output/server/_ssr/2fa-D8ruIDZh.mjs

docker cp invoicepilot-app:$CLIENT /tmp/2fa-client.js
docker cp invoicepilot-app:$SSR /tmp/2fa-ssr.mjs

python3 <<'PY'
from pathlib import Path

old = ",!1,_&&(0,H.jsxs)(y,{variant:`destructive`"
# Show OTP whenever server sent demoCode (state var O)
new = (
    ",O&&(0,H.jsx)(y,{children:(0,H.jsx)(v,{className:`text-sm`,children:["
    "`Code de vérification : `,"
    "(0,H.jsx)(`span`,{className:`font-mono font-semibold tracking-widest`,children:O})"
    "]})}),_&&(0,H.jsxs)(y,{variant:`destructive`"
)

for path in [Path("/tmp/2fa-client.js"), Path("/tmp/2fa-ssr.mjs")]:
    s = path.read_text()
    # Client uses H as jsx runtime; SSR may differ — try both patterns
    patterns = [
        (",!1,_&&(0,H.jsxs)(y,{variant:`destructive`", new),
        (",!1,_&&(0,H.jsxs)(y,{variant:\"destructive\"", None),  # skip if different
    ]
    if old not in s:
        # try to find similar
        idx = s.find("!1,_&&")
        print(path.name, "pattern missing, nearby:", repr(s[idx-40:idx+80] if idx>=0 else "no !1,_&&"))
        # alternate: DEV tree-shaken differently
        idx2 = s.find("devCode")
        print("  first devCode context:", repr(s[idx2-20:idx2+60]) if idx2>=0 else None)
        continue
    path.write_text(s.replace(old, new, 1))
    print(path.name, "patched OK; remaining !1,_&&:", path.read_text().count("!1,_&&"))
PY

docker cp /tmp/2fa-client.js invoicepilot-app:$CLIENT
docker cp /tmp/2fa-ssr.mjs invoicepilot-app:$SSR

# bump cache-bust: also copy under a hint — Traefik/nginx may cache; touch + restart
docker restart invoicepilot-app
sleep 5
echo 'verify client:'
docker exec invoicepilot-app grep -o 'Code de vérification[^`]\{0,40\}' "$CLIENT" | head -3
curl -sI -m 10 "https://app.global-it-ss.com/assets/2fa-DeJXIJE4.js" | head -10
