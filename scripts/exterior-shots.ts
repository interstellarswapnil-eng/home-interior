/**
 * `npm run exterior:shots` — boots Vite, opens exterior.html in local Chrome/Edge (puppeteer-core)
 * and saves preset views to docs/exterior/screenshots/. Pass name filters as args, e.g. `-- corner roles`.
 */
import { mkdirSync } from "node:fs";
import { createServer } from "vite";
import puppeteer from "puppeteer-core";
import { executablePath, glArgs } from "./browser";

const outDir = "docs/exterior/screenshots";
mkdirSync(outDir, { recursive: true });

const shots: { file: string; query: string; click?: [number, number] }[] = [
  { file: "p1-corner.png", query: "cam=corner&panel=0" },
  { file: "p1-front.png", query: "cam=front&panel=0" },
  { file: "p1-left-west.png", query: "cam=left&panel=0" },
  { file: "p1-right-east.png", query: "cam=right&panel=0" },
  { file: "p1-back.png", query: "cam=back&panel=0" },
  { file: "p1-bird.png", query: "cam=bird&panel=0" },
  { file: "p1-top.png", query: "cam=top&panel=0" },
  { file: "p1-street.png", query: "cam=street&panel=0" },
  { file: "p1-roles-corner.png", query: "cam=corner&roles=1" },
  { file: "p1-roles-bird.png", query: "cam=bird&roles=1&panel=0" },
  { file: "p1-app.png", query: "cam=corner" },
  { file: "p1-pick.png", query: "cam=corner", click: [640, 560] },
  // Phase 2: every pattern (recommended palette) from the street corner, plus close-ups for texture scale
  ...["architect", "warmMinimal", "japandi", "darkModern", "tropicalModern", "earthyOrganic", "brickConcrete", "warmCurves"].map((p) => ({
    file: `p2-${p}.png`,
    query: `cam=corner&panel=0&pattern=${p}`,
  })),
  { file: "p2-close-brick.png", query: "pattern=brickConcrete&panel=0&cp=-4,-1.5,4.5&ct=0,3,6&fov=50" },
  { file: "p2-close-warmCurves.png", query: "pattern=warmCurves&panel=0&cp=1.5,-4.5,5&ct=4.5,0.5,6&fov=55" },
  { file: "p2-close-tropical.png", query: "pattern=tropicalModern&panel=0&cp=-5,3,9&ct=0,7,8&fov=55" },
  { file: "p2-app.png", query: "cam=corner&pattern=warmCurves" },
];

const only = process.argv.slice(2);
const server = await createServer({ server: { port: 5198, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await puppeteer.launch({ executablePath, headless: true, args: glArgs, defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1 } });
const errors: string[] = [];
try {
  for (const s of shots) {
    if (only.length && !only.some((o) => s.file.includes(o))) continue;
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(`${s.file}: ${e}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`${s.file}: ${m.text()}`));
    await page.goto(`http://localhost:5198/exterior.html?${s.query}`, { waitUntil: "load", timeout: 90_000 });
    await page.waitForFunction("window.__extReady === true", { timeout: 120_000 });
    if (s.click) {
      await page.mouse.click(...s.click);
      await page.waitForSelector(".pickcard", { timeout: 10_000 });
    }
    await new Promise((r) => setTimeout(r, 600));
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
