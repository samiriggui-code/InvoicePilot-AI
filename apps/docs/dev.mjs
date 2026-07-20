import { spawn } from "node:child_process";

process.env.PUPPETEER_SKIP_DOWNLOAD = "1";
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = "1";

const child = spawn("npx", ["mintlify@latest", "dev", "--port", "3004", "--no-open"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
  cwd: process.cwd(),
});

child.on("exit", (code) => process.exit(code ?? 0));
