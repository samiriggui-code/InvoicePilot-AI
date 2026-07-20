#!/bin/bash
set -euo pipefail

# Restore auth + login/signup clients from image, then skip 2FA

CID=$(docker create invoicepilot-app:latest)
docker cp "$CID:/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs" /tmp/auth.mjs
docker cp "$CID:/app/.output/public/assets/login-D8rjWVXN.js" /tmp/login.js
docker cp "$CID:/app/.output/public/assets/signup-DsO1lpTd.js" /tmp/signup.js
docker cp "$CID:/app/.output/server/_ssr/login-C9VT9kF2.mjs" /tmp/login-ssr.mjs
docker cp "$CID:/app/.output/server/_ssr/signup-4BrA4tbF.mjs" /tmp/signup-ssr.mjs
docker cp "$CID:/app/.output/public/assets/index-Blcfv8tf.js" /tmp/index.js
docker cp "$CID:/app/.output/server/_tanstack-start-manifest_v-yqTP-uWo.mjs" /tmp/manifest.mjs
docker cp "$CID:/app/.output/server/index.mjs" /tmp/server-index.mjs
docker rm "$CID" >/dev/null

python3 <<'PY'
from pathlib import Path

# --- auth: skip 2FA, create session ---
auth = Path('/tmp/auth.mjs').read_text()

old_login = '''async function authenticateUser(input) {
	const email = input.email.trim().toLowerCase();
	if (!email || !input.password) return { error: "Email et mot de passe requis." };
	const user = await db.user.findUnique({ where: { email } });
	if (!user?.passwordHash) return { error: "Identifiants incorrects." };
	if (!await verifyPassword(input.password, user.passwordHash)) return { error: "Identifiants incorrects." };
	const challenge = await createTwoFactorChallenge(user.id);
	return {
		user: toPublicUser(user),
		challenge: {
			challengeId: challenge.challengeId,
			email: user.email,
			name: toPublicUser(user).name,
			devCode: null
		}
	};
}'''

new_login = '''async function authenticateUser(input) {
	const email = input.email.trim().toLowerCase();
	if (!email || !input.password) return { error: "Email et mot de passe requis." };
	const user = await db.user.findUnique({ where: { email } });
	if (!user?.passwordHash) return { error: "Identifiants incorrects." };
	if (!await verifyPassword(input.password, user.passwordHash)) return { error: "Identifiants incorrects." };
	return { user: await createAuthSession(user.id, input.rememberMe ?? false) };
}'''

if old_login not in auth:
    raise SystemExit('authenticateUser pattern not found')
auth = auth.replace(old_login, new_login, 1)

# registerUser ends with createTwoFactorChallenge + return challenge
# Find the last occurrence pattern after user creation
marker = 'const challenge = await createTwoFactorChallenge(user.id);\n\treturn {\n\t\tuser: toPublicUser(user),\n\t\tchallenge: {\n\t\t\tchallengeId: challenge.challengeId,\n\t\t\temail: user.email,\n\t\t\tname: toPublicUser(user).name,\n\t\t\tdevCode: null\n\t\t}\n\t};\n}\nasync function authenticateUser'
# After our replace, authenticateUser is already new — register still has challenge block
reg_old = '''const challenge = await createTwoFactorChallenge(user.id);
	return {
		user: toPublicUser(user),
		challenge: {
			challengeId: challenge.challengeId,
			email: user.email,
			name: toPublicUser(user).name,
			devCode: null
		}
	};
}
async function authenticateUser'''
reg_new = '''return { user: await createAuthSession(user.id, false) };
}
async function authenticateUser'''
if reg_old not in auth:
    raise SystemExit('registerUser challenge block not found')
auth = auth.replace(reg_old, reg_new, 1)
Path('/tmp/auth-skip2fa.mjs').write_text(auth)
print('auth patched')

# --- login client: go dashboard when no challenge ---
login = Path('/tmp/login.js').read_text()
old = 'o({challengeId:r.challenge.challengeId,email:r.challenge.email,name:r.challenge.name,redirect:t,devCode:r.challenge.devCode,rememberMe:T}),await e({to:`/2fa`})'
new = 'if(r.challenge){o({challengeId:r.challenge.challengeId,email:r.challenge.email,name:r.challenge.name,redirect:t,devCode:r.challenge.devCode,rememberMe:T}),await e({to:`/2fa`})}else await e({href:t})'
if old not in login:
    raise SystemExit('login client pattern not found: ' + login[login.find('o({challengeId'):login.find('o({challengeId')+200])
login2 = login.replace(old, new, 1)
# also pass rememberMe to loginUser
login2 = login2.replace(
    'await s({data:{email:n,password:C}})',
    'await s({data:{email:n,password:C,rememberMe:T}})',
    1,
)
name = 'login-skip2fa.js'
Path('/tmp/' + name).write_text(login2)
Path('/tmp/login-new-name.txt').write_text(name)
print('login client patched', len(login2))

