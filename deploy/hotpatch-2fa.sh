#!/bin/bash
set -euo pipefail
FILE=/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs
docker cp invoicepilot-app:$FILE /tmp/auth-server.bundle.mjs

python3 <<'PY'
from pathlib import Path
p = Path("/tmp/auth-server.bundle.mjs")
s = p.read_text()
old = s

# 1) resend — currently discards the OTP object
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

# 2+3) signup + login — expose challenge.code
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

p.write_text(s)
print("changed:", old != s)
print("devCode null remaining:", s.count("devCode: null"))
print("devCode challenge.code:", s.count("devCode: challenge.code"))
print("devCode next.code:", s.count("devCode: next.code"))
if s.count("devCode: null") != 0:
    raise SystemExit("patch incomplete")
PY

docker cp /tmp/auth-server.bundle.mjs invoicepilot-app:$FILE
docker restart invoicepilot-app
echo "waiting…"
sleep 5
curl -sI -m 15 https://app.global-it-ss.com/login | head -8
docker ps --filter name=invoicepilot-app --format '{{.Names}} {{.Status}}'
