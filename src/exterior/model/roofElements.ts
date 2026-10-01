/** Roof and ground elements: parapet styles (D10), roof overhang (D8), pergola (D9), canopy (D7), stone base (D6). */
import {
  CORE_OUTLINE,
  GATES,
  PARAPET_H,
  PLINTH,
  PLOT,
  ROOF_OUTLINE,
  STILT_BAND,
  TERRACE,
  X_CORE_E,
  X_E,
  X_W,
  Y_NOTCH,
  Y_STAIR_N,
  Y_TOWER_S,
  level,
} from "./building";
import { box, edgeWalls, faceBox } from "./geom";
import { num, str, type Gen } from "./elementUtil";
import { COLUMNS } from "./shell";
import { claddingLayer } from "./wallElements";
import type { Box, Part } from "./types";

/**
 * The stair head room rises above the terrace along the west (north of the tower line) and the north edge,
 * so roof-edge pieces there are clipped (west) or dropped (north).
 */
function clipTower(b: Box): Box | null {
  const westStrip = b.x < X_W + 0.35 && b.x + b.w < X_W + 0.6;
  if (westStrip) {
    const y1 = Math.min(b.y + b.h, Y_TOWER_S);
    return y1 - b.y > 0.01 ? { ...b, h: y1 - b.y } : null;
  }
  const northStrip = b.y > Y_STAIR_N - 0.6 && b.y < Y_STAIR_N + 0.6 && b.x + b.w <= X_CORE_E + 0.7;
  return northStrip ? null : b;
}

const reversed = <T>(a: T[]) => [...a].reverse();

/** D10 Parapet and roof edge: thin coping, thick band, or glass. */
export const parapet: Gen = (id, cfg) => {
  const out: Part[] = [];
  const style = str(cfg.params, "style", "thin");
  const H = num(cfg.params, "height", PARAPET_H);
  const meta = { floor: 4, slot: "edge:terrace", element: id };
  const push = (pid: string, role: Part["role"], b: Box | null, side?: Part["side"]) => b && out.push(box(pid, role, b, { ...meta, side }));
  const solidTop = style === "glass" ? 0.3 : H - 0.05;
  for (const w of edgeWalls(ROOF_OUTLINE, 0.15, TERRACE, TERRACE + solidTop, (i) => ({ id: `${id}-wall-${i}`, role: "mainWall", floor: 4 })))
    push(w.id, "mainWall", clipTower(w), w.side);
  if (style === "glass") {
    for (const w of edgeWalls(ROOF_OUTLINE, 0.15, TERRACE + 0.3, TERRACE + H - 0.04, (i) => ({ id: `${id}-glass-${i}`, role: "glass", floor: 4 }))) {
      const g = { ...w };
      if (w.side === "N" || w.side === "S") (g.y += 0.07), (g.h = 0.012);
      else (g.x += 0.07), (g.w = 0.012);
      push(w.id, "glass", clipTower(g));
    }
    for (const w of edgeWalls(ROOF_OUTLINE, 0.15, TERRACE + H - 0.04, TERRACE + H, (i) => ({ id: `${id}-cap-${i}`, role: "railing", floor: 4 })))
      push(w.id, "railing", clipTower(w));
    return out;
  }
  // coping, 30 mm proud on the outside
  for (const w of edgeWalls(ROOF_OUTLINE, 0.21, TERRACE + H - 0.05, TERRACE + H, (i) => ({ id: `${id}-coping-${i}`, role: "roofEdge", floor: 4 }))) {
    const b = { ...w };
    if (w.side === "S") b.y -= 0.03;
    if (w.side === "W") b.x -= 0.03;
    if (w.side === "N" || w.side === "S") b.h += 0.03;
    else b.w += 0.03;
    push(w.id, "roofEdge", clipTower(b), w.side);
  }
  if (style === "band") {
    const depth = num(cfg.params, "bandDepth", 0.12);
    const drop = num(cfg.params, "bandDrop", 0.55);
    for (const w of edgeWalls(reversed(ROOF_OUTLINE), depth, TERRACE - drop, TERRACE + H - 0.05, (i) => ({ id: `${id}-band-${i}`, role: "roofEdge", floor: 4 })))
      push(w.id, "roofEdge", clipTower(w));
  }
  return out;
};

/** D8 Roof overhang: the roof slab projects beyond the walls, with a soffit underneath. */
export const roofOverhang: Gen = (id, cfg) => {
  const out: Part[] = [];
  const depth = num(cfg.params, "depth", 0.6);
  const t = num(cfg.params, "thickness", 0.2);
  const meta = { floor: 4, slot: "edge:terrace", element: id };
  for (const w of edgeWalls(reversed(ROOF_OUTLINE), depth, TERRACE - t, TERRACE, (i) => ({ id: `${id}-${i}`, role: "roofEdge", floor: 4 }))) {
    const b = clipTower(w);
    if (!b) continue;
    out.push(box(w.id, "roofEdge", b, meta));
    out.push(box(`${w.id}-soffit`, "soffit", { ...b, z0: TERRACE - t - 0.02, z1: TERRACE - t }, meta));
  }
  return out;
};

