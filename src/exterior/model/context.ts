/**
 * Site context (toggled in the View tab, not part of a design): the real surroundings from the site photos,
 * a parked car, a 1.7 m person and the street lamps.
 */
import { FOOTPATH_W, GATES, PAVING, PLINTH, PLOT, SOUTH_ROAD, WEST_FOOTPATH, WEST_ROAD, X_WING, Y_NOTCH } from "./building";
import { box } from "./geom";
import type { Part, SurfaceRole } from "./types";

export type ContextOptions = {
  neighbours: boolean;
  car: boolean;
  person: boolean;
  /** Flat elevation views: leave out what stands between that camera and the building (across the main road / the side road). */
  clearView?: "S" | "W";
};

const ctx = (slot: string) => ({ floor: -1, slot, element: "context" });

/**
 * The real surroundings, from the site photos of 2026-10-02 (positions and heights estimated):
 * - across the side road (west): a blue-grey G+2 house with road-side balconies, a clay-tile porch roof and a solar frame
 * - next door (east): a cream G+3 building; behind (north): a cream G+2 house
 * - across the main road (south-east): a yellow G+2 building
 * - two coconut palms in the east neighbour's front yard; a big tree, a concrete electricity pole and overhead wires on the side road
 */
function neighbours(clear?: "S" | "W"): Part[] {
  const out: Part[] = [];
  const P = PLOT;
  const m = ctx("site:surroundings");
  const H = 3.1; // their floor to floor
  const block = (k: string, role: SurfaceRole, x0: number, y0: number, x1: number, y1: number, floors: number) => {
    const h = 0.45 + floors * H;
    out.push(box(`ctx-nb-${k}`, role, { x: x0, y: y0, w: x1 - x0, h: y1 - y0, z0: 0, z1: h }, m));
    out.push(box(`ctx-nb-${k}-parapet`, "neighborCream", { x: x0 - 0.05, y: y0 - 0.05, w: x1 - x0 + 0.1, h: y1 - y0 + 0.1, z0: h, z1: h + 0.9 }, m));
    return h;
  };
  /** Windows: dark glass set into a face, `n` per floor along [a, b]. side = which face (the glass sits just proud of it). */
  const windows = (k: string, side: "N" | "S" | "E" | "W", face: number, a: number, b: number, floors: number, n: number, w = 1.2) => {
    for (let f = 0; f < floors; f++)
      for (let i = 0; i < n; i++) {
        const c = a + ((i + 0.5) * (b - a)) / n;
        const z0 = 0.45 + f * H + 0.9;
        const d = side === "E" || side === "N" ? 0 : -0.04;
        const r = side === "E" || side === "W" ? { x: face + d, y: c - w / 2, w: 0.04, h: w } : { x: c - w / 2, y: face + d, w, h: 0.04 };
        out.push(box(`ctx-nb-${k}-${side}-win-${f}-${i}`, "glass", { ...r, z0, z1: z0 + 1.2 }, m));
        // white sill / chajja band above each window, as on the houses around
        const s = side === "E" || side === "W" ? { x: face + (side === "E" ? 0 : -0.35), y: c - w / 2 - 0.1, w: 0.35, h: w + 0.2 } : { x: c - w / 2 - 0.1, y: face + (side === "N" ? 0 : -0.35), w: w + 0.2, h: 0.35 };
        out.push(box(`ctx-nb-${k}-${side}-chajja-${f}-${i}`, "neighborCream", { ...s, z0: z0 + 1.3, z1: z0 + 1.38 }, m));
      }
  };

  // across the side road: blue-grey G+2 house facing the road (its east face)
  const wx1 = WEST_ROAD.x0 - FOOTPATH_W - 1.6;
  const wx0 = wx1 - 10.5;
  const wy0 = P.y0 + 0.5;
  const wy1 = P.y0 + 11.5;
  const wh = 0.45 + 3 * H;
  // across the side road: left out for the flat west elevation (it stands between that camera and the building)
  if (clear !== "W") {
    block("w", "neighborBlue", wx0, wy0, wx1, wy1, 3);
    windows("w", "E", wx1, wy0 + 5.5, wy1 - 0.5, 3, 2);
    for (const f of [1, 2]) {
      const z = 0.45 + f * H;
      out.push(box(`ctx-nb-w-bal-${f}`, "neighborCream", { x: wx1, y: wy0 + 0.8, w: 1.1, h: 4.2, z0: z - 0.15, z1: z }, m));
      out.push(box(`ctx-nb-w-balrail-${f}`, "neighborCream", { x: wx1 + 1.0, y: wy0 + 0.8, w: 0.1, h: 4.2, z0: z, z1: z + 0.9 }, m));
      out.push(box(`ctx-nb-w-baldoor-${f}`, "glass", { x: wx1, y: wy0 + 1.9, w: 0.04, h: 1.8, z0: z, z1: z + 2.1 }, m));
  }
  // clay-tile porch roof sloping down towards the road, over the ground-floor entrance
  out.push({ id: "ctx-nb-w-porch", kind: "prism", role: "neighborRoof", axis: "x", at: wy0 + 0.6, thickness: 4.6, profile: [[wx1, 3.0], [wx1 + 1.6, 2.55], [wx1 + 1.6, 2.65], [wx1, 3.1]], ...m });
  // solar panels on a steel frame on its roof, facing south
  out.push({ id: "ctx-nb-w-solar", kind: "prism", role: "solar", axis: "y", at: wx0 + 2.0, thickness: 5.0, profile: [[wy0 + 3.0, wh + 1.4], [wy0 + 5.0, wh + 2.2], [wy0 + 5.0, wh + 2.25], [wy0 + 3.0, wh + 1.45]], ...m });
  for (const [i, [x, y, z]] of ([
    [wx0 + 2.1, wy0 + 3.1, 1.4],
    [wx0 + 6.8, wy0 + 3.1, 1.4],
    [wx0 + 2.1, wy0 + 4.9, 2.2],
    [wx0 + 6.8, wy0 + 4.9, 2.2],
  ] as const).entries())
    out.push(box(`ctx-nb-w-solarleg-${i}`, "utility", { x: x - 0.03, y: y - 0.03, w: 0.06, h: 0.06, z0: wh, z1: wh + z }, m));
  out.push(box("ctx-nb-w-wall", "neighborCream", { x: wx1 + 1.1, y: wy0 - 0.6, w: 0.2, h: wy1 - wy0 + 1.2, z0: 0, z1: 1.5 }, m));
  out.push(...bigTree("t1", WEST_FOOTPATH.x0 + 1.0, P.y1 - 2.0));
  out.push(...poleAndWires());
  }

  // next door (east): cream G+3, windows towards us and the road
  const ex0 = P.x1 + 1.6;
  block("e", "neighborCream", ex0, P.y0 + 3.4, ex0 + 10.4, P.y1 - 1.5, 4);
  windows("e", "W", ex0, P.y0 + 4.2, P.y1 - 2.2, 4, 2, 0.9);
  windows("e", "S", P.y0 + 3.4, ex0 + 1, ex0 + 9.4, 4, 3);

  // behind (north): cream G+2 house
  block("n", "neighborCream", P.x0 + 0.5, P.y1 + 1.8, P.x1 - 0.5, P.y1 + 12, 3);
  windows("n", "S", P.y1 + 1.8, P.x0 + 1.5, P.x1 - 1.5, 3, 3);

  // across the main road, towards the east: yellow G+2
  const sy1 = SOUTH_ROAD.y0 - FOOTPATH_W - 2.0;
  if (clear !== "S") {
    block("s", "neighborYellow", P.x0 + 5.0, sy1 - 11, P.x1 + 9, sy1, 3);
    windows("s", "N", sy1, P.x0 + 6, P.x1 + 8, 3, 4);
  }

  // road-side compound wall of the east neighbour
  out.push(box("ctx-nb-e-wall", "neighborCream", { x: ex0 - 0.4, y: P.y0, w: 11, h: 0.2, z0: 0, z1: 1.5 }, m));

  out.push(...palm("p1", P.x1 + 1.2, P.y0 + 0.9, 10.5, 0.5));
  out.push(...palm("p2", P.x1 + 3.8, P.y0 + 2.2, 12.5, -0.4));
  return out;
}

