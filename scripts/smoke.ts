/**
 * `npm run smoke` — loads the app in headless Chrome/Edge, clicks every 3D camera (twice, in
 * both wall modes), toggles 2D layers and side panels, hovers budget lines, and fails on any
 * page error or console error.
 */
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import puppeteer from "puppeteer-core";
import { executablePath, glArgs } from "./browser";

const server = await createServer({ server: { port: 5198, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: glArgs,
  defaultViewport: { width: 1500, height: 950 },
});
const errors: string[] = [];
let steps = 0;
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("http://localhost:5198/?view=split&panel=budget", { waitUntil: "load", timeout: 90_000 });
  await page.waitForFunction("window.__sceneReady === true", { timeout: 120_000 });

  const clickText = async (text: string) => {
    const ok = await page.evaluate((t) => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.trim() === t);
      b?.click();
      return !!b;
    }, text);
    if (!ok) throw new Error(`button not found: ${text}`);
    steps++;
    await new Promise((r) => setTimeout(r, 250));
  };
  const cams = ["Overview", "Living", "Kitchen", "Master", "Kids", "Foyer / hall", "South balcony"];
  for (const mode of ["auto", "full", "cut"]) {
    await page.select("select", mode);
    for (const c of [...cams, ...cams.reverse()]) await clickText(c);
  }
  for (const label of ["walls", "furniture", "dimensions", "labels", "print (B/W)"]) {
    await page.evaluate((l) => {
      const el = [...document.querySelectorAll("label")].find((x) => x.textContent?.trim() === l);
      el?.querySelector("input")?.click();
      el?.querySelector("input")?.click();
    }, label);
    steps++;
  }
  const rows = await page.$$("table.budget tbody tr");
  for (const r of rows) {
    await r.hover();
    steps++;
  }
  const dlDir = path.resolve(".smoke-downloads");
  rmSync(dlDir, { recursive: true, force: true });
  mkdirSync(dlDir, { recursive: true });
  const dl = await browser.target().createCDPSession();
  await dl.send("Browser.setDownloadBehavior", { behavior: "allowAndName", downloadPath: dlDir });
  await clickText("Export SVG");
  await clickText("Export PNG");
  // wait for both files (the PNG export takes 1–3 s), up to 15 s
  const done = () => readdirSync(dlDir).filter((f) => statSync(path.join(dlDir, f)).size > 1000).length;
  for (let t0 = Date.now(); done() < 2 && Date.now() - t0 < 15_000; ) await new Promise((r) => setTimeout(r, 200));
  const downloads = done();
  console.log(`2D exports downloaded: ${downloads}/2`);
  if (downloads < 2) errors.push("2D export did not download both files");
  for (const p of ["Materials", "Checks", "Budget", "Hide panel", "Budget"]) await clickText(p);
  for (const v of ["2D", "3D", "2D + 3D"]) await clickText(v);
  // immersive modes: Walk → Tour (autoplay) → Orbit, then camera switching still works
  for (const m of ["Walk", "Tour", "Orbit", "Tour", "Walk", "Orbit"]) {
    await clickText(m);
    await new Promise((r) => setTimeout(r, 600));
  }
  for (const c of ["Kitchen", "Overview"]) await clickText(c);
  // double-click a room in 2D jumps the 3D camera
  const rect = await page.$("svg.plan2d rect");
  if (rect) await rect.click({ count: 2 });
  await new Promise((r) => setTimeout(r, 500));
  const checksText = await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((x) => x.textContent === "Checks")?.click();
    return new Promise<string>((res) => setTimeout(() => res(document.querySelector(".pill")?.textContent ?? ""), 200));
  });
  console.log(`in-app checks: ${checksText}`);
  if (checksText !== "All passing") errors.push(`in-app checks: ${checksText}`);
} finally {
  await browser.close();
  await server.close();
}
console.log(`${steps} UI steps executed`);
if (errors.length) {
  console.error("FAIL — browser errors:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("PASS — no page errors while switching cameras, layers and panels");
