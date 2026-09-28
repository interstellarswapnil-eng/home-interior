/**
 * `npm run perf` — measures rendering fps in headless Chrome/Edge on this machine's GPU for
 * High vs Performance quality at several eye-level tour stops (1600×900 viewport, DPR 1).
 */
import { createServer } from "vite";
import puppeteer from "puppeteer-core";
import { executablePath, glArgs } from "./browser";
import { tourStops } from "../plan/tour";

const W = Number(process.env.PERF_W ?? 1600);
const H = Number(process.env.PERF_H ?? 900);
const server = await createServer({ server: { port: 5194, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await puppeteer.launch({ executablePath, headless: true, args: glArgs, defaultViewport: { width: W, height: H } });
const spots = tourStops.filter((s) => (process.env.PERF_SPOTS?.split(",") ?? ["living", "kitchen", "master", "kids"]).includes(s.w.id));
const rows: string[] = [];
let renderer = "";
try {
  for (const quality of (process.env.PERF_Q ? [process.env.PERF_Q] : ["high", "performance"]) as ("high" | "performance")[]) {
    const fps: number[] = [];
    for (const s of spots) {
      const page = await browser.newPage();
      await page.goto(`http://localhost:5194/?view=3d&panel=none&mode=tour&quality=${quality}&tourT=${((s.arrive + s.depart) / 2).toFixed(2)}`, { waitUntil: "load", timeout: 90_000 });
      await page.waitForFunction("window.__sceneReady === true", { timeout: 120_000 });
      renderer ||= (await page.evaluate(
        "(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()",
      )) as string;
      await new Promise((r) => setTimeout(r, 1000));
      await page.evaluate("window.__f = 0; (function tick(){ window.__f++; requestAnimationFrame(tick); })()");
      await new Promise((r) => setTimeout(r, 5000));
      const f = ((await page.evaluate("window.__f")) as number) / 5;
      fps.push(f);
      rows.push(`| ${quality} | ${s.w.title} | ${f.toFixed(1)} |`);
      await page.close();
    }
    rows.push(`| **${quality}** | **average** | **${(fps.reduce((a, b) => a + b, 0) / fps.length).toFixed(1)}** |`);
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`GPU: ${renderer} · viewport ${W}×${H} @ DPR 1 (headless Chrome)\n`);
console.log("| Quality | View | fps |\n|---|---|---:|\n" + rows.join("\n"));
