/**
 * Capture landing flow screenshots (main app column, sidebar collapsed).
 * Usage: node scripts/capture-landing-flow.mjs
 * Requires: dev server on :8081, playwright chromium
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/media/landing/flow");
const BASE = "http://localhost:8081";
const EMAIL = "owner@dupont.fr";
const PASSWORD = "Test1234!";

const PAGES = [
  { path: "/integrations", file: "01-sources.png" },
  { path: "/agent", file: "02-analyse-ia.png" },
  { path: "/invoices", file: "03-emission-pa.png" },
  { path: "/e-reporting", file: "04-e-reporting.png" },
  { path: "/inbox", file: "05-reception-pa.png" },
  { path: "/platforms", file: "06-platforms-pa.png" },
  { path: "/notifications", file: "07-notifications.png" },
];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  if (!page.url().includes("/login")) return;
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
}

async function captureMain(page, file) {
  await page.evaluate(() => {
    localStorage.setItem("invoicepilot.sidebar.collapsed", "1");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  await page.addStyleTag({
    content: `
      [data-assistant-fab], .fixed.bottom-6.right-6 { display: none !important; }
    `,
  });

  const main = page.locator(".app-ui > div.flex.min-w-0.flex-1.flex-col").first();
  await main.waitFor({ state: "visible", timeout: 15_000 });
  await main.screenshot({ path: join(OUT, file), animations: "disabled" });
  console.log("✓", file);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await login(page);
    for (const { path, file } of PAGES) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await captureMain(page, file);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