/** A coconut palm: a slightly leaning trunk and a star of fronds at the top. */
function palm(id: string, x: number, y: number, h: number, lean: number): Part[] {
  const m = ctx("site:surroundings");
  const out: Part[] = [];
  out.push({ id: `ctx-${id}-trunk`, kind: "prism", role: "treeTrunk", axis: "x", at: y - 0.15, thickness: 0.3, profile: [[x - 0.17, 0], [x + 0.17, 0], [x + lean + 0.12, h], [x + lean - 0.12, h]], ...m });
  const tx = x + lean;
  const star = (k: string, z: number, R: number, rot: number, inner: number): Part => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const a = rot + (i * Math.PI) / 8;
      const r = i % 2 === 0 ? R : inner;
      pts.push([tx + r * Math.cos(a), y + r * Math.sin(a)]);
    }
    return { id: `ctx-${id}-${k}`, kind: "prism", role: "greenery", axis: "z", at: z, thickness: 0.08, profile: pts, ...m };
  };
  // layers widen then narrow downwards, so from the street the crown reads as drooping fronds
  out.push(star("fronds-a", h + 0.25, 1.4, 0.2, 0.45));
  out.push(star("fronds-b", h - 0.1, 2.4, 0.2 + Math.PI / 8, 0.55));
  out.push(star("fronds-c", h - 0.5, 3.0, 0.45, 0.6));
  out.push(star("fronds-d", h - 0.95, 2.7, 0.2 + Math.PI / 16, 0.5));
  out.push(star("fronds-e", h - 1.35, 1.9, 0.6, 0.4));
  out.push({ id: `ctx-${id}-nuts`, kind: "blob", role: "treeTrunk", x: tx, y, z: h - 0.4, r: 0.35, rz: 0.3, ...m });
  return out;
}

