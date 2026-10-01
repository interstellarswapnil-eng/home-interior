/**
 * Building shell: plan.ts (read-only) + building facts → tagged parts.
 * Every part carries a surface role; styles are applied by role, never per mesh.
 */
import { CEILING_M, lobbyContext, openingBand, openings as planOpenings, rooms, stairContext } from "../../../plan/plan";
import {
  BALCONY,
  CORE_OUTLINE,
  EXT_WALL,
  FLATS,
  FLOOR_FTF,
  LIFT_BOX,
  OUTLINE,
  PAVING,
  PLINTH,
  PLOT,
  SLAB,
  STILT_BAND,
  TERRACE,
  TOP,
  X_CORE_E,
  X_E,
  X_NOTCH_W,
  X_W,
  X_WING,
  Y_LIVING_N,
  Y_NOTCH,
  Y_S_MASTER,
  Y_STAIR_N,
  Y_TOWER_S,
  level,
} from "./building";
import { box, edgeWalls, faceBox, splitWall, type WallSpec } from "./geom";
import type { BoxPart, FacadeOpening, Part, Side } from "./types";

const E = EXT_WALL;

/** Keep only the part of a west-edge box that is south of the stair tower. */
const southOfTower = <T extends { x: number; y: number; h: number }>(w: T): T =>
  Math.abs(w.x - X_W) > 0.01 ? w : { ...w, h: Math.min(w.y + w.h, Y_TOWER_S) - w.y };
const FLAT_FLOORS = Array.from({ length: FLATS }, (_, i) => i + 1);

/** Stilt columns [assumed grid]: x, y, w (along x), h (along y). */
export const COLUMNS: [number, number, number, number][] = [
  [X_W, Y_S_MASTER, 0.3, 0.45],
  [X_NOTCH_W - 0.3, Y_S_MASTER, 0.3, 0.45],
  [X_W, 3.4, 0.3, 0.45],
  [X_NOTCH_W - 0.3, 3.4, 0.3, 0.45],
  [X_WING, Y_NOTCH, 0.3, 0.45],
  [7.7, Y_NOTCH, 0.3, 0.45],
  [X_E - 0.3, Y_NOTCH, 0.3, 0.45],
  [X_E - 0.3, 4.6, 0.3, 0.45],
  [X_CORE_E, 4.6, 0.3, 0.45],
  [X_E - 0.3, Y_LIVING_N - 0.45, 0.3, 0.45],
  [7.7, Y_LIVING_N - 0.45, 0.3, 0.45],
];

const inset = (r: { x: number; y: number; w: number; h: number }, d: number) => ({ x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d });

/** Footprint rectangles of the flats (no balconies). */
export const FOOTPRINT_RECTS = [
  { x: X_W, y: Y_S_MASTER, w: X_NOTCH_W - X_W, h: Y_STAIR_N - Y_S_MASTER },
  { x: X_NOTCH_W, y: Y_NOTCH, w: X_CORE_E - X_NOTCH_W, h: Y_STAIR_N - Y_NOTCH },
  { x: X_CORE_E, y: Y_NOTCH, w: X_E - X_CORE_E, h: Y_LIVING_N - Y_NOTCH },
];

const PLAIN_LABEL: Record<string, string> = {
  "win-master-w": "Master bedroom window",
  "win-mbath-w": "Master bath ventilator",
  "win-kids-w": "Kids bedroom window",
  "win-living-e": "Living room window",
  "win-kitchen-e": "Kitchen window (east)",
  "win-kitchen-s": "Kitchen window (onto balcony)",
  "win-gbath-s": "Guest bath ventilator",
  "kitchen-balcony": "Kitchen balcony door",
  "living-balcony": "Living balcony door",
  "stair-a": "Staircase window (lower)",
  "stair-b": "Staircase window (upper)",
  "lobby-door": "Building entrance door",
};

// ---------------------------------------------------------------------------
// Openings
// ---------------------------------------------------------------------------
function sideAndFace(o: (typeof planOpenings)[number]): { side: "N" | "S" | "E" | "W"; face: number } | null {
  const ns = o.rotationDeg === 90 || o.rotationDeg === 270;
  if (!ns) {
    if (Math.abs(o.x - 0) < 0.02) return { side: "W", face: X_W };
    if (Math.abs(o.x - (X_E - E)) < 0.02) return { side: "E", face: X_E };
    return null;
  }
  if (Math.abs(o.y - (Y_NOTCH + E)) < 0.02) return { side: "S", face: Y_NOTCH };
  if (Math.abs(o.y - (Y_LIVING_N - E)) < 0.02) return { side: "N", face: Y_LIVING_N };
  return null;
}

/** All facade openings: plan windows/doors on the outer walls × 3 floors, stair windows, ground entrance. */
export function facadeOpenings(): FacadeOpening[] {
  const out: FacadeOpening[] = [];
  for (const o of planOpenings) {
    const sf = sideAndFace(o);
    if (!sf) continue;
    const band = openingBand(o);
    for (const f of FLAT_FLOORS) {
      out.push({
        id: `F${f}-${o.id}`,
        planId: o.id,
        floor: f,
        type: o.type === "window" ? "window" : o.type === "doubleDoor" ? "doubleDoor" : "door",
        side: sf.side,
        a: o.rotationDeg === 0 ? o.y : o.x,
        b: (o.rotationDeg === 0 ? o.y : o.x) + o.w,
        z0: level(f) + band.sill,
        z1: level(f) + band.head,
        face: sf.face,
        depth: E,
        label: PLAIN_LABEL[o.id] ?? o.id,
      });
    }
  }
  // Staircase: two staggered windows per floor on the west wall of the tower [assumed from #28]
  const sy = stairContext.y;
  for (let f = 0; f <= FLATS; f++) {
    const L = level(f);
    const half = (level(f + 1) - L) / 2;
    const add = (planId: string, a: number, b: number, z0: number, z1: number) =>
      out.push({ id: `F${f}-${planId}`, planId, floor: f, type: "window", side: "W", a, b, z0, z1, face: X_W, depth: E, label: PLAIN_LABEL[planId] });
    add("stair-a", sy + 0.25, sy + 0.95, L + 1.0, L + 2.2);
    add("stair-b", sy + 1.25, sy + 1.95, L + half + 0.9, L + half + 2.1);
  }
  // Ground-floor entrance into the stair / lift lobby, from the parking (south face of the tower)
  out.push({
    id: "F0-lobby-door",
    planId: "lobby-door",
    floor: 0,
    type: "doubleDoor",
    side: "S",
    a: 1.3,
    b: 2.5,
    z0: PLINTH,
    z1: PLINTH + 2.4,
    face: Y_TOWER_S,
    depth: E,
    label: PLAIN_LABEL["lobby-door"],
  });
  return out;
}

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------
function facadeWalls(): WallSpec[] {
  const walls: WallSpec[] = [];
  const zTowerBase = level(1) - STILT_BAND;
  for (const f of FLAT_FLOORS) {
    const z0 = level(f);
    const z1 = z0 + FLOOR_FTF;
    const w = (id: string, r: Omit<WallSpec, "id" | "z0" | "z1" | "floor">) => walls.push({ id: `F${f}-${id}`, z0, z1, floor: f, ...r });
    w("wall-w", { x: X_W, y: Y_S_MASTER, w: E, h: Y_TOWER_S - Y_S_MASTER, side: "W", role: "mainWall", slot: "wall:west" });
    w("wall-s-master", { x: X_W + E, y: Y_S_MASTER, w: X_NOTCH_W - X_W - E, h: E, side: "S", role: "mainWall", slot: "wall:frontName" });
    w("wall-notch-side", { x: X_NOTCH_W - E, y: Y_S_MASTER + E, w: E, h: Y_NOTCH - Y_S_MASTER - E, side: "E", role: "featureWall", slot: "wall:featureRecess" });
    w("wall-notch-back", { x: X_NOTCH_W - E, y: Y_NOTCH, w: X_WING - (X_NOTCH_W - E), h: E, side: "S", role: "featureWall", slot: "wall:featureRecess" });
    w("wall-s-wing", { x: X_WING, y: Y_NOTCH, w: X_E - X_WING, h: E, side: "S", role: "secondSurface", slot: "wall:balconyBack-S" });
    w("wall-e", { x: X_E - E, y: Y_NOTCH + E, w: E, h: Y_LIVING_N - Y_NOTCH - E, side: "E", role: "mainWall", slot: "wall:east" });
    w("wall-n-living", { x: X_CORE_E - 0.155, y: Y_LIVING_N - E, w: X_E - E - (X_CORE_E - 0.155), h: E, side: "N", role: "secondSurface", slot: "wall:balconyBack-N" });
  }
  // Stair tower: continuous from the ground to the terrace (no floor bands), slightly different colour in #28
  walls.push({ id: "tower-w", x: X_W, y: Y_TOWER_S, w: E, h: Y_STAIR_N - Y_TOWER_S, z0: PLINTH, z1: TERRACE, side: "W", role: "secondSurface", slot: "wall:stairTower", floor: 0 });
  walls.push({ id: "tower-n", x: X_W + E, y: Y_STAIR_N - E, w: X_CORE_E - X_W - E, h: E, z0: PLINTH, z1: TERRACE, side: "N", role: "secondSurface", slot: "wall:stairTower", floor: 0 });
  walls.push({ id: "tower-e", x: X_CORE_E - 0.155, y: Y_LIVING_N, w: 0.155, h: Y_STAIR_N - E - Y_LIVING_N, z0: zTowerBase, z1: TERRACE, side: "E", role: "secondSurface", slot: "wall:stairTower", floor: 0 });

  // Ground: enclosed stair / lift lobby (west + north edges are the tower walls above)
  for (const w of edgeWalls(CORE_OUTLINE, E, PLINTH, zTowerBase, (i) =>
    i <= 3 ? { id: `F0-core-${i}`, role: "mainWall", slot: i === 0 ? "entrance:lobby" : "wall:groundCore", floor: 0 } : null,
  )) {
    // the tower's west wall owns the SW corner of the core
    if (w.id === "F0-core-0") Object.assign(w, { x: w.x + E, w: w.w - E });
    walls.push(w);
  }
  // Above the terrace: stair head room + lift machine room
  walls.push(...edgeWalls(CORE_OUTLINE, E, TERRACE, TOP - 0.25, (i) => ({ id: `R-head-${i}`, role: "secondSurface", slot: "wall:stairTower", floor: 4 })));
  return walls;
}

// ---------------------------------------------------------------------------
// Windows, doors: frames, glass, sills, leaves
// ---------------------------------------------------------------------------
const FRAME = 0.05;
const GLASS_IN = 0.08; // glass plane distance behind the outer face

function openingParts(o: FacadeOpening): Part[] {
  const out: Part[] = [];
  const f = (id: string, role: Parameters<typeof box>[1], b: ReturnType<typeof faceBox>) =>
    out.push(box(`${o.id}-${id}`, role, b, { floor: o.floor, side: o.side, slot: `win:${o.planId}` }));
  const d0 = GLASS_IN - 0.035;
  const d1 = GLASS_IN + 0.035;
  // frame
  f("frame-l", "windowFrame", faceBox(o.side, o.face, o.a, o.a + FRAME, d0, d1, o.z0, o.z1));
  f("frame-r", "windowFrame", faceBox(o.side, o.face, o.b - FRAME, o.b, d0, d1, o.z0, o.z1));
  f("frame-t", "windowFrame", faceBox(o.side, o.face, o.a + FRAME, o.b - FRAME, d0, d1, o.z1 - FRAME, o.z1));
  f("frame-b", "windowFrame", faceBox(o.side, o.face, o.a + FRAME, o.b - FRAME, d0, d1, o.z0, o.z0 + FRAME));
  const width = o.b - o.a;
  const mid = (o.a + o.b) / 2;
  if (width > 1.2 || o.type === "doubleDoor") f("frame-m", "windowFrame", faceBox(o.side, o.face, mid - FRAME / 2, mid + FRAME / 2, d0, d1, o.z0 + FRAME, o.z1 - FRAME));
  const inner = (role: "glass" | "door", id: string) =>
    f(id, role, faceBox(o.side, o.face, o.a + FRAME, o.b - FRAME, GLASS_IN - (role === "door" ? 0.02 : 0.006), GLASS_IN + (role === "door" ? 0.02 : 0.006), o.z0 + FRAME, o.z1 - FRAME));
  if (o.type === "door" && o.planId !== "lobby-door") inner("door", "leaf");
  else inner("glass", "glass");
  if (o.type === "window") {
    // projecting sill with a drip edge
    f("sill", "sill", faceBox(o.side, o.face, o.a - 0.05, o.b + 0.05, -0.05, GLASS_IN - 0.035, o.z0 - 0.03, o.z0));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Slabs, balconies, roof, stilts
// ---------------------------------------------------------------------------
function slabParts(): Part[] {
  const out: Part[] = [];
  const L1 = level(1);
  // Stilt band (beam + slab edge) around the building at the first floor
  // (not across the stair tower, which runs down to the ground: OUTLINE edges 5, 6 and the tower part of 7)
  for (const w of edgeWalls(OUTLINE, 0.25, L1 - STILT_BAND, L1, (i) => (i === 5 || i === 6 ? null : { id: `F0-stiltband-${i}`, role: "trim", slot: "edge:stiltBand", floor: 0 })))
    out.push(box(w.id, w.role, w.side === "W" ? southOfTower(w) : w, { floor: 0, side: w.side, slot: w.slot }));
  // Soffit under the first floor (seen from the parking)
  FOOTPRINT_RECTS.forEach((r, i) => out.push(box(`F0-soffit-${i}`, "soffit", { ...inset(r, 0.1), z0: L1 - SLAB - 0.02, z1: L1 - SLAB }, { floor: 0, side: "under", slot: "edge:parkingCeiling" })));

  for (const key of ["S", "N"] as const) {
    const b = BALCONY[key];
    const r = { x: b.x, y: b.y, w: b.x1 - b.x, h: b.y1 - b.y };
    for (const f of FLAT_FLOORS) {
      const L = level(f);
      out.push(box(`F${f}-balcony-${key}-slab`, "trim", { ...r, z0: L - 0.22, z1: L }, { floor: f, side: key, slot: `balcony:${key}` }));
      out.push(box(`F${f}-balcony-${key}-soffit`, "soffit", { x: r.x + 0.01, y: r.y + 0.01, w: r.w - 0.02, h: r.h - 0.02, z0: L - 0.24, z1: L - 0.22 }, { floor: f, side: "under", slot: `balcony:${key}` }));
    }
    // roof slab over the top balcony + its soffit
    out.push(box(`R-balcony-${key}-roof`, "trim", { ...r, z0: TERRACE - 0.22, z1: TERRACE }, { floor: 4, side: key, slot: `edge:balconyRoof-${key}` }));
    out.push(box(`R-balcony-${key}-soffit`, "soffit", { x: r.x + 0.01, y: r.y + 0.01, w: r.w - 0.02, h: r.h - 0.02, z0: TERRACE - 0.24, z1: TERRACE - 0.22 }, { floor: 3, side: "under", slot: `balcony:${key}` }));
  }

  // Terrace slab
  FOOTPRINT_RECTS.forEach((r, i) => out.push(box(`R-terrace-${i}`, "context", { ...inset(r, 0.1), z0: TERRACE - SLAB, z1: TERRACE + 0.02 }, { floor: 4, side: "roof", slot: "edge:terrace" })));
  // Terrace parapet: see the `parapet` element (style is part of the design).
  // Head-room roof slab + coping band
  out.push(box("R-head-roof", "roofEdge", { x: X_W - 0.05, y: LIFT_BOX.y - 0.05, w: X_CORE_E - X_W + 0.1, h: Y_STAIR_N - LIFT_BOX.y + 0.1, z0: TOP - 0.25, z1: TOP }, { floor: 4, side: "roof", slot: "wall:stairTower" }));

  // Stilt columns; their base sleeves come from the `stoneBase` element
  COLUMNS.forEach(([x, y, w, h], i) => out.push(box(`F0-column-${i}`, "column", { x, y, w, h, z0: PLINTH, z1: level(1) - STILT_BAND }, { floor: 0, slot: "wall:columns" })));
  return out;
}

/** Dark room volumes behind the glass (and the warm glow at night). */
function interiorParts(): Part[] {
  const out: Part[] = [];
  const inside = rooms.filter((r) => r.id !== "kitchenBalcony" && r.id !== "livingBalcony");
  for (const f of FLAT_FLOORS)
    for (const r of inside) out.push(box(`F${f}-room-${r.id}`, "interior", { x: r.x, y: r.y, w: r.w, h: r.h, z0: level(f), z1: level(f) + CEILING_M }, { floor: f }));
  for (const c of [stairContext, lobbyContext])
    out.push(box(`core-${c.label}`, "interior", { x: c.x, y: c.y, w: c.w, h: c.h, z0: PLINTH, z1: TOP - 0.3 }, { floor: 0 }));
  return out;
}

// ---------------------------------------------------------------------------
// Site
// ---------------------------------------------------------------------------
function siteParts(): Part[] {
  const out: Part[] = [];
  const P = PLOT;
  out.push(box("site-context", "context", { x: P.x0 - 40, y: P.y0 - 40, w: P.x1 - P.x0 + 80, h: P.y1 - P.y0 + 80, z0: -0.12, z1: -0.06 }, { slot: "site:surroundings" }));
  out.push(box("site-road", "road", { x: P.x0 - 40, y: P.y0 - 9.5, w: P.x1 - P.x0 + 80, h: 7.5, z0: -0.07, z1: -0.02 }, { slot: "site:road" }));
  out.push(box("site-footpath", "paving", { x: P.x0 - 40, y: P.y0 - 2.0, w: P.x1 - P.x0 + 80, h: 2.0, z0: -0.07, z1: 0.1 }, { slot: "site:road" }));
  out.push(box("site-paving", "paving", { x: P.x0, y: P.y0, w: P.x1 - P.x0, h: P.y1 - P.y0, z0: -0.07, z1: PAVING }, { slot: "site:driveway" }));
  // Garden strips on the sides and rear
  const g = (id: string, x0: number, y0: number, x1: number, y1: number) =>
    out.push(box(`site-garden-${id}`, "ground", { x: x0, y: y0, w: x1 - x0, h: y1 - y0, z0: PAVING, z1: PAVING + 0.04 }, { slot: "site:garden" }));
  g("w", P.x0 + 0.23, Y_S_MASTER + 0.6, X_W - 0.35, P.y1 - 0.23);
  g("e", X_E + 0.35, Y_NOTCH + 0.6, P.x1 - 0.23, P.y1 - 0.23);
  g("n", X_W - 0.35, Y_STAIR_N + 0.35, X_E + 0.35, P.y1 - 0.23);
  g("front", P.x0 + 0.23, P.y0 + 0.23, X_NOTCH_W - 0.6, P.y0 + 0.9);
  // Raised stilt floor + ramp up from the paving
  FOOTPRINT_RECTS.forEach((r, i) => {
    out.push(box(`F0-plinth-${i}`, "base", { ...r, z0: PAVING - 0.01, z1: PLINTH - 0.01 }, { floor: 0, side: "S", slot: "wall:plinth" }));
    out.push(box(`F0-floor-${i}`, "paving", { ...r, z0: PLINTH - 0.01, z1: PLINTH }, { floor: 0, slot: "site:driveway" }));
  });
  out.push({
    id: "F0-ramp",
    kind: "prism",
    role: "paving",
    floor: 0,
    slot: "site:driveway",
    axis: "y",
    at: X_WING,
    thickness: X_E - X_WING,
    profile: [
      [Y_NOTCH - 1.2, PAVING],
      [Y_NOTCH, PAVING],
      [Y_NOTCH, PLINTH],
    ],
  });
  return out;
}

// ---------------------------------------------------------------------------
export type Shell = { parts: Part[]; openings: FacadeOpening[] };

export function buildShell(): Shell {
  const openings = facadeOpenings();
  const parts: Part[] = [];
  for (const w of facadeWalls()) parts.push(...splitWall(w, openings));
  for (const o of openings) parts.push(...openingParts(o));
  parts.push(...slabParts(), ...interiorParts(), ...siteParts());
  return { parts, openings };
}

/** Plain-language name for a side. */
export const sideName = (s?: Side) =>
  s ? ({ N: "north (rear)", S: "south (road side)", E: "east", W: "west", roof: "roof", under: "underside" } as const)[s] : "";

export type { BoxPart };
