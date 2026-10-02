/**
 * v2: approval flags and the concept quality gate.
 *
 * Flags follow the Maharashtra UDCPR-2020 readings in exteriorV2study.md (to be confirmed by the architect):
 *  - chajjas / frames / weather-shades may project at most 0.75 m into a marginal open space;
 *  - balconies / cantilever boxes count in FSI and must keep 2 m of marginal open space;
 *  - curved slab edges or GRC shells that change structure; new or resized openings; entrance canopies.
 * Margins are the ASSUMED plot margins (docs/exterior/BUILDING_FACTS.md) until the real ones are known.
 */
import catalogue from "../config/elements.json";
import optionalConfig from "../config/optional.json";
import { BALCONY, PLOT, X_E, X_W, X_WING, Y_S_MASTER } from "./building";
import { MATERIALS, patternById, resolveElements, resolveRoles, type DesignState, type Pattern } from "./resolve";
import type { Part, SurfaceRole } from "./types";

export type Flag = { id: string; title: string; detail: string; rule: string };

const CHAJJA_LIMIT = 0.75;
const MIN_OPEN = 2.0;

/** Plan bounding box of a part: [x0, y0, x1, y1, z0, z1]. */
export function partBounds(p: Part): [number, number, number, number, number, number] | null {
  if (p.kind === "box") return [p.box.x, p.box.y, p.box.x + p.box.w, p.box.y + p.box.h, p.box.z0, p.box.z1];
  if (p.kind === "blob") return [p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r, p.z - p.rz, p.z + p.rz];
  if (p.kind === "prism") {
    const us = p.profile.map((q) => q[0]);
    const vs = p.profile.map((q) => q[1]);
    const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
    if (p.axis === "x") return [u0, p.at, u1, p.at + p.thickness, v0, v1];
    if (p.axis === "y") return [p.at, u0, p.at + p.thickness, u1, v0, v1];
    return [u0, v0, u1, v1, p.at, p.at + p.thickness];
  }
  return null;
}

/** The architect's building line on each side (existing balconies included), and the assumed open space beyond it. */
const southLine = (x0: number) => (x0 >= X_WING - 0.3 ? BALCONY.S.y : Y_S_MASTER);
const margins = { S: (x0: number) => southLine(x0) - PLOT.y0, W: X_W - PLOT.x0, E: PLOT.x1 - X_E };

const MOVE_TYPES = new Set(["frame", "bands", "floatingRoof", "lanterns", "jaali", "fins", "slats", "cladding", "boxFrames", "sunshades", "roofOverhang", "canopy", "pergola"]);
const typeOf = (design: DesignState, id: string) => (resolveElements(design)[id]?.params?.type as string) ?? id;
const LABEL = (design: DesignState, id: string) => {
  const pat = patternById(design.patternId);
  const named = [pat.hero, ...(pat.supporting ?? []), pat.crown, pat.threshold].find((m) => m?.element === id);
  return named?.name ?? (catalogue as unknown as Record<string, { label: string }>)[typeOf(design, id)]?.label ?? id;
};

