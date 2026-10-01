/**
 * Site context for scale (toggled in the View tab, not part of a design): grey neighbour blocks, a parked car,
 * a 1.7 m person and two street lamps.
 */
import { GATES, PAVING, PLINTH, PLOT, X_WING, Y_NOTCH } from "./building";
import { box } from "./geom";
import type { Part } from "./types";

export type ContextOptions = { neighbours: boolean; car: boolean; person: boolean };

const ctx = (slot: string) => ({ floor: -1, slot, element: "context" });

function neighbours(): Part[] {
  const out: Part[] = [];
  const P = PLOT;
  // west and east plots: G+3 blocks with a setback; rear: G+2
  const blocks: [string, number, number, number, number, number][] = [
    ["w", P.x0 - 12.5, P.y0 + 3.0, P.x0 - 1.6, P.y1 - 1.2, 4],
    ["e", P.x1 + 1.6, P.y0 + 3.4, P.x1 + 12.0, P.y1 - 1.5, 4],
    ["n", P.x0 + 0.5, P.y1 + 1.8, P.x1 - 0.5, P.y1 + 12, 3],
  ];
  for (const [k, x0, y0, x1, y1, floors] of blocks) {
    const h = PLINTH + floors * 3.2;
    out.push(box(`ctx-nb-${k}`, "neighbor", { x: x0, y: y0, w: x1 - x0, h: y1 - y0, z0: 0, z1: h }, ctx("site:surroundings")));
    out.push(box(`ctx-nb-${k}-parapet`, "neighbor", { x: x0 - 0.05, y: y0 - 0.05, w: x1 - x0 + 0.1, h: y1 - y0 + 0.1, z0: h, z1: h + 0.9 }, ctx("site:surroundings")));
    // their compound walls on the road side
    out.push(box(`ctx-nb-${k}-wall`, "neighbor", { x: x0 - 1.2, y: k === "n" ? y0 - 1.2 : P.y0, w: x1 - x0 + 2.4, h: 0.2, z0: 0, z1: 1.5 }, ctx("site:surroundings")));
  }
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

/** Two street lamps on the footpath (lit at night). */
export const STREET_LAMPS: [number, number][] = [
  [PLOT.x0 + 0.8, PLOT.y0 - 1.7],
  [PLOT.x1 + 3.5, PLOT.y0 - 1.7],
];
export const LAMP_H = 6.5;
function lamps(): Part[] {
  const out: Part[] = [];
  STREET_LAMPS.forEach(([x, y], i) => {
    const m = ctx("site:road");
    out.push(box(`ctx-lamp-${i}-pole`, "railing", { x: x - 0.06, y: y - 0.06, w: 0.12, h: 0.12, z0: 0.1, z1: LAMP_H }, m));
    out.push(box(`ctx-lamp-${i}-arm`, "railing", { x: x - 0.04, y: y - 0.04, w: 0.08, h: 1.3, z0: LAMP_H - 0.08, z1: LAMP_H }, m));
    out.push(box(`ctx-lamp-${i}-head`, "railing", { x: x - 0.15, y: y + 1.0, w: 0.3, h: 0.5, z0: LAMP_H - 0.16, z1: LAMP_H - 0.04 }, { ...m, bevel: 0.03 }));
    out.push(box(`ctx-lamp-${i}-glow`, "lightGlow", { x: x - 0.12, y: y + 1.03, w: 0.24, h: 0.44, z0: LAMP_H - 0.17, z1: LAMP_H - 0.16 }, m));
  });
  return out;
}

export function contextParts(o: ContextOptions): Part[] {
  return [...lamps(), ...(o.neighbours ? neighbours() : []), ...(o.car ? car() : []), ...(o.person ? person() : [])];
}

