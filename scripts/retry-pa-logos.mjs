/** Retry failed PA logo downloads with alternate domains. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/media/pa-logos");

const fails = [
  { slug: "esi", domains: ["esi-groupe.com", "esi.fr", "esigroup.com"] },
  { slug: "iga-assurance", domains: ["iga-assurance.fr", "iga.fr"] },
  { slug: "ipaidthat", domains: ["ipaidthat.io", "ipaidthat.com"] },
  { slug: "symtrax", domains: ["symtrax.com", "symtrax.fr"] },
  {
    slug: "tungsten-automation-france",
    domains: ["tungstenautomation.com", "tungstenautomation.fr", "kofax.com"],
  },
  { slug: "taxera", domains: ["taxera.tech", "taxera.com", "taxera.fr"] },
];

async function tryDownload(slug, domain) {
  const urls = [
    `https://logo.clearbit.com/${domain}?size=128`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) continue;
      const b = Buffer.from(await r.arrayBuffer());
      if (b.length < 80) continue;
      const ct = (r.headers.get("content-type") || "").toLowerCase();
      let ext = "png";
      if (ct.includes("svg")) ext = "svg";
      else if (ct.includes("jpeg") || ct.includes("jpg")) ext = "jpg";
      else if (ct.includes("ico") || url.endsWith(".ico")) ext = "ico";
      fs.writeFileSync(path.join(OUT, `${slug}.${ext}`), b);
      return ext;
    } catch {
      /* next */
    }
  }
  return null;
}

function fallbackSvg(slug) {
  const initials =
    slug
      .replace(/[^a-z]/g, "")
      .slice(0, 2)
      .toUpperCase() || "PA";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#0f172a"/><text x="64" y="74" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="700" fill="#f8fafc">${initials}</text></svg>`;
}

for (const f of fails) {
  let ok = false;
  for (const d of f.domains) {
    const ext = await tryDownload(f.slug, d);
    if (ext) {
      console.log("OK", f.slug, d, ext);
      ok = true;
      break;
    }
  }
  if (!ok) {
    fs.writeFileSync(path.join(OUT, `${f.slug}.svg`), fallbackSvg(f.slug));
    console.log("FALLBACK", f.slug);
  }
}
