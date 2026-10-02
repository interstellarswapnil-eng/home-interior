/**
 * `npm run exterior:smoke` — drives the exterior UI in headless Chrome/Edge like a user would and fails on any page error
 * or broken behaviour: tabs, patterns, palettes, colour edit + lock across a pattern switch, elements, views, light, walk,
 * compare, save / undo, and the three exports (files are downloaded to a temp folder and checked).
 */
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "vite";
import puppeteer, { type Page } from "puppeteer-core";
import { executablePath, glArgs } from "./browser";

const server = await createServer({ server: { port: 5196, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await puppeteer.launch({ executablePath, headless: true, args: glArgs, defaultViewport: { width: 1600, height: 1000 } });
const errors: string[] = [];
let steps = 0;
const ok = (msg: string) => {
  steps++;
  console.log(`  ✓ ${msg}`);
};
const fail = (msg: string) => {
  errors.push(msg);
  console.log(`  ✗ ${msg}`);
};
// (string form: tsx would otherwise inject a helper that does not exist in the page)
const frames = (page: Page, n = 3) =>
  page.evaluate(`new Promise((r) => { let i = 0; const f = () => (++i >= ${n} ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); })`);
const clickText = async (page: Page, selector: string, text: string) => {
  const done = await page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent?.trim().startsWith(t)) as HTMLElement | undefined;
      el?.click();
      return !!el;
    },
    selector,
    text,
  );
  if (!done) throw new Error(`no ${selector} "${text}"`);
  await frames(page);
};
const text = (page: Page, sel: string) => page.$eval(sel, (e) => e.textContent ?? "");

