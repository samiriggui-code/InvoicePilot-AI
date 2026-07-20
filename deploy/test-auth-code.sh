#!/bin/bash
set -euo pipefail
# Call authenticateUser from inside the app container
docker exec invoicepilot-app node --input-type=module <<'EOF'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Dynamic import of patched auth module
const mod = await import('/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs');
const result = await mod.authenticateUser({ email: 'owner@dupont.fr', password: 'Test1234!' });
console.log(JSON.stringify(result, null, 2));
EOF
