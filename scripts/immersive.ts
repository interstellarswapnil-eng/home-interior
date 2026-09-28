/**
 * `npm run immersive` — end-to-end check of Walk / Tour / Record in headless Chrome/Edge:
 *  1. saves tour stills (one per titled stop) + walk stills to docs/screenshots/immersive/
 *  2. walks with real key presses and verifies movement + that walls stop you
 *  3. clicks "Record tour", waits for the download and verifies the video metadata
 * Pass `--no-record` to skip the (real-time, ~70 s) recording step.
 */
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import puppeteer, { type Page } from "puppeteer-core";
import { executablePath } from "./browser";
import { TOUR_SECONDS, tourStops } from "../plan/tour";

const outDir = "docs/screenshots/immersive";
const recDir = path.resolve("recordings");
mkdirSync(outDir, { recursive: true });
const noRecord = process.argv.includes("--no-record");

const server = await createServer({ server: { port: 5197, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  defaultViewport: { width: 1600, height: 1000 },
});
const errors: string[] = [];
const results: [string, boolean, string][] = [];
const open = async (query: string) => {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`http://localhost:5197/?view=3d&panel=none&${query}`, { waitUntil: "networkidle0" });
  await page.waitForFunction("window.__sceneReady === true", { timeout: 60_000 });
  return page;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clickText = (page: Page, text: string) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.trim() === t) as HTMLButtonElement | undefined;
    b?.click();
    return !!b && !b.disabled;
  }, text);

try {
  // 1. tour stills
  let n = 0;
  for (const s of tourStops.filter((x) => x.w.title)) {
    const page = await open(`mode=tour&tourT=${((s.arrive + s.depart) / 2).toFixed(2)}`);
    await wait(700);
    const file = `${String(++n).padStart(2, "0")}-tour-${s.w.id}.png`;
    await page.screenshot({ path: `${outDir}/${file}` });
    console.log(`saved ${outDir}/${file}`);
    await page.close();
  }
  {
    const page = await open(`mode=tour&tourT=1.2`);
    await wait(700);
    await page.screenshot({ path: `${outDir}/00-tour-intro.png` });
    await page.close();
  }

  // 2. walk: real key presses
  {
    const page = await open("mode=walk");
    await wait(500);
    await page.screenshot({ path: `${outDir}/walk-spawn.png` });
    const start = await page.evaluate(() => (window as any).__walk);
    await page.keyboard.down("KeyW");
    await wait(3000);
    await page.keyboard.up("KeyW");
    const moved = await page.evaluate(() => (window as any).__walk);
    const dist = Math.hypot(moved.x - start.x, moved.y - start.y);
    results.push(["Walk: W moves forward (toward the living room)", dist > 0.3 && moved.x > start.x, `${dist.toFixed(2)} m, (${start.x.toFixed(2)}, ${start.y.toFixed(2)}) → (${moved.x.toFixed(2)}, ${moved.y.toFixed(2)})`]);
    // strafe left (north-west) into the storage-room shutters: must stop 0.2 m short of them
    await page.keyboard.down("KeyA");
    await wait(6000);
    await page.keyboard.up("KeyA");
    const pinned = await page.evaluate(() => (window as any).__walk);
    const limit = 4.519 - 0.2 + 0.01; // storage front face minus player radius
    results.push(["Walk: walls stop the player (no clipping)", pinned.y <= limit && pinned.y > moved.y, `stopped at y=${pinned.y.toFixed(3)} (wall limit ${limit.toFixed(3)})`]);
    await page.screenshot({ path: `${outDir}/walk-living.png` });
    const lockBtn = await page.$("#walk-lock");
    results.push(["Walk: 'Click to explore' pointer-lock overlay", !!lockBtn, lockBtn ? "present" : "missing"]);
    await page.close();
  }

  // 3. record the tour
  if (!noRecord) {
    rmSync(recDir, { recursive: true, force: true });
    mkdirSync(recDir, { recursive: true });
    const page = await open("mode=tour&tourT=0");
    const cdp = await browser.target().createCDPSession();
    await cdp.send("Browser.setDownloadBehavior", { behavior: "allowAndName", downloadPath: recDir });
    const ok = await clickText(page, "● Record tour");
    if (!ok) throw new Error("Record button missing/disabled");
    const t0 = Date.now();
    await page.waitForFunction("window.__lastRecording !== undefined", { timeout: (TOUR_SECONDS * 3 + 60) * 1000, polling: 1000 });
    const rec = await page.evaluate(() => (window as any).__lastRecording);
    await wait(1500);
    // allowAndName saves under a GUID; give it the app's filename back
    const guid = readdirSync(recDir).find((x) => !x.endsWith(".crdownload"));
    const f = guid ? rec.file : undefined;
    if (guid) renameSync(path.join(recDir, guid), path.join(recDir, rec.file));
    const size = f ? statSync(path.join(recDir, f)).size : 0;
    console.log(`recording: ${JSON.stringify(rec)} wall-clock ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    results.push([
      "Record: one click downloads a playable video of the full tour",
      !!f && size > 100_000 && size === rec.size && rec.width === 1280 && rec.height === 720 && rec.duration >= TOUR_SECONDS * 0.9,
      `recordings/${f ?? "no file"} · ${(size / 1e6).toFixed(1)} MB · ${rec.type} · ${rec.width}×${rec.height} · ${rec.duration?.toFixed?.(1)} s (tour ${TOUR_SECONDS.toFixed(1)} s)`,
    ]);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}

for (const [name, ok, detail] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
if (errors.length) console.error("Browser errors:\n" + errors.join("\n"));
process.exit(errors.length || results.some((r) => !r[1]) ? 1 : 0);
