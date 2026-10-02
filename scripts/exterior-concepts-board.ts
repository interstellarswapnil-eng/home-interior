/**
 * `npm run exterior:board` — Step 1 of the v2 brief: quick front-elevation thumbnails of every concept
 * (simple massing, grey + one accent, dusk), with the hero move named, approval flags listed and the quality gate,
 * including the automatic grey test. Writes docs/exterior/v2/step1/ (images + concepts.html + concepts-board.png).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { createServer } from "vite";
import puppeteer, { type Page } from "puppeteer-core";
import { executablePath, glArgs } from "./browser";

const OUT = "docs/exterior/v2/step1";
mkdirSync(OUT, { recursive: true });
const server = await createServer({ server: { port: 5195, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await puppeteer.launch({ executablePath, headless: true, args: glArgs, protocolTimeout: 600_000, defaultViewport: { width: 1200, height: 760 } });
const BASE = "http://localhost:5195/exterior.html";
const errors: string[] = [];

type Report = {
  name: string;
  description: string;
  hero?: { name: string };
  supporting?: { name: string }[];
  crown?: { name: string };
  threshold?: { name: string };
  refs?: number[];
  flags: { title: string; detail: string; rule: string }[];
  gate: { n: number; label: string; pass: boolean | null; note: string }[];
};

async function shot(page: Page, query: string, file: string) {
  await page.goto(`${BASE}?${query}&panel=0&ui=0&ctx=0&thumbs=0&instant=1&date=2026-10-01`, { waitUntil: "load" });
  await page.waitForFunction("window.__extReady === true", { timeout: 180_000 });
  await new Promise((r) => setTimeout(r, 500));
  const el = await page.$("main canvas");
  await el!.screenshot({ path: file });
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`${BASE}?thumbs=0&panel=0`, { waitUntil: "load" });
  await page.waitForFunction("window.__extReady === true", { timeout: 180_000 });
  const ids = (await page.evaluate("window.__extV2.concepts()")) as string[];
  const reports: Record<string, Report> = {};
  for (const id of ids) reports[id] = (await page.evaluate(`window.__extV2.report(${JSON.stringify(id)})`)) as Report;

  for (const id of [...ids, "architect"]) {
    console.log(`rendering ${id}`);
    if (id !== "architect") {
      await shot(page, `pattern=${id}&look=massing&sky=dusk&cam=elevS&quality=high`, `${OUT}/${id}-south.png`);
      await shot(page, `pattern=${id}&look=massing&sky=dusk&cam=elevW&quality=high`, `${OUT}/${id}-west.png`);
    }
    // grey test: street-corner view in afternoon sun, so depth shows as shadow (a flat elevation hides it)
    await shot(page, `pattern=${id}&look=grey&sky=clear&hour=15.5&cam=photo&quality=high`, `${OUT}/${id}-grey.png`);
  }

  // Grey test: mean absolute difference between grey elevations (downsampled), each concept vs. every other
  const grey = async (id: string) => {
    // compare the building only: crop the middle of the elevation (sky and road would hide the differences)
    const img = sharp(`${OUT}/${id}-grey.png`);
    const m = await img.metadata();
    const crop = { left: Math.round(m.width! * 0.18), top: Math.round(m.height! * 0.04), width: Math.round(m.width! * 0.62), height: Math.round(m.height! * 0.8) };
    const { data } = await sharp(`${OUT}/${id}-grey.png`).extract(crop).resize(120, 140, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
    return data;
  };
  const g: Record<string, Buffer> = {};
  for (const id of [...ids, "architect"]) g[id] = await grey(id);
  const diff = (a: Buffer, b: Buffer) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
    return s / a.length;
  };
  const THRESH = 4; // mean grey-level difference (0–255) below which two concepts read as "the same form"
  const greyResult: Record<string, { distinct: boolean; note: string }> = {};
  for (const id of ids) {
    const others = [...ids.filter((x) => x !== id), "architect"].map((o) => ({ o, d: diff(g[id], g[o]) }));
    const nearest = others.sort((a, b) => a.d - b.d)[0];
    const label = nearest.o === "architect" ? "Architect's design" : reports[nearest.o].name;
    greyResult[id] = { distinct: nearest.d >= THRESH, note: `closest in grey: ${label} (difference ${nearest.d.toFixed(1)}, needs ≥ ${THRESH})` };
    const item = reports[id].gate.find((x) => x.n === 10)!;
    item.pass = greyResult[id].distinct;
    item.note = greyResult[id].note;
  }

  // Board (HTML) — then a PNG of it
  const card = (id: string) => {
    const r = reports[id];
    const passed = r.gate.filter((x) => x.pass === true).length;
    const open = r.gate.filter((x) => x.pass === null).length;
    return `<section class="card">
  <h2>${esc(r.name)} <span class="hero">Hero: ${esc(r.hero?.name ?? "")}</span></h2>
  <p class="desc">${esc(r.description)} <span class="muted">Study refs ${(r.refs ?? []).join(", ")} (= files #${(r.refs ?? []).map((n) => n - 1).join(", #")}).</span></p>
  <div class="imgs">
    <figure><img src="${id}-south.png"><figcaption>Road side (south) elevation · dusk · grey + accent</figcaption></figure>
    <figure><img src="${id}-west.png"><figcaption>Side road (west) elevation</figcaption></figure>
    <figure class="grey"><img src="${id}-grey.png"><figcaption>Grey test (street corner, sun)</figcaption></figure>
  </div>
  <div class="cols">
    <div><h3>Moves</h3><ul>
      <li><b>Hero:</b> ${esc(r.hero?.name ?? "—")}</li>
      ${(r.supporting ?? []).map((s) => `<li>Supporting: ${esc(s.name)}</li>`).join("")}
      <li>Crown: ${esc(r.crown?.name ?? "—")}</li>
      <li>Threshold: ${esc(r.threshold?.name ?? "—")}</li></ul></div>
    <div><h3>Approval flags (${r.flags.length})</h3><ul class="flags">${r.flags.map((f) => `<li><b>${esc(f.title)}</b><br><span class="muted">${esc(f.detail)} [${esc(f.rule)}]</span></li>`).join("") || "<li>None</li>"}</ul></div>
    <div><h3>Quality gate: ${passed}/10${open ? ` (+${open} to judge by eye)` : ""}</h3><ol class="gate">${r.gate
      .map((x) => `<li class="${x.pass === true ? "ok" : x.pass === false ? "bad" : "eye"}">${x.pass === true ? "✓" : x.pass === false ? "✗" : "?"} ${esc(x.label)} <span class="muted">${esc(x.note)}</span></li>`)
      .join("")}</ol></div>
  </div>
</section>`;
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Exterior v2 · Step 1 concepts</title><style>
body{font:13px/1.4 "Segoe UI",system-ui,sans-serif;margin:0;background:#f4f2ee;color:#2b2b2b}
main{max-width:1500px;margin:0 auto;padding:18px}
h1{margin:0 0 4px;font-size:22px} .muted{color:#7a746b}
.card{background:#fff;border:1px solid #e4dfd6;border-radius:10px;padding:12px 14px;margin:14px 0}
.card h2{margin:0 0 4px;font-size:17px} .hero{font-size:13px;font-weight:600;color:#fff;background:#2b2b2b;border-radius:10px;padding:2px 9px;margin-left:8px}
.desc{margin:2px 0 8px}
.imgs{display:grid;grid-template-columns:1fr 1fr 0.55fr;gap:8px} figure{margin:0} img{width:100%;border-radius:6px;display:block} figcaption{font-size:11px;color:#7a746b}
.cols{display:grid;grid-template-columns:0.8fr 1.3fr 1.2fr;gap:14px;margin-top:6px} h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#7a746b;margin:6px 0}
ul,ol{margin:0;padding-left:18px} li{margin:2px 0} .flags li{margin-bottom:5px}
.gate li{list-style:none;margin-left:-18px} .ok{color:#2f6b3f} .bad{color:#b0352a} .eye{color:#8a5a12}
</style></head><body><main>
<h1>Exterior v2 · Step 1: seven concepts as quick elevations</h1>
<p class="muted">Simple massing on your real building (stilt + 3 flats, corner plot): everything grey except each concept's accent, at dusk with facade lights on. Approval flags use the assumed plot margins (front ≈ 2.5 m, sides ≈ 1.3 m): check with the architect. Grey test: each concept rendered all-grey must differ from every other concept and from the Architect's design.</p>
${ids.map(card).join("\n")}
</main></body></html>`;
  writeFileSync(`${OUT}/concepts.html`, html);
  writeFileSync(`${OUT}/report.json`, JSON.stringify({ reports, grey: greyResult }, null, 2));

  const view = await browser.newPage();
  await view.setViewport({ width: 1500, height: 1000 });
  await view.goto(pathToFileURL(path.resolve(`${OUT}/concepts.html`)).href, { waitUntil: "load" });
  await view.screenshot({ path: `${OUT}/concepts-board.png`, fullPage: true });
  console.log(`wrote ${OUT}/concepts.html and concepts-board.png`);
  for (const id of ids) console.log(`${reports[id].name}: gate ${reports[id].gate.filter((x) => x.pass === true).length}/10 · flags ${reports[id].flags.length} · ${greyResult[id].note}`);
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