try {
  const page = await browser.newPage();
  const dl = mkdtempSync(path.join(tmpdir(), "ext-smoke-"));
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
  const waitFile = async (re: RegExp, ms = 240_000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const f = readdirSync(dl).find((n) => re.test(n) && !n.endsWith(".crdownload"));
      if (f && statSync(path.join(dl, f)).size > 0) return path.join(dl, f);
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  };
  page.on("pageerror", (e) => fail(`page error: ${e}`));
  page.on("console", (m) => m.type() === "error" && fail(`console: ${m.text()}`));
  await page.goto("http://localhost:5196/exterior.html?thumbs=0&date=2026-10-01", { waitUntil: "load" });
  await page.waitForFunction("window.__extReady === true", { timeout: 120_000 });
  ok("exterior loads (Architect's design)");

  // Style: every pattern card, then every palette of the last one
  const cards = await page.$$eval(".pcard .pname", (e) => e.map((x) => x.childNodes[0].textContent!.trim()));
  for (const c of cards) {
    await clickText(page, ".pcard .pname", c);
    if (!(await text(page, "header .title")).includes(c)) fail(`pattern ${c} did not apply`);
  }
  ok(`switched through ${cards.length} patterns`);
  const pals = await page.$$eval(".palette", (e) => e.length);
  for (let i = 0; i < pals; i++) {
    await page.evaluate((k) => (document.querySelectorAll(".palette")[k] as HTMLElement).click(), i);
    await frames(page);
  }
  ok(`switched through ${pals} colour sets`);

  // Colours: edit main wall, lock it, switch pattern, check it survived; then reset
  await clickText(page, ".tabs button", "Colors");
  await clickText(page, ".rolehead", "Main walls");
  await page.$eval(".roleeditor .hex", (el) => {
    const i = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(i, "#123456");
    i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await frames(page);
  if (!(await text(page, ".paintstrip")).includes("#123456")) fail("custom colour not applied");
  else ok("custom main wall colour applied (paint strip shows #123456)");
  await page.$eval(".roleeditor .lock input", (el) => (el as HTMLInputElement).click());
  await frames(page);
  await clickText(page, ".tabs button", "Style");
  await clickText(page, ".pcard .pname", "Japandi");
  if (!(await text(page, ".paintstrip")).includes("#123456")) fail("locked colour lost on pattern switch");
  else ok("locked colour kept after switching to Japandi");
  await clickText(page, ".tabs button", "Colors");
  await clickText(page, "button", "Reset to the pattern");
  if ((await text(page, ".paintstrip")).includes("#123456")) fail("reset did not restore colours");
  else ok("reset restores the pattern's colours");

  // Elements: toggle each on and off, open one and move a slider
  await clickText(page, ".tabs button", "Elements");
  const n = await page.$$eval(".elhead input", (e) => e.length);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 2; k++) {
      await page.evaluate((j) => (document.querySelectorAll(".elhead input")[j] as HTMLInputElement).click(), i);
      await frames(page, 2);
    }
  }
  ok(`toggled all ${n} elements on/off`);
  await clickText(page, ".elname", "Wood slats");
  await page.$eval(".elbody input[type=range]", (el) => {
    const i = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(i, "0.1");
    i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await frames(page);
  ok("adjusted wood slat width");

  // View: every camera preset, light modes, time, turntable, walk
  await clickText(page, ".tabs button", "View");
  const views = await page.$$eval(".btngrid button", (e) => e.map((x) => x.textContent!.trim()));
  for (const v of views) {
    await clickText(page, ".btngrid button", v);
    await frames(page, 4);
  }
  ok(`visited ${views.length} camera presets`);
  for (const s of ["Cloudy", "Night", "Sunny"]) await clickText(page, ".xpanel .seg button", s);
  ok("sunny / cloudy / night");
  await page.$eval(".xpanel input[type=range]", (el) => {
    const i = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(i, "9");
    i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await frames(page);
  ok("time of day slider");
  await clickText(page, "label", "Turntable");
  await frames(page, 10);
  ok("turntable");
  await clickText(page, ".xpanel .seg button", "Walk around");
  await page.waitForSelector("#walk-start");
  ok("walk mode");
  await clickText(page, ".xpanel .seg button", "Rotate around");

  // Click a surface → edit card
  await clickText(page, ".btngrid button", "Like image 28");
  await frames(page, 70);
  await page.mouse.click(560, 520);
  await page.waitForSelector(".pickcard", { timeout: 5000 }).then(
    () => ok("clicking a surface opens the edit card"),
    () => fail("no edit card after clicking the building"),
  );

  // Compare: side by side = two canvases; flip with Space
  await page.mouse.click(1590, 990); // close the edit card by clicking empty space
  await clickText(page, ".tabs button", "Compare");
  await frames(page, 10);
  const canvases = await page.$$eval("main canvas", (c) => c.length);
  if (canvases !== 2) fail(`side by side shows ${canvases} views`);
  else ok("compare: side by side shows A and B");
  await clickText(page, ".xpanel .seg button", "Flip");
  const before = await text(page, ".cmplabel");
  await page.keyboard.press("Space");
  await frames(page, 4);
  const after = await text(page, ".cmplabel");
  if (before === after || !after.startsWith("B")) fail(`flip did not switch (${before} → ${after})`);
  else ok(`compare: Space flips A → B (${after})`);

  // Save, duplicate, undo
  await clickText(page, ".tabs button", "Save");
  await page.$eval("input.text", (el) => {
    const i = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(i, "Smoke test design");
    i.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await clickText(page, ".xpanel section button", "Save");
  await clickText(page, ".saves .sactions button", "duplicate");
  const saved = await page.$$eval(".saves li", (l) => l.length);
  if (saved < 2) fail(`expected 2 saved designs, got ${saved}`);
  else ok("saved a design and duplicated it");
  await clickText(page, ".tabs button", "Style");
  await clickText(page, ".pcard .pname", "Brick");
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyZ");
  await page.keyboard.up("Control");
  await frames(page, 3);
  if ((await text(page, "header .title")).includes("Brick")) fail("Ctrl+Z did not undo the pattern switch");
  else ok("Ctrl+Z undoes a pattern switch");

  // Exports
  await clickText(page, ".tabs button", "Save");
  await clickText(page, ".btngrid button", "Screenshot");
  const png = await waitFile(/\.png$/);
  if (!png || readFileSync(png).subarray(1, 4).toString() !== "PNG") fail("screenshot PNG not downloaded");
  else ok(`screenshot downloaded (${(statSync(png).size / 1e6).toFixed(1)} MB)`);
  await clickText(page, ".btngrid button", "Export all views");
  const zip = await waitFile(/\.zip$/);
  if (!zip || readFileSync(zip).readUInt32LE(0) !== 0x04034b50) fail("all-views ZIP not downloaded");
  else ok(`all views ZIP downloaded (${(statSync(zip).size / 1e6).toFixed(1)} MB)`);
  await clickText(page, ".btngrid button", "Design sheet");
  const sheet = await waitFile(/design-sheet\.html$/);
  const html = sheet ? readFileSync(sheet, "utf8") : "";
  const imgs = (html.match(/<img /g) ?? []).length;
  if (!sheet || imgs < 8) fail(`design sheet missing or incomplete (${imgs} images)`);
  else ok(`design sheet downloaded (${imgs} images, ${(statSync(sheet).size / 1e6).toFixed(1)} MB)`);
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? `FAIL — ${errors.length} problem(s)` : `PASS — ${steps} steps, no page errors`);
if (errors.length) process.exitCode = 1;
