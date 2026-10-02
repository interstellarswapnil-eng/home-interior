/**
 * `npm run exterior:concepts3d` — Step 2 of the v2 brief: every concept built in full 3D, full colour.
 * Street corner at dusk (the default view) and in day sun, the side road, and the entrance at dusk.
 * Writes docs/exterior/v2/step2/ (images + concepts-3d.html + concepts-3d-board.jpg).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import puppeteer, { type Page } from "puppeteer-core";
import { executablePath, glArgs } from "./browser";

const OUT = "docs/exterior/v2/step2";
mkdirSync(OUT, { recursive: true });
const server = await createServer({ server: { port: 5195, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await puppeteer.launch({ executablePath, headless: true, args: glArgs, protocolTimeout: 600_000, defaultViewport: { width: 1200, height: 800 } });
const BASE = "http://localhost:5195/exterior.html";
const errors: string[] = [];

const VIEWS = [
  { key: "dusk", query: "cam=photo&sky=dusk", label: "Street corner · dusk" },
  { key: "day", query: "cam=photo&sky=clear&hour=10.5", label: "Street corner · morning sun" },
  { key: "west", query: "cam=left&sky=clear&hour=16", label: "Side road (west) · afternoon" },
  { key: "entrance", query: "cam=street&sky=dusk", label: "At the gate · dusk" },
];

async function shot(page: Page, query: string, file: string) {
  await page.goto(`${BASE}?${query}&panel=0&ui=0&thumbs=0&instant=1&quality=high&date=2026-10-01`, { waitUntil: "load" });
  await page.waitForFunction("window.__extReady === true", { timeout: 180_000 });
  await new Promise((r) => setTimeout(r, 800));
  const el = await page.$("main canvas");
  await el!.screenshot({ path: file, type: "jpeg", quality: 88 });
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE}?thumbs=0&panel=0`, { waitUntil: "load" });
  await page.waitForFunction("window.__extReady === true", { timeout: 180_000 });
  const ids = (await page.evaluate("window.__extV2.concepts()")) as string[];
  const reports: Record<string, { name: string; description: string; hero?: { name: string }; flags: unknown[] }> = {};
  for (const id of ids) reports[id] = (await page.evaluate(`window.__extV2.report(${JSON.stringify(id)})`)) as (typeof reports)[string];

  for (const id of ids)
    for (const v of VIEWS) {
      console.log(`rendering ${id} ${v.key}`);
      await shot(page, `pattern=${id}&${v.query}`, `${OUT}/${id}-${v.key}.jpg`);
    }

  const card = (id: string) => {
    const r = reports[id];
    return `<section class="card"><h2>${esc(r.name)} <span class="hero">Hero: ${esc(r.hero?.name ?? "")}</span> <span class="muted">${r.flags.length} approval flags</span></h2>
  <p class="muted">${esc(r.description)}</p>
  <div class="imgs">${VIEWS.map((v) => `<figure><img src="${id}-${v.key}.jpg"><figcaption>${v.label}</figcaption></figure>`).join("")}</div></section>`;
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Exterior v2 · Step 2 concepts in 3D</title><style>
body{font:13px/1.4 "Segoe UI",system-ui,sans-serif;margin:0;background:#f4f2ee;color:#2b2b2b}
main{max-width:1600px;margin:0 auto;padding:18px} h1{margin:0 0 4px;font-size:22px} .muted{color:#7a746b}
.card{background:#fff;border-radius:10px;padding:12px 14px;margin:14px 0;box-shadow:0 1px 3px #0002}
.card h2{margin:0 0 4px;font-size:17px} .hero{background:#2b2b2b;color:#fff;border-radius:10px;padding:1px 8px;font-size:12px;margin:0 6px}
.imgs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px} figure{margin:0} img{width:100%;border-radius:6px;display:block} figcaption{color:#7a746b;font-size:12px}
</style></head><body><main>
<h1>Exterior v2 · Step 2: seven concepts built in full 3D</h1>
<p class="muted">Your real building (stilt + 3 flats, corner plot), each concept in its own colours. Dusk is the default view: facade lights are real fixtures, listed in each design's lighting schedule.</p>
${ids.map(card).join("\n")}
</main></body></html>`;
  writeFileSync(`${OUT}/concepts-3d.html`, html);
  const view = await browser.newPage();
  await view.setViewport({ width: 1600, height: 1000 });
  await view.goto(pathToFileURL(path.resolve(`${OUT}/concepts-3d.html`)).href, { waitUntil: "load" });
  await view.screenshot({ path: `${OUT}/concepts-3d-board.jpg`, fullPage: true, type: "jpeg", quality: 85 });
  console.log(`wrote ${OUT}/concepts-3d.html and concepts-3d-board.jpg`);
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.log(`page errors:\n${errors.join("\n")}`);
  process.exitCode = 1;
}
