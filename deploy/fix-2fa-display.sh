#!/bin/bash
set -euo pipefail

# 1) Patch SSR (still has false, error &&)
SSR=/app/.output/server/_ssr/2fa-D8ruIDZh.mjs
docker cp invoicepilot-app:$SSR /tmp/2fa-ssr.mjs
python3 <<'PY'
from pathlib import Path
p = Path("/tmp/2fa-ssr.mjs")
s = p.read_text()
old = """			false,
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Alert, {
				variant: "destructive","""
new = """			demoCode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Alert, {
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDescription, {
					className: "text-sm",
					children: [
						"Code de vérification : ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono font-semibold tracking-widest",
							children: demoCode
						})
					]
				})
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Alert, {
				variant: "destructive","""
if old not in s:
    raise SystemExit("SSR pattern not found")
p.write_text(s.replace(old, new, 1))
print("SSR patched")
PY
docker cp /tmp/2fa-ssr.mjs invoicepilot-app:$SSR

# 2) Cache-bust client asset: rename + rewrite refs
OLD=2fa-DeJXIJE4.js
NEW=2fa-DeJXIJE4-otp.js
docker exec invoicepilot-app sh -c "cp /app/.output/public/assets/$OLD /app/.output/public/assets/$NEW"

for f in \
  /app/.output/server/_tanstack-start-manifest_v-yqTP-uWo.mjs \
  /app/.output/server/index.mjs \
  /app/.output/public/assets/index-Blcfv8tf.js
do
  docker exec invoicepilot-app sh -c "sed -i 's/$OLD/$NEW/g' '$f'"
  echo "updated refs in $f"
done

# confirm client new file has the alert
docker exec invoicepilot-app grep -c "Code de vérification" /app/.output/public/assets/$NEW

docker restart invoicepilot-app
sleep 5

echo '=== public new asset ==='
curl -sI -m 10 "https://app.global-it-ss.com/assets/$NEW" | head -8
curl -s -m 10 "https://app.global-it-ss.com/assets/$NEW" | grep -o 'Code de vérification' | head -1

echo '=== auth server still exposes code ==='
docker exec invoicepilot-app grep -c 'devCode: challenge.code' /app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs
