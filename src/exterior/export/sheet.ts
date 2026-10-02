/**
 * One-page design sheet to share with the architect: a single self-contained HTML file (images embedded),
 * with a print layout so "Print → Save as PDF" gives a clean PDF.
 */
import catalogue from "../config/elements.json";
import optional from "../config/optional.json";
import { MATERIALS, ROLES, patternById, resolveElements, resolveRoles, type DesignState } from "../model/resolve";
import { slotById } from "../model/slots";
import type { SurfaceRole } from "../model/types";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const CAT = catalogue as unknown as Record<string, { label: string; status?: string; params?: Record<string, { label: string }> }>;
const OPT = optional as unknown as Record<string, { label: string; detail: string; why: string }>;

/** Surfaces listed on the sheet, in the order a painter or contractor would think of them. */
const SHEET_ROLES: SurfaceRole[] = [
  "mainWall", "secondSurface", "featureWall", "base", "trim", "roofEdge", "soffit", "windowSurround", "balconyFront", "column",
  "windowFrame", "glass", "railing", "door", "mainDoor", "fins", "slats", "jaali", "sunshade", "pergola", "canopy", "planter",
  "sill", "compoundWall", "gate", "paving", "ground",
];

export type SheetImage = { label: string; url: string };

export function designSheetHtml(design: DesignState, images: SheetImage[], extra: { date: string; viewNote: string }): string {
  const pattern = patternById(design.patternId);
  const palette = pattern.palettes.find((p) => p.id === design.paletteId);
  const roles = resolveRoles(design);
  const els = resolveElements(design);
  const used = Object.entries(els).filter(([id, c]) => c.enabled && CAT[id] && id !== "nameSign");
  const opts = Object.entries(design.optional ?? {}).filter(([, on]) => on);

  const surfaceRows = SHEET_ROLES.map((r) => {
    const st = roles[r];
    const ov = design.overrides.roles[r];
    const note = ov?.locked ? "locked" : ov?.color || ov?.material ? "custom" : "";
    return `<tr><td><span class="sw" style="background:${st.color}"></span></td><td>${esc(ROLES[r].label)}</td><td>${esc(MATERIALS[st.material]?.name ?? st.material)}</td><td class="mono">${st.color}</td><td class="muted">${note}</td></tr>`;
  }).join("");

  const elementRows = used
    .map(([id, c]) => {
      const params = Object.entries(c.params ?? {})
        .filter(([k, v]) => k !== "roleBySlot" && k !== "type" && (typeof v === "number" || typeof v === "string" || typeof v === "boolean"))
        .map(([k, v]) => `${esc(CAT[id].params?.[k]?.label ?? k)}: ${esc(String(v))}`)
        .join(" · ");
      const where = (c.slots ?? []).map((s) => esc(slotById(s)?.label ?? s)).join(", ");
      return `<tr><td>${esc(CAT[id].label)}</td><td>${where || "—"}</td><td class="muted">${params || ""}</td></tr>`;
    })
    .join("");

  const optRows = opts.length
    ? opts.map(([id]) => `<li><b>${esc(OPT[id]?.label ?? id)}</b>: ${esc(OPT[id]?.detail ?? "")} <i>Why:</i> ${esc(OPT[id]?.why ?? "")}</li>`).join("")
    : "<li>None. The building is exactly as designed: footprint, floors, window and door positions unchanged.</li>";

  const imgs = images.map((i) => `<figure><img src="${i.url}" alt="${esc(i.label)}"><figcaption>${esc(i.label)}</figcaption></figure>`).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pasaydan exterior: ${esc(design.name || pattern.name)}</title>
<style>
  :root { --ink:#2b2b2b; --muted:#7a746b; --line:#e4dfd6; }
  body { font: 14px/1.45 "Segoe UI", system-ui, Arial, sans-serif; color: var(--ink); margin: 0; background: #f6f4ef; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px; background: #fff; }
  h1 { margin: 0 0 2px; font-size: 24px; } h2 { font-size: 15px; margin: 22px 0 8px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  .muted { color: var(--muted); } .mono { font-family: Consolas, monospace; }
  table { border-collapse: collapse; width: 100%; } td, th { border-bottom: 1px solid var(--line); padding: 5px 8px; text-align: left; vertical-align: top; }
  th { font-size: 12px; color: var(--muted); font-weight: 600; }
  .sw { display: inline-block; width: 26px; height: 18px; border-radius: 3px; border: 1px solid rgba(0,0,0,.2); }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  figure { margin: 0; } figure img { width: 100%; border-radius: 6px; display: block; } figcaption { font-size: 12px; color: var(--muted); margin-top: 3px; }
  .lead img { width: 100%; border-radius: 8px; }
  .swatches { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; } .swatches div { font-size: 11px; text-align: center; } .swatches span { display: block; width: 90px; height: 50px; border-radius: 6px; border: 1px solid rgba(0,0,0,.15); margin-bottom: 3px; }
  .print { position: fixed; right: 16px; top: 16px; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--ink); background: var(--ink); color: #fff; cursor: pointer; }
  @media print { .print { display: none; } body { background: #fff; } main { padding: 0; } .grid { gap: 6px; } figure { break-inside: avoid; } h2 { break-after: avoid; } }
  @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
</style></head><body>
<button class="print" onclick="print()">Print / save as PDF</button>
<main>
  <h1>Pasaydan · exterior design</h1>
  <div class="muted">${esc(design.name || "Design")} · ${esc(pattern.name)} · ${esc(palette?.name ?? "")} · ${esc(extra.date)} · Ahilyanagar, road on the south</div>
  ${images[0] ? `<p class="lead"><img src="${images[0].url}" alt="${esc(images[0].label)}"></p>` : ""}
  <div class="swatches">${(["mainWall", "secondSurface", "featureWall", "railing", "base", "paving"] as SurfaceRole[])
    .map((r) => `<div><span style="background:${roles[r].color}"></span>${esc(ROLES[r].label)}<br><b class="mono">${roles[r].color}</b></div>`)
    .join("")}</div>
  <p>${esc(pattern.description)}</p>
  <p><b>Good to know:</b> ${esc(pattern.notes.climate)} <span class="muted">Upkeep: ${esc(pattern.notes.maintenance)} Relative cost: ${esc(pattern.notes.relativeCost)}.</span></p>

  <h2>Surfaces: material and colour</h2>
  <table><tr><th></th><th>Surface</th><th>Material</th><th>Colour (hex, sRGB)</th><th></th></tr>${surfaceRows}</table>
  <p class="muted">Wood colours are meant as wood-look HPL / WPC / aluminium panels outdoors; real wood only under cover. Hex codes are the average tone; match paint brands to them on site under daylight.</p>

  <h2>Elements</h2>
  <table><tr><th>Element</th><th>Where</th><th>Settings</th></tr>${elementRows}</table>

  <h2>Changes that need architect approval</h2>
  <ul>${optRows}</ul>

  <h2>Views</h2>
  <div class="grid">${imgs}</div>
  <p class="muted">${esc(extra.viewNote)} Generated by the Pasaydan exterior tool. Textures: CC0 (Poly Haven).</p>
</main></body></html>`;
}
