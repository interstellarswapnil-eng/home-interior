/**
 * `npm run exterior:perf` — opens the exterior in headless Chrome/Edge, switches through every pattern and palette
 * from the panel, and reports how long each switch takes until the next rendered frame (target ≈ 1 s).
 */
import { createServer } from "vite";
import puppeteer from "puppeteer-core";
import { executablePath, glArgs } from "./browser";

const server = await createServer({ server: { port: 5197, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await puppeteer.launch({ executablePath, headless: true, args: glArgs, defaultViewport: { width: 1600, height: 1000 } });
const errors: string[] = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:5197/exterior.html?cam=corner", { waitUntil: "load" });
  await page.waitForFunction("window.__extReady === true", { timeout: 120_000 });
  const patterns: string[] = await page.evaluate(() => [...(document.querySelector(".xpanel select") as HTMLSelectElement).options].map((o) => o.value));
  const rows: string[] = [];
  for (const p of patterns) {
    const ms = await page.evaluate(async (id) => {
      const sel = document.querySelector(".xpanel select") as HTMLSelectElement;
      const t0 = performance.now();
      const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
      set.call(sel, id);
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return performance.now() - t0;
    }, p);
    // palettes of this pattern
    const pal = await page.evaluate(async () => {
      const btns = [...document.querySelectorAll(".palette")] as HTMLButtonElement[];
      const times: number[] = [];
      for (const b of btns.reverse()) {
        const t0 = performance.now();
        b.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        times.push(performance.now() - t0);
      }
      return Math.max(...times);
    });
    rows.push(`${p.padEnd(16)} pattern switch ${ms.toFixed(0).padStart(5)} ms · slowest palette switch ${pal.toFixed(0).padStart(4)} ms`);
  }
  console.log(rows.join("\n"));
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
