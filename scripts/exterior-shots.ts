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

const shots: { file: string; query: string; click?: [number, number]; waitThumbs?: boolean }[] = [
  { file: "p1-corner.png", query: "cam=photo&panel=0" },
  { file: "p1-front.png", query: "cam=front&panel=0" },
  { file: "p1-left-west.png", query: "cam=left&panel=0" },
  { file: "p1-right-east.png", query: "cam=right&panel=0" },
  { file: "p1-back.png", query: "cam=back&panel=0" },
  { file: "p1-bird.png", query: "cam=bird&panel=0" },
  { file: "p1-top.png", query: "cam=top&panel=0" },
  { file: "p1-street.png", query: "cam=street&panel=0" },
  { file: "p1-roles-corner.png", query: "cam=photo&roles=1" },
  { file: "p1-roles-bird.png", query: "cam=bird&roles=1&panel=0" },
  { file: "p1-app.png", query: "cam=photo" },
  { file: "p1-pick.png", query: "cam=photo", click: [640, 560] },
  // Phase 2: every pattern (recommended palette) from the street corner, plus close-ups for texture scale
  ...["architect", "warmMinimal", "japandi", "darkModern", "tropicalModern", "earthyOrganic", "brickConcrete", "warmCurves"].map((p) => ({
    file: `p2-${p}.png`,
    query: `cam=photo&panel=0&pattern=${p}`,
  })),
  { file: "p2-close-brick.png", query: "pattern=brickConcrete&panel=0&cp=-4,-1.5,4.5&ct=0,3,6&fov=50" },
  { file: "p2-close-warmCurves.png", query: "pattern=warmCurves&panel=0&cp=1.5,-4.5,5&ct=4.5,0.5,6&fov=55" },
  { file: "p2-close-tropical.png", query: "pattern=tropicalModern&panel=0&cp=-5,3,9&ct=0,7,8&fov=55" },
  { file: "p2-app.png", query: "cam=photo&pattern=warmCurves" },
  // Phase 3: controls, light, views, new elements
  { file: "p3-style-tab.png", query: "cam=photo&pattern=warmCurves&tab=style&thumbs=1", waitThumbs: true },
  { file: "p3-colors-tab.png", query: "cam=photo&pattern=warmCurves&tab=colors" },
  { file: "p3-elements-tab.png", query: "cam=photo&pattern=tropicalModern&tab=elements" },
  { file: "p3-view-tab.png", query: "cam=photo&pattern=warmCurves&tab=view" },
  { file: "p3-pick-edit.png", query: "cam=photo&pattern=warmCurves&panel=0", click: [700, 520] },
  { file: "p3-sky-overcast.png", query: "cam=photo&pattern=warmCurves&panel=0&sky=overcast" },
  { file: "p3-sky-night.png", query: "cam=photo&pattern=warmCurves&panel=0&sky=night" },
  { file: "p3-sun-0800.png", query: "cam=cornerSE&pattern=warmCurves&panel=0&hour=8" },
  { file: "p3-sun-1730.png", query: "cam=photo&pattern=warmCurves&panel=0&hour=17.5" },
  { file: "p3-view-cornerSE.png", query: "cam=cornerSE&pattern=architect&panel=0" },
  { file: "p3-view-top.png", query: "cam=top&pattern=tropicalModern&panel=0&on=solar" },
  { file: "p3-view-street.png", query: "cam=street&pattern=architect&panel=0" },
  { file: "p3-view-entrance.png", query: "cam=entrance&pattern=darkModern&panel=0" },
  { file: "p3-walk.png", query: "mode=walk&pattern=japandi&panel=0" },
  { file: "p3-earthy-arches.png", query: "pattern=earthyOrganic&panel=0&cp=-7,1.5,6.5&ct=0,3,6.5&fov=50" },
  { file: "p3-solar-pergola.png", query: "pattern=tropicalModern&panel=0&on=solar&cam=bird" },
  { file: "p3-mobile.png", query: "cam=photo&pattern=warmCurves" },
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
    if (s.file.includes("mobile")) await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const extra = `${s.query.includes("thumbs=") ? "" : "&thumbs=0"}${s.query.includes("date=") ? "" : "&date=2026-10-01"}&instant=1`;
    await page.goto(`http://localhost:5198/exterior.html?${s.query}${extra}`, { waitUntil: "load", timeout: 90_000 });
    await page.waitForFunction("window.__extReady === true", { timeout: 120_000 });
    if (s.waitThumbs) await page.waitForFunction("document.querySelectorAll('.pthumb img').length >= 8", { timeout: 180_000 });
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
