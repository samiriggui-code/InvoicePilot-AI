#!/bin/bash
set -euo pipefail
cd /opt/invoicepilot

echo '=== restore 2fa + index assets from image ==='
# Extract original built assets from the image (before our broken sed)
CID=$(docker create invoicepilot-app:latest)
docker cp "$CID:/app/.output/public/assets/2fa-DeJXIJE4.js" /tmp/2fa-orig.js
docker cp "$CID:/app/.output/public/assets/index-Blcfv8tf.js" /tmp/index-orig.js
docker cp "$CID:/app/.output/server/_tanstack-start-manifest_v-yqTP-uWo.mjs" /tmp/manifest-orig.mjs
docker cp "$CID:/app/.output/server/index.mjs" /tmp/server-index-orig.mjs
docker cp "$CID:/app/.output/server/_ssr/2fa-D8ruIDZh.mjs" /tmp/2fa-ssr-orig.mjs
docker cp "$CID:/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs" /tmp/auth-orig.mjs
docker rm "$CID"
wc -c /tmp/2fa-orig.js /tmp/index-orig.js

echo '=== patch auth server (expose OTP) ==='
python3 <<'PY'
from pathlib import Path
p = Path('/tmp/auth-orig.mjs')
s = p.read_text()
s = s.replace(
"""	if (!existing || existing.usedAt) return null;
	return {
		challengeId: (await createTwoFactorChallenge(existing.userId)).challengeId,
		email: existing.user.email,
		name: toPublicUser(existing.user).name,
		devCode: null
	};
}""",
"""	if (!existing || existing.usedAt) return null;
	const next = await createTwoFactorChallenge(existing.userId);
	return {
		challengeId: next.challengeId,
		email: existing.user.email,
		name: toPublicUser(existing.user).name,
		devCode: next.code
	};
}""",
)
s = s.replace(
"""			name: toPublicUser(user).name,
			devCode: null
		}
	};
}""",
"""			name: toPublicUser(user).name,
			devCode: challenge.code
		}
	};
}""",
)
assert s.count('devCode: null') == 0, s.count('devCode: null')
assert s.count('devCode: challenge.code') == 2
Path('/tmp/auth-patched.mjs').write_text(s)
print('auth ok')
PY

echo '=== patch client 2fa UI ==='
python3 <<'PY'
from pathlib import Path
s = Path('/tmp/2fa-orig.js').read_text()
old = ",!1,_&&(0,H.jsxs)(y,{variant:`destructive`"
new = (
    ",O&&(0,H.jsx)(y,{children:(0,H.jsx)(v,{className:`text-sm`,children:["
    "`Code de vérification : `,"
    "(0,H.jsx)(`span`,{className:`font-mono font-semibold tracking-widest`,children:O})"
    "]})}),_&&(0,H.jsxs)(y,{variant:`destructive`"
)
assert old in s, 'client pattern missing'
s2 = s.replace(old, new, 1)
assert 'export{X as component}' in s2
assert len(s2) > len(s)
# new filename to bust immutable cache
name = '2fa-otp-show.js'
Path('/tmp/' + name).write_text(s2)
print('client bytes', len(s2.encode()))
Path('/tmp/2fa-new-name.txt').write_text(name)
PY

NAME=$(cat /tmp/2fa-new-name.txt)

echo '=== patch SSR 2fa ==='
python3 <<'PY'
from pathlib import Path
s = Path('/tmp/2fa-ssr-orig.mjs').read_text()
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
assert old in s
Path('/tmp/2fa-ssr-patched.mjs').write_text(s.replace(old, new, 1))
print('ssr ok')
PY

echo '=== rewrite refs to new chunk name ==='
python3 <<PY
from pathlib import Path
name = Path('/tmp/2fa-new-name.txt').read_text().strip()
for src, dst in [
  ('/tmp/index-orig.js', '/tmp/index-patched.js'),
  ('/tmp/manifest-orig.mjs', '/tmp/manifest-patched.mjs'),
  ('/tmp/server-index-orig.mjs', '/tmp/server-index-patched.mjs'),
]:
  s = Path(src).read_text()
  s2 = s.replace('2fa-DeJXIJE4.js', name)
  assert '2fa-DeJXIJE4.js' not in s2
  assert name in s2
  Path(dst).write_text(s2)
  print(dst, 'ok')
PY

echo '=== install into running container ==='
docker cp /tmp/auth-patched.mjs invoicepilot-app:/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs
docker cp /tmp/2fa-ssr-patched.mjs invoicepilot-app:/app/.output/server/_ssr/2fa-D8ruIDZh.mjs
docker cp /tmp/$NAME invoicepilot-app:/app/.output/public/assets/$NAME
docker cp /tmp/index-patched.js invoicepilot-app:/app/.output/public/assets/index-Blcfv8tf.js
docker cp /tmp/manifest-patched.mjs invoicepilot-app:/app/.output/server/_tanstack-start-manifest_v-yqTP-uWo.mjs
docker cp /tmp/server-index-patched.mjs invoicepilot-app:/app/.output/server/index.mjs

# Also restore original 2fa filename file for safety
docker cp /tmp/2fa-orig.js invoicepilot-app:/app/.output/public/assets/2fa-DeJXIJE4.js

docker restart invoicepilot-app
sleep 6

echo '=== verify ==='
C=$(docker exec invoicepilot-app wc -c < /app/.output/public/assets/$NAME)
curl -s -m 15 "https://app.global-it-ss.com/assets/$NAME" -o /tmp/served-v2.js
S=$(wc -c < /tmp/served-v2.js)
echo "container=$C served=$S name=$NAME"
tail -c 80 /tmp/served-v2.js; echo
grep -c 'Code de vérification' /tmp/served-v2.js
grep -c 'export{X as component}' /tmp/served-v2.js
node --check /tmp/served-v2.js && echo SYNTAX_OK
docker exec invoicepilot-app node --input-type=module -e '
import * as m from "/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs";
const r = await m.authenticateUser({email:"owner@dupont.fr", password:"Test1234!"});
console.log("devCode", r.challenge?.devCode);
'