/** A big roadside tree (neem-like): trunk and a broad, layered crown. */
function bigTree(id: string, x: number, y: number): Part[] {
  const m = ctx("site:surroundings");
  return [
    box(`ctx-${id}-trunk`, "treeTrunk", { x: x - 0.2, y: y - 0.2, w: 0.4, h: 0.4, z0: 0.1, z1: 4.5 }, m),
    { id: `ctx-${id}-crown-a`, kind: "blob", role: "greenery", x, y, z: 6.2, r: 3.2, rz: 2.2, ...m },
    { id: `ctx-${id}-crown-b`, kind: "blob", role: "greenery", x: x + 1.2, y: y - 1.6, z: 5.2, r: 2.2, rz: 1.6, ...m },
    { id: `ctx-${id}-crown-c`, kind: "blob", role: "greenery", x: x - 1.0, y: y + 1.5, z: 7.4, r: 2.0, rz: 1.5, ...m },
  ];
}

/** Concrete electricity poles on the side road's footpath with three overhead wires running along it. */
function poleAndWires(): Part[] {
  const m = ctx("site:roadWest");
  const out: Part[] = [];
  const x = WEST_FOOTPATH.x0 + 0.35;
  const H = 9.0;
  const ys = [PLOT.y0 + 1.2 - 32, PLOT.y0 + 1.2, PLOT.y0 + 1.2 + 32];
  ys.forEach((y, i) => {
    out.push(box(`ctx-pole-${i}`, "neighbor", { x: x - 0.11, y: y - 0.09, w: 0.22, h: 0.18, z0: 0.1, z1: H }, m));
    out.push(box(`ctx-pole-${i}-arm`, "utility", { x: x - 0.8, y: y - 0.05, w: 1.6, h: 0.1, z0: H - 0.6, z1: H - 0.5 }, m));
  });
  for (const [k, dx, z] of [
    ["a", -0.7, H - 0.48],
    ["b", 0.7, H - 0.48],
    ["c", 0, H - 0.05],
  ] as const)
    out.push(box(`ctx-wire-${k}`, "utility", { x: x + dx - 0.01, y: ys[0], w: 0.02, h: ys[2] - ys[0], z0: z - 0.4, z1: z - 0.38 }, m));
  return out;
}

/** A hatchback parked under the building (like the red cars in image 28). */
function car(): Part[] {
  const out: Part[] = [];
  const x0 = X_WING + 1.0;
  const w = 1.72;
  const y0 = Y_NOTCH + 0.5;
  const L = 3.95;
  const z = PLINTH;
  const m = ctx("site:car");
  out.push(box("ctx-car-body", "carBody", { x: x0, y: y0, w, h: L, z0: z + 0.3, z1: z + 0.9 }, { ...m, bevel: 0.12 }));
  // cabin: trapezoid side profile (plan y, height), extruded across the width
  out.push({
    id: "ctx-car-cabin",
    kind: "prism",
    role: "glass",
    axis: "y",
    at: x0 + 0.08,
    thickness: w - 0.16,
    profile: [
      [y0 + 0.55, z + 0.9],
      [y0 + L - 0.3, z + 0.9],
      [y0 + L - 0.75, z + 1.45],
      [y0 + 1.25, z + 1.45],
    ],
    ...m,
  });
  out.push(box("ctx-car-roof", "carBody", { x: x0 + 0.12, y: y0 + 1.3, w: w - 0.24, h: L - 2.1, z0: z + 1.42, z1: z + 1.5 }, { ...m, bevel: 0.03 }));
  for (const [k, xx, yy] of [
    ["fl", x0 - 0.02, y0 + 0.65],
    ["fr", x0 + w - 0.2, y0 + 0.65],
    ["rl", x0 - 0.02, y0 + L - 1.25],
    ["rr", x0 + w - 0.2, y0 + L - 1.25],
  ] as const)
    out.push(box(`ctx-car-wheel-${k}`, "railing", { x: xx, y: yy, w: 0.22, h: 0.62, z0: z, z1: z + 0.62 }, { ...m, bevel: 0.1 }));
  out.push(box("ctx-car-lamp-l", "lightGlow", { x: x0 + 0.15, y: y0 - 0.01, w: 0.3, h: 0.02, z0: z + 0.7, z1: z + 0.8 }, m));
  out.push(box("ctx-car-lamp-r", "lightGlow", { x: x0 + w - 0.45, y: y0 - 0.01, w: 0.3, h: 0.02, z0: z + 0.7, z1: z + 0.8 }, m));
  return out;
}

