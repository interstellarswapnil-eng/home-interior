/**
 * `npm run exterior:perf` — opens the exterior in headless Chrome/Edge, switches through every pattern card and palette,
 * reports how long each switch takes until the next rendered frame (target ≈ 1 s), and measures orbit fps per quality mode.
 */
import { createServer } from "vite";
import puppeteer, { type Page } from "puppeteer-core";
import { executablePath, glArgs } from "./browser";

const server = await createServer({ server: { port: 5197, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await puppeteer.launch({ executablePath, headless: true, args: glArgs, defaultViewport: { width: 1600, height: 1000 } });
const errors: string[] = [];

/** Run code in the page from a string (tsx would otherwise inject helpers the page does not have). */
const run = <T>(page: Page, js: string) => page.evaluate(js) as Promise<T>;
const twoFrames = "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))";

try {
  for (const quality of ["normal", "high"]) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`http://localhost:5197/exterior.html?cam=photo&thumbs=0&quality=${quality}`, { waitUntil: "load" });
    await page.waitForFunction("window.__extReady === true", { timeout: 120_000 });
    const names = await run<string[]>(page, `[...document.querySelectorAll(".pcard .pname")].map((e) => e.childNodes[0].textContent.trim())`);
    console.log(`\nQuality: ${quality}`);
    for (const [i, name] of names.entries()) {
      const ms = await run<number>(page, `(async () => { const t0 = performance.now(); document.querySelectorAll(".pcard")[${i}].click(); await ${twoFrames}; return performance.now() - t0; })()`);
      const pal = await run<number>(
        page,
        `(async () => { let worst = 0; for (const b of [...document.querySelectorAll(".palette")].reverse()) { const t0 = performance.now(); b.click(); await ${twoFrames}; worst = Math.max(worst, performance.now() - t0); } return worst; })()`,
      );
      console.log(`  ${name.padEnd(30)} pattern ${ms.toFixed(0).padStart(4)} ms · slowest palette ${pal.toFixed(0).padStart(4)} ms`);
    }
    // orbit fps: spin the turntable for 3 s
    await run(page, `document.querySelector(".quickbar button[title=Turntable]").click()`);
    const fps = await run<number>(page, `new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); })`);
    console.log(`  turntable: ${fps.toFixed(0)} fps`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
