/**
 * `npm run screenshots` — boots Vite, drives a local Chrome/Edge (puppeteer-core, no download)
 * and saves the 2D plan + 3D room views to docs/screenshots/.
 * Set CHROME_PATH to override browser detection.
 */
import { mkdirSync } from "node:fs";
import { createServer } from "vite";
import puppeteer from "puppeteer-core";
import { executablePath, glArgs } from "./browser";

const outDir = "docs/screenshots";
mkdirSync(outDir, { recursive: true });

const shots: { file: string; query: string; kind: "2d" | "3d" }[] = [
  { file: "plan-2d.png", query: "view=2d&panel=none", kind: "2d" },
  { file: "3d-overview.png", query: "view=3d&panel=none&cam=overview", kind: "3d" },
  { file: "3d-living.png", query: "view=3d&panel=none&cam=living", kind: "3d" },
  { file: "3d-kitchen.png", query: "view=3d&panel=none&cam=kitchen", kind: "3d" },
  { file: "3d-master.png", query: "view=3d&panel=none&cam=master", kind: "3d" },
  { file: "3d-kids.png", query: "view=3d&panel=none&cam=kids", kind: "3d" },
  { file: "3d-foyer.png", query: "view=3d&panel=none&cam=foyer", kind: "3d" },
  { file: "3d-south-balcony.png", query: "view=3d&panel=none&cam=southBalcony", kind: "3d" },
  { file: "app-split-budget.png", query: "view=split&panel=budget", kind: "3d" },
];

const only = process.argv.slice(2);
const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: glArgs,
  defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1 },
});
const errors: string[] = [];
try {
  for (const s of shots) {
    if (only.length && !only.some((o) => s.file.includes(o))) continue;
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(`${s.file}: ${e}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`${s.file}: ${m.text()}`));
    await page.goto(`http://localhost:5199/?${s.query}`, { waitUntil: "load", timeout: 90_000 });
    if (s.kind === "3d") await page.waitForFunction("window.__sceneReady === true", { timeout: 120_000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${outDir}/${s.file}` });
    console.log(`saved ${outDir}/${s.file}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error("Browser errors:\n" + errors.join("\n"));
  process.exitCode = 1;
}
