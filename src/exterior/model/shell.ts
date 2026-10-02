/**
 * Building shell: plan.ts (read-only) + building facts → tagged parts.
 * Every part carries a surface role; styles are applied by role, never per mesh.
 */
import { CEILING_M, lobbyContext, openingBand, openings as planOpenings, rooms, stairContext } from "../../../plan/plan";
import {
  FOOTPATH_W,
  ROAD_W,
  SOUTH_FOOTPATH,
  SOUTH_ROAD,
  WEST_FOOTPATH,
  WEST_ROAD,
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

/**
 * How far the stilt columns stand back from the west and south faces: the first-floor slab overhangs them
 * (site photos 2026-10-02; depth estimated, the photos show the overhang but not its size).
 */
export const STILT_SETBACK = 0.75;

/** Stilt columns [assumed grid, west/south ones set back per the site]: x, y, w (along x), h (along y). The SW corner is the sloping column below. */
export const COLUMNS: [number, number, number, number][] = [
  [X_NOTCH_W - 0.3, Y_S_MASTER + STILT_SETBACK, 0.3, 0.45],
  [X_W + STILT_SETBACK, 3.4, 0.3, 0.45],
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

/**
 * The SW corner stands on one big sloping column (site photos 2026-10-02): a blade in the north–south plane, set back
 * from the west face, narrow (0.4 m) at its foot behind the corner and widening to 1.0 m where it meets the slab corner.
 */
export function cornerColumn(): Part {
  const z0 = PLINTH;
  const z1 = level(1) - STILT_BAND;
  const y = Y_S_MASTER;
  return {
    id: "F0-column-corner",
    kind: "prism",
    role: "column",
    axis: "y",
    at: X_W + 0.3,
    thickness: 0.35,
    profile: [
      [y + STILT_SETBACK, z0],
      [y + STILT_SETBACK + 0.4, z0],
      [y + 1.05, z1],
      [y + 0.05, z1],
    ],
    floor: 0,
    slot: "wall:columns",
  };
}

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
  "stair-b": "Staircase window (landing)",
  "lobby-door": "Building entrance door",
  "opt-win-master-s": "Master bedroom window (road side)",
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
/** Optional bigger changes (config/optional.json), all off unless switched on. */
export type OptionalChanges = Partial<Record<"widerBedroomWindows" | "kitchenBalconySlider" | "masterRoadWindow" | "tallerStairWindows", boolean>>;

export function facadeOpenings(opt: OptionalChanges = {}): FacadeOpening[] {
  const out: FacadeOpening[] = [];
  for (const o of planOpenings) {
    const sf = sideAndFace(o);
    if (!sf) continue;
    const band = { ...openingBand(o) };
    let a = o.rotationDeg === 0 ? o.y : o.x;
    let b = a + o.w;
    let type: FacadeOpening["type"] = o.type === "window" ? "window" : o.type === "doubleDoor" ? "doubleDoor" : "door";
    if (opt.widerBedroomWindows && (o.id === "win-master-w" || o.id === "win-kids-w")) {
      const c = (a + b) / 2;
      [a, b] = [c - 1.065, c + 1.065];
      band.sill = 0.6;
    }
    if (opt.kitchenBalconySlider && o.id === "kitchen-balcony") {
      b = a + 1.5;
      type = "doubleDoor";
    }
    if (opt.kitchenBalconySlider && o.id === "win-kitchen-s") band.sill = 0.9;
    for (const f of FLAT_FLOORS) {
      out.push({
        id: `F${f}-${o.id}`,
        planId: o.id,
        floor: f,
        type,
        side: sf.side,
        a,
        b,
        z0: level(f) + band.sill,
        z1: level(f) + band.head,
        face: sf.face,
        depth: E,
        label: PLAIN_LABEL[o.id] ?? o.id,
      });
    }
  }
  // Staircase: one window per floor on the west wall of the tower, at the half landing (site photos 2026-10-02)
  const sy = stairContext.y;
  for (let f = 0; f <= FLATS; f++) {
    const L = level(f);
    const half = (level(f + 1) - L) / 2;
    const add = (planId: string, a: number, b: number, z0: number, z1: number) =>
      out.push({ id: `F${f}-${planId}`, planId, floor: f, type: "window", side: "W", a, b, z0, z1, face: X_W, depth: E, label: PLAIN_LABEL[planId] });
    const tall = opt.tallerStairWindows ? 0.6 : 0;
    add("stair-b", sy + 1.25, sy + 1.95, L + half + 0.9 - tall / 2, L + half + 2.1 + tall / 2);
  }
  // Optional: a window in the blank road-side wall of the master bedroom
  if (opt.masterRoadWindow)
    for (const f of FLAT_FLOORS)
      out.push({
        id: `F${f}-opt-win-master-s`,
        planId: "opt-win-master-s",
        floor: f,
        type: "window",
        side: "S",
        a: 1.25,
        b: 2.45,
        z0: level(f) + 0.9,
        z1: level(f) + 2.1,
        face: Y_S_MASTER,
        depth: E,
        label: "Master bedroom window (road side)",
      });
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
    out.push(box(`${o.id}-sill`, "sill", faceBox(o.side, o.face, o.a - 0.05, o.b + 0.05, -0.05, GLASS_IN - 0.035, o.z0 - 0.03, o.z0), { floor: o.floor, side: o.side, slot: `win:${o.planId}`, bevel: 0.006 }));
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
    out.push(box(w.id, w.role, w.side === "W" ? southOfTower(w) : w, { floor: 0, side: w.side, slot: w.slot, bevel: 0.015 }));
  // Soffit under the first floor (seen from the parking)
  FOOTPRINT_RECTS.forEach((r, i) => out.push(box(`F0-soffit-${i}`, "soffit", { ...inset(r, 0.1), z0: L1 - SLAB - 0.02, z1: L1 - SLAB }, { floor: 0, side: "under", slot: "edge:parkingCeiling" })));

  for (const key of ["S", "N"] as const) {
    const b = BALCONY[key];
    const r = { x: b.x, y: b.y, w: b.x1 - b.x, h: b.y1 - b.y };
    for (const f of FLAT_FLOORS) {
      const L = level(f);
      out.push(box(`F${f}-balcony-${key}-slab`, "trim", { ...r, z0: L - 0.22, z1: L }, { floor: f, side: key, slot: `balcony:${key}`, bevel: 0.015 }));
      // drip groove under the slab, just behind the front edge
      const dy = key === "S" ? r.y + 0.04 : r.y + r.h - 0.055;
      out.push(box(`F${f}-balcony-${key}-drip`, "joint", { x: r.x + 0.05, y: dy, w: r.w - 0.1, h: 0.015, z0: L - 0.2415, z1: L - 0.24 }, { floor: f, side: "under", slot: `balcony:${key}` }));
      out.push(box(`F${f}-balcony-${key}-soffit`, "soffit", { x: r.x + 0.01, y: r.y + 0.01, w: r.w - 0.02, h: r.h - 0.02, z0: L - 0.24, z1: L - 0.22 }, { floor: f, side: "under", slot: `balcony:${key}` }));
    }
    // roof slab over the top balcony + its soffit
    out.push(box(`R-balcony-${key}-roof`, "trim", { ...r, z0: TERRACE - 0.22, z1: TERRACE }, { floor: 4, side: key, slot: `edge:balconyRoof-${key}`, bevel: 0.015 }));
    out.push(box(`R-balcony-${key}-soffit`, "soffit", { x: r.x + 0.01, y: r.y + 0.01, w: r.w - 0.02, h: r.h - 0.02, z0: TERRACE - 0.24, z1: TERRACE - 0.22 }, { floor: 3, side: "under", slot: `balcony:${key}` }));
  }

  // Terrace slab
  FOOTPRINT_RECTS.forEach((r, i) => out.push(box(`R-terrace-${i}`, "context", { ...inset(r, 0.1), z0: TERRACE - SLAB, z1: TERRACE + 0.02 }, { floor: 4, side: "roof", slot: "edge:terrace" })));
  // Terrace parapet: see the `parapet` element (style is part of the design).
  // Head-room roof slab + coping band
  out.push(box("R-head-roof", "roofEdge", { x: X_W - 0.05, y: LIFT_BOX.y - 0.05, w: X_CORE_E - X_W + 0.1, h: Y_STAIR_N - LIFT_BOX.y + 0.1, z0: TOP - 0.25, z1: TOP }, { floor: 4, side: "roof", slot: "wall:stairTower" }));

  // Stilt columns; their base sleeves come from the `stoneBase` element
  COLUMNS.forEach(([x, y, w, h], i) => out.push(box(`F0-column-${i}`, "column", { x, y, w, h, z0: PLINTH, z1: level(1) - STILT_BAND }, { floor: 0, slot: "wall:columns", bevel: 0.02 })));
  out.push(cornerColumn());
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
  out.push(box("site-context", "context", { x: P.x0 - 400, y: P.y0 - 400, w: P.x1 - P.x0 + 800, h: P.y1 - P.y0 + 800, z0: -0.12, z1: -0.06 }, { slot: "site:surroundings" }));
  const far = 400;
  // main road (south) and side road (west, the windows side) meeting at the south-west corner
  out.push(box("site-road", "road", { x: P.x0 - far, y: SOUTH_ROAD.y0, w: P.x1 - P.x0 + 2 * far, h: ROAD_W, z0: -0.07, z1: -0.02 }, { slot: "site:road" }));
  out.push(box("site-road-west", "road", { x: WEST_ROAD.x0, y: SOUTH_ROAD.y1, w: ROAD_W, h: P.y1 + far - SOUTH_ROAD.y1, z0: -0.07, z1: -0.02 }, { slot: "site:roadWest" }));
  // footpaths along the plot; the south one stops where the side road crosses it
  out.push(box("site-footpath", "paving", { x: WEST_FOOTPATH.x0, y: SOUTH_FOOTPATH.y0, w: P.x1 + far - WEST_FOOTPATH.x0, h: FOOTPATH_W, z0: -0.07, z1: 0.1 }, { slot: "site:road" }));
  out.push(box("site-footpath-sw", "paving", { x: P.x0 - far, y: SOUTH_FOOTPATH.y0, w: WEST_ROAD.x0 - (P.x0 - far), h: FOOTPATH_W, z0: -0.07, z1: 0.1 }, { slot: "site:road" }));
  out.push(box("site-footpath-west", "paving", { x: WEST_FOOTPATH.x0, y: P.y0, w: FOOTPATH_W, h: P.y1 + far - P.y0, z0: -0.07, z1: 0.1 }, { slot: "site:roadWest" }));
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

/** V-groove joint lines in the plaster at each floor line (main walls and the stair tower). */
function jointParts(): Part[] {
  const out: Part[] = [];
  const line = (id: string, side: "N" | "S" | "E" | "W", face: number, a: number, b: number, z: number, slot: string, floor: number) =>
    out.push(box(id, "joint", faceBox(side, face, a, b, -0.003, 0, z - 0.006, z + 0.006), { floor, side, slot }));
  for (let f = 2; f <= FLATS; f++) {
    const z = level(f);
    line(`F${f}-joint-w`, "W", X_W, Y_S_MASTER + 0.01, Y_TOWER_S - 0.01, z, "wall:west", f);
    line(`F${f}-joint-s`, "S", Y_S_MASTER, X_W + 0.01, X_NOTCH_W - 0.01, z, "wall:frontName", f);
    line(`F${f}-joint-e`, "E", X_E, Y_NOTCH + 0.01, Y_LIVING_N - 0.01, z, "wall:east", f);
  }
  for (let f = 1; f <= FLATS + 1; f++) {
    const z = level(f);
    line(`F${f}-joint-tw`, "W", X_W, Y_TOWER_S + 0.01, Y_STAIR_N - 0.01, z, "wall:stairTower", f);
    line(`F${f}-joint-tn`, "N", Y_STAIR_N, X_W + 0.01, X_CORE_E - 0.01, z, "wall:stairTower", f);
  }
  return out;
}

export function buildShell(opt: OptionalChanges = {}): Shell {
  const openings = facadeOpenings(opt);
  const parts: Part[] = [];
  for (const w of facadeWalls()) parts.push(...splitWall(w, openings));
  for (const o of openings) parts.push(...openingParts(o));
  parts.push(...slabParts(), ...interiorParts(), ...siteParts(), ...jointParts());
  return { parts, openings };
}

/** Plain-language name for a side. */
export const sideName = (s?: Side) =>
  s ? ({ N: "north (rear)", S: "south (road side)", E: "east", W: "west", roof: "roof", under: "underside" } as const)[s] : "";

export type { BoxPart };