export function approvalFlags(design: DesignState, parts: Part[]): Flag[] {
  const flags: Flag[] = [];
  const byEl = new Map<string, Part[]>();
  for (const p of parts) if (p.element && MOVE_TYPES.has(typeOf(design, p.element))) byEl.set(p.element, [...(byEl.get(p.element) ?? []), p]);

  for (const [el, ps] of byEl) {
    let s = 0;
    let w = 0;
    let e = 0;
    let groundInMargin = false;
    let sMarginLeft = Infinity;
    for (const p of ps) {
      const b = partBounds(p);
      if (!b) continue;
      const [x0, y0, x1, , z0] = b;
      const sl = southLine(x0);
      if (y0 < sl - 0.01) {
        s = Math.max(s, sl - y0);
        sMarginLeft = Math.min(sMarginLeft, y0 - PLOT.y0);
      }
      if (x0 < X_W - 0.01) w = Math.max(w, X_W - x0);
      if (x1 > X_E + 0.01) e = Math.max(e, x1 - X_E);
      if (z0 < 1.0 && (y0 < sl - 0.05 || x0 < X_W - 0.05 || x1 > X_E + 0.05)) groundInMargin = true;
    }
    const name = LABEL(design, el);
    const out = (side: string, d: number, left: number) =>
      flags.push({
        id: `${el}-proj-${side}`,
        title: `${name}: projects ${d.toFixed(2)} m on the ${side} side`,
        detail: `Beyond the building line by ${d.toFixed(2)} m (limit ${CHAJJA_LIMIT} m for chajjas / frames over the marginal open space); about ${Math.max(0, left).toFixed(2)} m of open space left to the boundary (assumed margins).`,
        rule: "UDCPR 6.7(a): projection over marginal open space ≤ 0.75 m",
      });
    if (s > CHAJJA_LIMIT + 1e-3) out("road (south)", s, sMarginLeft);
    if (w > CHAJJA_LIMIT + 1e-3) out("side-road (west)", w, margins.W - w);
    if (e > CHAJJA_LIMIT + 1e-3) out("east", e, margins.E - e);
    if (w > 1e-3 && margins.W - w < MIN_OPEN && w <= CHAJJA_LIMIT + 1e-3)
      flags.push({
        id: `${el}-margin-W`,
        title: `${name}: narrows the side-road margin`,
        detail: `The west open space is only about ${margins.W.toFixed(2)} m (assumed) before this ${w.toFixed(2)} m projection.`,
        rule: "Check the minimum side margin with the architect",
      });
    if (groundInMargin)
      flags.push({
        id: `${el}-ground`,
        title: `${name}: stands on the ground in front of the building`,
        detail: "Part of this move reaches down into the marginal open space; supports there are usually not allowed.",
        rule: "UDCPR 6.7(k): no supporting columns in the required front margin",
      });
    const t = typeOf(design, el);
    if (t === "bands") {
      const rounded = Number(resolveElements(design)[el]?.params?.endRadius ?? 1) > 0;
      flags.push({
        id: `${el}-curved`,
        title: `${name}: ${rounded ? "rounded" : "projecting"} slab-edge bands`,
        detail: `Extends the slab edges with ${rounded ? "rounded " : ""}bands (RCC${rounded ? " with curved shuttering" : ""} or GRC shells): a structural and detailing change.`,
        rule: "Curved slab edges / GRC shells that change structure",
      });
    }
    if (t === "floatingRoof")
      flags.push({
        id: `${el}-roof`,
        title: `${name}: new roof structure over the terrace`,
        detail: "Needs posts or brackets and a structural check; rooftop projections around the building are limited (about 0.3 m) beyond what counts as a canopy.",
        rule: "UDCPR 6.7(e) rooftop projections; structural approval",
      });
    if (t === "canopy")
      flags.push({
        id: `${el}-canopy`,
        title: `${name}: entrance canopy`,
        detail: "Max 5 m × 2.5 m, 2.4 m clear height, 1.5 m from the boundary, no columns in the front margin.",
        rule: "UDCPR 6.7(d), 6.7(k)",
      });
  }
  const OPT = optionalConfig as unknown as Record<string, { label: string; detail: string }>;
  for (const [id, on] of Object.entries(design.optional ?? {}))
    if (on && OPT[id]) flags.push({ id: `opt-${id}`, title: OPT[id].label, detail: OPT[id].detail, rule: "New or resized opening" });
  return flags;
}

// ---------------------------------------------------------------------------
// Quality gate (brief §7): automated where it can be; the grey test (10) comes from renders.
// ---------------------------------------------------------------------------
export type GateItem = { n: number; label: string; pass: boolean | null; note: string };

const FAMILY: Record<string, string> = { paint: "plaster", texturedPlaster: "plaster", limewash: "plaster", wood: "wood", charredWood: "wood", stone: "stone", brick: "brick", concrete: "concrete", terracotta: "terracotta", metal: "metal", tile: "stone", ground: "ground", glass: "glass" };
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function qualityGate(design: DesignState, parts: Part[], grey?: { distinct: boolean; note: string }): GateItem[] {
  const pat: Pattern = patternById(design.patternId);
  const els = resolveElements(design);
  const roles = resolveRoles(design);
  const heroParts = parts.filter((p) => p.element === pat.hero?.element);
  const moveParts = parts.filter((p) => p.element && MOVE_TYPES.has(typeOf(design, p.element)));
  const words = (pat.hero?.name ?? "").trim().split(/\s+/).filter(Boolean).length;

  // depth: how far moves stand proud of the wall behind them
  let proud = 0;
  for (const p of moveParts) {
    const b = partBounds(p);
    if (!b) continue;
    proud = Math.max(proud, Y_S_MASTER - b[1], X_W - b[0]);
  }
  const recess = 1.31; // the south balcony pockets: balcony front (−0.50) to the wall behind (+0.81)

  // materials on the main visible surfaces (families, glass excluded)
  const visible: SurfaceRole[] = ["mainWall", "secondSurface", "featureWall", "base", "roofEdge", "soffit", "windowSurround", "compoundWall", "trim"];
  for (const id of Object.keys(els)) if (els[id].enabled && ["jaali", "slats", "pergola"].includes(id)) visible.push(id as SurfaceRole);
  const families = new Set(visible.map((r) => FAMILY[MATERIALS[roles[r].material]?.kind ?? "paint"]).filter((f) => f !== "glass" && f !== "ground"));

  // dark used as lines: share of dark among the big surfaces
  const big: SurfaceRole[] = ["mainWall", "secondSurface", "featureWall"];
  const darkBig = big.filter((r) => lum(roles[r].color) < 0.12);
  const figureGround = pat.id.includes("Flute");

  const heroLight = heroParts.some((p) => p.role === "lightGlow") || (els.lighting?.enabled ?? false);
  const crown = !!pat.crown && !!els[pat.crown.element]?.enabled;
  const threshold = !!pat.threshold && !!els[pat.threshold.element]?.enabled && !!els.nameSign?.enabled;

  // asymmetry: hero centre vs. building centre on the street (south) elevation
  const hb = heroParts.map(partBounds).filter(Boolean) as number[][];
  const heroCx = hb.length ? (Math.min(...hb.map((b) => b[0])) + Math.max(...hb.map((b) => b[2]))) / 2 : 0;
  const offset = Math.abs(heroCx - (X_W + X_E) / 2);

  return [
    { n: 1, label: "Hero nameable in three words", pass: words > 0 && words <= 4, note: `“${pat.hero?.name ?? "—"}”` },
    { n: 2, label: "At most 3 supporting moves", pass: (pat.supporting?.length ?? 0) <= 3, note: `${pat.supporting?.length ?? 0} supporting` },
    { n: 3, label: "One element ≥ 450 mm proud, one recess ≥ 900 mm", pass: proud >= 0.45 && recess >= 0.9, note: `proud ${proud.toFixed(2)} m · recess ${recess.toFixed(2)} m (balcony pockets)` },
    { n: 4, label: "≤ 4 materials + glass", pass: families.size <= 4, note: [...families].join(", ") },
    { n: 5, label: "Dark used as lines", pass: darkBig.length === 0 || figureGround, note: darkBig.length ? (figureGround ? "dark backdrop by design (figure-ground)" : `dark on ${darkBig.join(", ")}`) : "dark only on frames, fascias, gates" },
    { n: 6, label: "Designed crown", pass: crown, note: pat.crown?.name ?? "—" },
    { n: 7, label: "Designed threshold", pass: threshold, note: pat.threshold?.name ?? "—" },
    { n: 8, label: "Hero has its own light", pass: heroLight, note: heroParts.some((p) => p.role === "lightGlow") ? "light built into the hero" : "facade lighting layer" },
    { n: 9, label: "Asymmetric but balanced", pass: offset > 0.8 ? true : null, note: offset > 0.8 ? `hero ${offset.toFixed(1)} m off-centre (balance: judge by eye)` : "hero is central: judge by eye" },
    { n: 10, label: "Distinct in grey", pass: grey ? grey.distinct : null, note: grey?.note ?? "computed from the grey renders" },
  ];
}