/** A 1.7 m person standing inside the pedestrian gate. */
function person(): Part[] {
  const x = (GATES.pedestrian.a + GATES.pedestrian.b) / 2 + 0.6;
  const y = PLOT.y0 + 1.4;
  const g = PAVING;
  const m = ctx("site:person");
  return [
    box("ctx-person-leg-l", "person", { x: x - 0.17, y: y - 0.08, w: 0.14, h: 0.16, z0: g, z1: g + 0.86 }, { ...m, bevel: 0.05 }),
    box("ctx-person-leg-r", "person", { x: x + 0.03, y: y - 0.08, w: 0.14, h: 0.16, z0: g, z1: g + 0.86 }, { ...m, bevel: 0.05 }),
    box("ctx-person-torso", "carBody", { x: x - 0.21, y: y - 0.12, w: 0.42, h: 0.24, z0: g + 0.84, z1: g + 1.46 }, { ...m, bevel: 0.08 }),
    box("ctx-person-arm-l", "carBody", { x: x - 0.29, y: y - 0.06, w: 0.09, h: 0.12, z0: g + 0.82, z1: g + 1.42 }, { ...m, bevel: 0.04 }),
    box("ctx-person-arm-r", "carBody", { x: x + 0.2, y: y - 0.06, w: 0.09, h: 0.12, z0: g + 0.82, z1: g + 1.42 }, { ...m, bevel: 0.04 }),
    { id: "ctx-person-head", kind: "blob", role: "person", x, y, z: g + 1.58, r: 0.11, rz: 0.13, ...m },
  ];
}

/** Street lamps on the footpaths (lit at night): x, y, and the direction the arm reaches out over the road. */
export const STREET_LAMPS: [number, number, number, number][] = [
  [PLOT.x0 + 1.6, PLOT.y0 - 1.7, 0, -1],
  [PLOT.x1 + 3.5, PLOT.y0 - 1.7, 0, -1],
  [PLOT.x0 - 1.7, PLOT.y0 + 7.5, -1, 0],
];
export const LAMP_H = 6.5;
/** Where a lamp's light hangs: 1.25 m out along its arm. */
export const lampHead = ([x, y, dx, dy]: (typeof STREET_LAMPS)[number]): [number, number] => [x + dx * 1.25, y + dy * 1.25];
function lamps(): Part[] {
  const out: Part[] = [];
  STREET_LAMPS.forEach((l, i) => {
    const [x, y, dx] = l;
    const along = dx !== 0; // arm along x (west road) or along y (south road)
    const [hx, hy] = lampHead(l);
    const m = ctx(along ? "site:roadWest" : "site:road");
    out.push(box(`ctx-lamp-${i}-pole`, "railing", { x: x - 0.06, y: y - 0.06, w: 0.12, h: 0.12, z0: 0.1, z1: LAMP_H }, m));
    const ax0 = Math.min(x, hx) - 0.04;
    const ay0 = Math.min(y, hy) - 0.04;
    out.push(box(`ctx-lamp-${i}-arm`, "railing", { x: ax0, y: ay0, w: Math.abs(hx - x) + 0.08, h: Math.abs(hy - y) + 0.08, z0: LAMP_H - 0.08, z1: LAMP_H }, m));
    const [hw, hh] = along ? [0.5, 0.3] : [0.3, 0.5];
    out.push(box(`ctx-lamp-${i}-head`, "railing", { x: hx - hw / 2, y: hy - hh / 2, w: hw, h: hh, z0: LAMP_H - 0.16, z1: LAMP_H - 0.04 }, { ...m, bevel: 0.03 }));
    out.push(box(`ctx-lamp-${i}-glow`, "lightGlow", { x: hx - hw / 2 + 0.03, y: hy - hh / 2 + 0.03, w: hw - 0.06, h: hh - 0.06, z0: LAMP_H - 0.17, z1: LAMP_H - 0.16 }, m));
  });
  return out;
}

export function contextParts(o: ContextOptions): Part[] {
  return [...lamps(), ...(o.neighbours ? neighbours(o.clearView) : []), ...(o.car ? car() : []), ...(o.person ? person() : [])];
}

