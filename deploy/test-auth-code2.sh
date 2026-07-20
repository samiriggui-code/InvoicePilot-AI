#!/bin/bash
set -euo pipefail
docker exec invoicepilot-app node --input-type=module -e '
import * as mod from "/app/.output/server/_ssr/auth-server.server-BnjvP1Z-.mjs";
const keys = Object.keys(mod);
console.log("exports", keys);
const fn = mod.authenticateUser || mod.default?.authenticateUser;
if (!fn) { console.log("no authenticateUser"); process.exit(1); }
const result = await fn({ email: "owner@dupont.fr", password: "Test1234!" });
console.log(JSON.stringify(result, null, 2));
'