/** D9 Terrace pergola over the east part of the terrace. */
export const pergola: Gen = (id, cfg) => {
  const out: Part[] = [];
  const H = num(cfg.params, "height", 2.6);
  const spacing = num(cfg.params, "spacing", 0.45);
  const len = num(cfg.params, "length", 4.2);
  const x0 = X_CORE_E + 0.5;
  const x1 = X_E - 0.45;
  const y0 = Y_NOTCH + 0.45;
  const y1 = y0 + len;
  const z0 = TERRACE;
  const meta = { floor: 4, side: "roof" as const, slot: "terrace:pergola", element: id };
  const post = 0.15;
  for (const [k, x, y] of [
    ["a", x0, y0],
    ["b", x1 - post, y0],
    ["c", x0, y1 - post],
    ["d", x1 - post, y1 - post],
  ] as const)
    out.push(box(`${id}-post-${k}`, "pergola", { x, y, w: post, h: post, z0, z1: z0 + H }, meta));
  out.push(box(`${id}-beam-w`, "pergola", { x: x0 - 0.05, y: y0 - 0.2, w: 0.12, h: y1 - y0 + 0.4, z0: z0 + H, z1: z0 + H + 0.22 }, meta));
  out.push(box(`${id}-beam-e`, "pergola", { x: x1 - 0.07, y: y0 - 0.2, w: 0.12, h: y1 - y0 + 0.4, z0: z0 + H, z1: z0 + H + 0.22 }, meta));
  const n = Math.floor((y1 - y0 + 0.3) / spacing);
  for (let i = 0; i <= n; i++) {
    const y = y0 - 0.15 + i * spacing;
    out.push(box(`${id}-rafter-${i}`, "pergola", { x: x0 - 0.35, y, w: x1 - x0 + 0.7, h: 0.06, z0: z0 + H + 0.22, z1: z0 + H + 0.38 }, meta));
  }
  return out;
};

/** D7 Entrance canopy: over the ground-floor lobby door and / or the pedestrian gate. Styles: concrete, glass, woodPergola. */
export const canopy: Gen = (id, cfg) => {
  const out: Part[] = [];
  const style = str(cfg.params, "style", "concrete");
  const depth = num(cfg.params, "depth", 1.1);
  const roof = (key: string, b: Box, slot: string) => {
    const meta = { floor: 0, slot, element: id };
    if (style === "glass") {
      out.push(box(`${id}-${key}-glass`, "glass", { ...b, z0: b.z1 - 0.02 }, meta));
      out.push(box(`${id}-${key}-rail0`, "railing", { ...b, h: 0.05, z0: b.z1 - 0.08, z1: b.z1 - 0.02 }, meta));
      out.push(box(`${id}-${key}-rail1`, "railing", { ...b, y: b.y + b.h - 0.05, h: 0.05, z0: b.z1 - 0.08, z1: b.z1 - 0.02 }, meta));
    } else if (style === "woodPergola") {
      const n = Math.floor(b.w / 0.12);
      for (let i = 0; i <= n; i++) out.push(box(`${id}-${key}-slat-${i}`, "canopy", { ...b, x: b.x + i * ((b.w - 0.04) / n), w: 0.04, z0: b.z1 - 0.12 }, meta));
      out.push(box(`${id}-${key}-beam`, "canopy", { ...b, h: 0.08, z0: b.z1 - 0.2, z1: b.z1 - 0.12 }, meta));
    } else {
      out.push(box(`${id}-${key}-slab`, "canopy", b, meta));
      out.push(box(`${id}-${key}-soffit`, "soffit", { x: b.x + 0.02, y: b.y + 0.02, w: b.w - 0.04, h: b.h - 0.04, z0: b.z0 - 0.02, z1: b.z0 }, meta));
    }
  };
  for (const slot of cfg.slots ?? []) {
    if (slot === "entrance:lobby") roof("lobby", { ...faceBox("S", Y_TOWER_S, 1.0, 2.8, -depth, 0, PLINTH + 2.5, PLINTH + 2.62) }, slot);
    if (slot === "site:gate") {
      const g = GATES.pedestrian;
      const b = { x: g.a - 0.45, y: PLOT.y0 - 0.45, w: g.b - g.a + 0.9, h: 1.3, z0: 2.35, z1: 2.47 };
      roof("gate", b, slot);
      const meta = { floor: -1, slot, element: id };
      out.push(box(`${id}-gate-post0`, "railing", { x: g.a - 0.2, y: PLOT.y0 + 0.05, w: 0.08, h: 0.08, z0: 1.9, z1: 2.35 }, meta));
      out.push(box(`${id}-gate-post1`, "railing", { x: g.b + 0.12, y: PLOT.y0 + 0.05, w: 0.08, h: 0.08, z0: 1.9, z1: 2.35 }, meta));
    }
  }
  return out;
};

/** D6 Stone base: cladding on the bottom of the ground-floor core walls and sleeves on the parking columns. */
export const stoneBase: Gen = (id, cfg, ctx) => {
  const out: Part[] = [];
  const h = Math.min(num(cfg.params, "height", 0.6), level(1) - STILT_BAND - PLINTH - 0.1);
  const d = 0.025;
  const meta = { floor: 0, slot: "wall:plinth", element: id };
  COLUMNS.forEach(([x, y, w, hh], i) => out.push(box(`${id}-col-${i}`, "base", { x: x - d, y: y - d, w: w + 2 * d, h: hh + 2 * d, z0: PLINTH, z1: PLINTH + h }, meta)));
  // ground core: every outer face of CORE_OUTLINE (extended by d at both ends to close corners)
  const n = CORE_OUTLINE.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = CORE_OUTLINE[i];
    const [qx, qy] = CORE_OUTLINE[(i + 1) % n];
    const horiz = py === qy;
    const side = horiz ? (qx > px ? "S" : "N") : qy > py ? "E" : "W";
    const a = Math.min(horiz ? px : py, horiz ? qx : qy) - d;
    const b = Math.max(horiz ? px : py, horiz ? qx : qy) + d;
    out.push(...claddingLayer({ side, face: horiz ? py : px, a, b, z0: PLINTH, z1: PLINTH + h }, d, "base", `${id}-core-${i}`, "wall:plinth", ctx.openings, 0));
  }
  return out;
};