# --- signup client ---
signup = Path('/tmp/signup.js').read_text()
# find similar pattern
idx = signup.find('setPending2FA') 
# minified may use different names — search challenge
needle = None
for cand in [
    'await e({to:`/2fa`})',
    'await n({to:`/2fa`})',
    '{to:`/2fa`}',
]:
    if cand in signup:
        needle = cand
        break
print('signup 2fa nav needle', needle)
# Broader replace: after successful signup, if challenge then 2fa else dashboard
# Look for: challengeId:*.challenge
import re
m = re.search(r'([\w$]+)\(\{challengeId:([\w$]+)\.challenge\.challengeId.*?await ([\w$]+)\(\{to:`/2fa`\}\)', signup)
if not m:
    # try without setPending wrapper complexity
    m2 = re.search(r'challengeId:([\w$]+)\.challenge\.challengeId', signup)
    print('partial', m2.group(0) if m2 else None)
    # dump context
    i = signup.find('.challenge.challengeId')
    print(repr(signup[i-80:i+180]))
    raise SystemExit('signup pattern not found')
full = m.group(0)
setfn, resvar, navfn = m.group(1), m.group(2), m.group(3)
replacement = f'if({resvar}.challenge){{{full}}}else await {navfn}({{to:`/dashboard`}})'
# careful: full already includes await nav — wrap properly
replacement = (
    f'if({resvar}.challenge){{{setfn}({{challengeId:{resvar}.challenge.challengeId'
    + full.split('challengeId:')[1].rsplit('await',1)[0]
    + f'await {navfn}({{to:`/2fa`}})}}else await {navfn}({{to:`/dashboard`}})'
)
# Simpler approach: replace only the navigate to 2fa after storing pending — if no challenge, crash was the issue
# Replace: `,await X({to:`/2fa`})` that follows challenge set with conditional
signup2 = re.sub(
    r'([\w$]+)\(\{challengeId:([\w$]+)\.challenge\.challengeId,email:\2\.challenge\.email,name:\2\.challenge\.name,redirect:`/dashboard`,devCode:\2\.challenge\.devCode\}\),await ([\w$]+)\(\{to:`/2fa`\}\)',
    r'if(\2.challenge){\1({challengeId:\2.challenge.challengeId,email:\2.challenge.email,name:\2.challenge.name,redirect:`/dashboard`,devCode:\2.challenge.devCode}),await \3({to:`/2fa`})}else await \3({to:`/dashboard`})',
    signup,
    count=1,
)
if signup2 == signup:
    i = signup.find('.challenge.challengeId')
    print('FAIL context', repr(signup[i-100:i+220]))
    raise SystemExit('signup replace failed')
sname = 'signup-skip2fa.js'
Path('/tmp/' + sname).write_text(signup2)
Path('/tmp/signup-new-name.txt').write_text(sname)
print('signup patched')

# rewrite index refs
idx = Path('/tmp/index.js').read_text()
idx = idx.replace('login-D8rjWVXN.js', name).replace('signup-DsO1lpTd.js', sname)
Path('/tmp/index-skip2fa.js').write_text(idx)
man = Path('/tmp/manifest.mjs').read_text().replace('login-D8rjWVXN.js', name).replace('signup-DsO1lpTd.js', sname)
Path('/tmp/manifest-skip2fa.mjs').write_text(man)
si = Path('/tmp/server-index.mjs').read_text().replace('login-D8rjWVXN.js', name).replace('signup-DsO1lpTd.js', sname)
Path('/tmp/server-index-skip2fa.mjs').write_text(si)
print('refs updated')
PY

LOGIN=$(cat /tmp/login-new-name.txt)
SIGNUP=$(cat /tmp/signup-new-name.txt)

docker cp /tmp/auth-skip2fa.mjs invoicepilot-app:/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs
docker cp /tmp/$LOGIN invoicepilot-app:/app/.output/public/assets/$LOGIN
docker cp /tmp/$SIGNUP invoicepilot-app:/app/.output/public/assets/$SIGNUP
docker cp /tmp/index-skip2fa.js invoicepilot-app:/app/.output/public/assets/index-Blcfv8tf.js
docker cp /tmp/manifest-skip2fa.mjs invoicepilot-app:/app/.output/server/_tanstack-start-manifest_v-yqTP-uWo.mjs
docker cp /tmp/server-index-skip2fa.mjs invoicepilot-app:/app/.output/server/index.mjs

# Also restore clean original 2fa assets / index was already rewritten
docker restart invoicepilot-app
sleep 5

echo '=== test auth ==='
docker exec invoicepilot-app node --input-type=module -e '
import * as m from "/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs";
const r = await m.authenticateUser({email:"owner@dupont.fr", password:"Test1234!", rememberMe:true});
console.log(JSON.stringify({hasUser:!!r.user, hasChallenge:!!r.challenge, email:r.user?.email, error:r.error}));
'
echo "login asset: $LOGIN"
curl -sI -m 10 "https://app.global-it-ss.com/assets/$LOGIN" | head -5
