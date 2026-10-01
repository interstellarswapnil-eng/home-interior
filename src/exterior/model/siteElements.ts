/** Site and finishing elements: facade lighting (D14), main door (D15), landscaping (D17), solar (D18), rounded frames (D12). */
import {
  BALCONY,
  COMPOUND_H,
  GATES,
  PAVING,
  PLOT,
  STILT_BAND,
  TERRACE,
  X_E,
  X_NOTCH_W,
  X_W,
  X_WING,
  Y_NOTCH,
  Y_S_MASTER,
  Y_STAIR_N,
  Y_TOWER_S,
  level,
} from "./building";
import { box, faceBox } from "./geom";
import { FLOORS, num, str, type Gen } from "./elementUtil";
import type { FacadeOpening, Part, PrismPart } from "./types";

// ---------------------------------------------------------------------------
// D12 Rounded / arched frame outlines (used by boxFrames when roundedCorners is on)
// ---------------------------------------------------------------------------
/** Outline of a rectangle (u0..u1 × z0..z1) with rounded corners, or a round arch on top. */
export function softRect(u0: number, z0: number, u1: number, z1: number, r: number, arch: boolean): [number, number][] {
  const pts: [number, number][] = [];
  const seg = 8;
  const arc = (cu: number, cz: number, rad: number, a0: number, a1: number) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + ((a1 - a0) * i) / seg;
      pts.push([cu + rad * Math.cos(a), cz + rad * Math.sin(a)]);
    }
  };
  const rr = Math.max(0.001, Math.min(r, (u1 - u0) / 2 - 0.001, (z1 - z0) / 2 - 0.001));
  arc(u0 + rr, z0 + rr, rr, Math.PI, 1.5 * Math.PI); // bottom-left
  arc(u1 - rr, z0 + rr, rr, 1.5 * Math.PI, 2 * Math.PI); // bottom-right
  if (arch) {
    const half = (u1 - u0) / 2;
    const zc = Math.max(z0 + rr + 0.01, z1 - half);
    for (let i = 0; i <= 2 * seg; i++) {
      const a = (Math.PI * i) / (2 * seg);
      pts.push([u0 + half + half * Math.cos(a), zc + half * Math.sin(a)]);
    }
  } else {
    arc(u1 - rr, z1 - rr, rr, 0, 0.5 * Math.PI); // top-right
    arc(u0 + rr, z1 - rr, rr, 0.5 * Math.PI, Math.PI); // top-left
  }
  return pts;
}

/** A frame ring (outer soft rect with the window hole) standing out from a facade. */
export function softFrame(o: FacadeOpening, width: number, depth: number, r: number, arch: boolean): Omit<PrismPart, "id" | "role" | "floor"> {
  const outer = softRect(o.a - width, o.z0 - width - 0.03, o.b + width, o.z1 + width + (arch ? (o.b - o.a) / 4 : 0), r + width, arch);
  const hole = softRect(o.a, o.z0 - 0.03, o.b, o.z1 + (arch ? (o.b - o.a) / 4 : 0), r, arch);
  const ns = o.side === "N" || o.side === "S";
  const at = o.side === "S" || o.side === "W" ? o.face - depth : o.face;
  return { kind: "prism", profile: outer, holes: [hole.reverse()], axis: ns ? "x" : "y", at, thickness: depth - 0.002 };
}

// ---------------------------------------------------------------------------
/** D14 Facade lighting fixtures. The glowing faces use the `lightGlow` role (lit in night mode). */
export const lighting: Gen = (id, cfg) => {
  const out: Part[] = [];
  const meta = (slot: string, floor: number, side?: Part["side"]) => ({ floor, side, slot, element: id });
  for (const slot of cfg.slots ?? []) {
    if (slot === "wall:frontName") {
      // up/down wall sconces, two per floor on the road-facing wall
      for (const f of FLOORS)
        for (const [k, x] of [
          ["a", X_W + 0.7],
          ["b", X_NOTCH_W - 0.7],
        ] as const) {
          const z = level(f) + 1.9;
          out.push(box(`${id}-sconce-${f}${k}`, "railing", faceBox("S", Y_S_MASTER, x - 0.05, x + 0.05, -0.1, 0, z - 0.14, z + 0.14), meta(slot, f, "S")));
          out.push(box(`${id}-sconce-${f}${k}-up`, "lightGlow", faceBox("S", Y_S_MASTER, x - 0.04, x + 0.04, -0.09, -0.01, z + 0.14, z + 0.15), meta(slot, f, "S")));
          out.push(box(`${id}-sconce-${f}${k}-dn`, "lightGlow", faceBox("S", Y_S_MASTER, x - 0.04, x + 0.04, -0.09, -0.01, z - 0.15, z - 0.14), meta(slot, f, "S")));
        }
    } else if (slot === "wall:featureRecess") {
      // a vertical LED groove at the corner of the recess, full height (image 25)
      out.push(box(`${id}-groove`, "lightGlow", faceBox("S", Y_S_MASTER, X_NOTCH_W - 0.06, X_NOTCH_W - 0.03, -0.006, 0.0, level(1), TERRACE), meta(slot, 1, "S")));
    } else if (slot === "balcony:S" || slot === "balcony:N") {
      // cove LED under each balcony slab, just inside the front edge
      const key = slot.endsWith("N") ? "N" : "S";
      const b = BALCONY[key];
      const y = key === "S" ? b.y + 0.15 : b.y1 - 0.18;
      for (const f of [...FLOORS.slice(1), 4]) {
        const z = f === 4 ? TERRACE - 0.245 : level(f) - 0.245;
        out.push(box(`${id}-cove-${key}-${f}`, "lightGlow", { x: b.x + 0.25, y, w: b.x1 - b.x - 0.5, h: 0.03, z0: z - 0.01, z1: z }, meta(slot, f - 1, "under")));
      }
    } else if (slot === "edge:stiltBand") {
      out.push(box(`${id}-band`, "lightGlow", { x: X_WING + 0.2, y: Y_NOTCH + 0.02, w: X_E - X_WING - 0.4, h: 0.03, z0: level(1) - STILT_BAND - 0.012, z1: level(1) - STILT_BAND - 0.002 }, meta(slot, 0, "under")));
    } else if (slot === "site:compoundFront") {
      // a small light on top of the front wall pilasters
      const n = 6;
      for (let i = 0; i < n; i++) {
        const x = PLOT.x0 + 0.4 + (i * (GATES.pedestrian.a - 0.8 - PLOT.x0)) / (n - 1);
        out.push(box(`${id}-pil-${i}`, "lightGlow", { x: x - 0.06, y: PLOT.y0 + 0.07, w: 0.12, h: 0.09, z0: COMPOUND_H + 0.06, z1: COMPOUND_H + 0.1 }, meta(slot, -1)));
      }
    } else if (slot === "site:gate") {
      // uplights in the paving in front of the gate pillars
      for (const [k, x] of [
        ["p1", GATES.pedestrian.a - 0.12],
        ["p2", GATES.pedestrian.b + 0.12],
        ["p3", GATES.vehicle.a - 0.12],
        ["p4", GATES.vehicle.b + 0.12],
      ] as const)
        out.push(box(`${id}-up-${k}`, "lightGlow", { x: x - 0.05, y: PLOT.y0 - 0.25, w: 0.1, h: 0.1, z0: 0.1, z1: 0.115 }, meta(slot, -1)));
    }
  }
  return out;
};

/** D15 Main entrance door (ground-floor lobby): wood double door, wide pivot door, or glass. */
export const mainDoor: Gen = (id, cfg, ctx) => {
  const style = str(cfg.params, "style", "wood");
  const o = ctx.openings.find((x) => x.planId === "lobby-door");
  if (!o || style === "glass") return [];
  const out: Part[] = [];
  const meta = { floor: 0, side: o.side, slot: "entrance:lobby", element: id };
  const f = (k: string, role: Part["role"], a0: number, a1: number, d0: number, d1: number, z0: number, z1: number) =>
    out.push(box(`${id}-${k}`, role, faceBox(o.side, o.face, a0, a1, d0, d1, z0, z1), meta));
  const fr = 0.05;
  if (style === "pivot") {
    f("leaf", "mainDoor", o.a + fr, o.b - fr, 0.03, 0.068, o.z0 + 0.01, o.z1 - fr);
    f("handle", "railing", o.b - 0.2, o.b - 0.17, -0.0, 0.03, o.z0 + 0.4, o.z1 - 0.4);
  } else {
    const mid = (o.a + o.b) / 2;
    f("leaf-l", "mainDoor", o.a + fr, mid - 0.004, 0.03, 0.068, o.z0 + 0.01, o.z1 - fr);
    f("leaf-r", "mainDoor", mid + 0.004, o.b - fr, 0.03, 0.068, o.z0 + 0.01, o.z1 - fr);
    for (const [k, a] of [
      ["l", mid - 0.09],
      ["r", mid + 0.06],
    ] as const)
      f(`handle-${k}`, "railing", a, a + 0.03, 0.0, 0.03, o.z0 + 0.8, o.z0 + 1.4);
    // two grooves on each leaf
    for (const [k, a] of [
      ["g1", o.a + 0.2],
      ["g2", mid + 0.15],
    ] as const)
      f(`groove-${k}`, "railing", a, a + 0.012, 0.028, 0.03, o.z0 + 0.2, o.z1 - 0.25);
  }
  return out;
};

/** D17 Landscaping: trees and shrubs in the garden strips, stepping stones. Ground / paving materials come from the palette. */
export const landscaping: Gen = (id, cfg) => {
  const out: Part[] = [];
  const trees = Math.round(num(cfg.params, "trees", 3));
  const shrubs = cfg.params?.shrubs !== false;
  const stones = cfg.params?.steppingStones === true;
  const P = PLOT;
  const meta = { floor: -1, slot: "site:garden", element: id };
  const g = PAVING + 0.04;
  const spots: [number, number, number][] = [
    [P.x0 + 0.75, Y_S_MASTER + 1.6, 1.0],
    [X_E + 0.75, Y_NOTCH + 4.5, 0.9],
    [P.x0 + 0.75, Y_TOWER_S + 1.0, 1.1],
    [X_E + 0.75, Y_STAIR_N - 0.5, 0.95],
  ];
  spots.slice(0, Math.max(0, Math.min(4, trees))).forEach(([x, y, s], i) => {
    out.push(box(`${id}-trunk-${i}`, "treeTrunk", { x: x - 0.08, y: y - 0.08, w: 0.16, h: 0.16, z0: g, z1: g + 2.6 * s }, meta));
    out.push({ id: `${id}-crown-${i}a`, kind: "blob", role: "greenery", x, y, z: g + 3.3 * s, r: 1.15 * s, rz: 1.0 * s, ...meta });
    out.push({ id: `${id}-crown-${i}b`, kind: "blob", role: "greenery", x: x + 0.35 * s, y: y - 0.3, z: g + 2.7 * s, r: 0.8 * s, rz: 0.7 * s, ...meta });
  });
  if (shrubs) {
    const front = Math.floor((X_NOTCH_W - 0.9 - P.x0) / 0.6);
    for (let i = 0; i < front; i++) out.push({ id: `${id}-shrub-f${i}`, kind: "blob", role: "greenery", x: P.x0 + 0.55 + i * 0.6, y: P.y0 + 0.56, z: g + 0.3, r: 0.36, rz: 0.34 + 0.06 * Math.sin(i * 1.7), ...meta });
    const side = Math.floor((P.y1 - Y_S_MASTER - 1.5) / 0.9);
    for (let i = 0; i < side; i++) {
      const y = Y_S_MASTER + 1.0 + i * 0.9;
      out.push({ id: `${id}-shrub-w${i}`, kind: "blob", role: "greenery", x: P.x0 + 0.5, y, z: g + 0.25, r: 0.3, rz: 0.3, ...meta });
      out.push({ id: `${id}-shrub-e${i}`, kind: "blob", role: "greenery", x: P.x1 - 0.5, y, z: g + 0.25, r: 0.3, rz: 0.3, ...meta });
    }
  }
  if (stones) {
    // from the pedestrian gate to the lobby door through the parking edge
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = (GATES.pedestrian.a + GATES.pedestrian.b) / 2 * (1 - t) + 1.9 * t;
      const y = P.y0 + 0.8 + t * (Y_S_MASTER - 0.4 - (P.y0 + 0.8));
      out.push(box(`${id}-stone-${i}`, "base", { x: x - 0.3, y: y - 0.2, w: 0.6, h: 0.4, z0: PAVING, z1: PAVING + 0.03 }, meta));
    }
  }
  return out;
};

/** D18 Solar panels on an elevated frame over the west part of the terrace, tilted to the south. */
export const solar: Gen = (id, cfg) => {
  const out: Part[] = [];
  const tiltDeg = num(cfg.params, "tilt", 19);
  const rows = Math.round(num(cfg.params, "rows", 3));
  const h = num(cfg.params, "height", 2.2);
  const t = (tiltDeg * Math.PI) / 180;
  const x0 = X_W + 0.35;
  const x1 = X_NOTCH_W - 0.35;
  const L = 1.15; // panel depth along the slope
  const pitch = 1.9;
  const meta = { floor: 4, side: "roof" as const, slot: "terrace:solar", element: id };
  for (let r = 0; r < rows; r++) {
    const y0 = Y_S_MASTER + 0.6 + r * pitch;
    if (y0 + L > Y_TOWER_S - 0.3) break;
    const zLow = TERRACE + h;
    const dy = L * Math.cos(t);
    const dz = L * Math.sin(t);
    const th = 0.04;
    out.push({
      id: `${id}-row-${r}`,
      kind: "prism",
      role: "solar",
      axis: "y",
      at: x0,
      thickness: x1 - x0,
      profile: [
        [y0, zLow],
        [y0 + dy, zLow + dz],
        [y0 + dy - th * Math.sin(t), zLow + dz + th * Math.cos(t)],
        [y0 - th * Math.sin(t), zLow + th * Math.cos(t)],
      ],
      ...meta,
    });
    for (const [k, x] of [
      ["a", x0 + 0.1],
      ["b", x1 - 0.15],
    ] as const) {
      out.push(box(`${id}-leg-${r}${k}s`, "railing", { x, y: y0 + 0.05, w: 0.05, h: 0.05, z0: TERRACE, z1: zLow }, meta));
      out.push(box(`${id}-leg-${r}${k}n`, "railing", { x, y: y0 + dy - 0.1, w: 0.05, h: 0.05, z0: TERRACE, z1: zLow + dz }, meta));
    }
  }
  return out;
};


// ---------------------------------------------------------------------------
/** A real light source for night mode, at the same place as a lighting fixture. */
export type LightSpec =
  | { kind: "spot"; id: string; pos: [number, number, number]; target: [number, number, number]; intensity: number; angle: number; distance: number }
  | { kind: "point"; id: string; pos: [number, number, number]; intensity: number; distance: number }
  | { kind: "rect"; id: string; pos: [number, number, number]; target: [number, number, number]; width: number; height: number; intensity: number };

/** Light sources for the enabled lighting slots (plan coordinates; z = height). `full` = High quality (more lights). */
export function lightingSources(slots: string[], full: boolean): LightSpec[] {
  const out: LightSpec[] = [];
  for (const slot of slots) {
    if (slot === "wall:frontName") {
      for (const f of FLOORS)
        for (const [k, x] of [
          ["a", X_W + 0.7],
          ["b", X_NOTCH_W - 0.7],
        ] as const) {
          const z = level(f) + 1.9;
          const y = Y_S_MASTER - 0.07;
          if (full) {
            out.push({ kind: "spot", id: `sconce-${f}${k}-up`, pos: [x, y, z + 0.16], target: [x, y - 0.05, z + 2.5], intensity: 6, angle: 0.45, distance: 4 });
            out.push({ kind: "spot", id: `sconce-${f}${k}-dn`, pos: [x, y, z - 0.16], target: [x, y - 0.05, z - 2.5], intensity: 6, angle: 0.45, distance: 4 });
          } else out.push({ kind: "point", id: `sconce-${f}${k}`, pos: [x, y - 0.25, z], intensity: 2.5, distance: 3.5 });
        }
    } else if (slot === "wall:featureRecess") {
      for (const f of FLOORS) out.push({ kind: "point", id: `groove-${f}`, pos: [X_NOTCH_W + 0.1, Y_S_MASTER - 0.3, level(f) + 1.6], intensity: 2, distance: 3.5 });
    } else if (slot === "balcony:S" || slot === "balcony:N") {
      const key = slot.endsWith("N") ? "N" : "S";
      const b = BALCONY[key];
      const y = key === "S" ? b.y + 0.16 : b.y1 - 0.17;
      for (const f of [...FLOORS.slice(1), 4]) {
        const z = (f === 4 ? TERRACE : level(f)) - 0.26;
        out.push({ kind: "rect", id: `cove-${key}-${f}`, pos: [(b.x + b.x1) / 2, y, z], target: [(b.x + b.x1) / 2, y, z - 1], width: b.x1 - b.x - 0.5, height: 0.06, intensity: 14 });
      }
    } else if (slot === "edge:stiltBand") {
      const z = level(1) - STILT_BAND - 0.02;
      out.push({ kind: "rect", id: "band", pos: [(X_WING + X_E) / 2, Y_NOTCH + 0.03, z], target: [(X_WING + X_E) / 2, Y_NOTCH + 0.03, z - 1], width: X_E - X_WING - 0.4, height: 0.05, intensity: 10 });
    } else if (slot === "site:compoundFront" && full) {
      for (let i = 0; i < 6; i += 2) {
        const x = PLOT.x0 + 0.4 + (i * (GATES.pedestrian.a - 0.8 - PLOT.x0)) / 5;
        out.push({ kind: "point", id: `pil-${i}`, pos: [x, PLOT.y0 + 0.11, COMPOUND_H + 0.25], intensity: 1.2, distance: 2.5 });
      }
    } else if (slot === "site:gate") {
      for (const [k, x] of [
        ["p1", GATES.pedestrian.a - 0.12],
        ["p2", GATES.pedestrian.b + 0.12],
        ["p3", GATES.vehicle.a - 0.12],
        ["p4", GATES.vehicle.b + 0.12],
      ] as const)
        out.push({ kind: "spot", id: `up-${k}`, pos: [x, PLOT.y0 - 0.2, 0.15], target: [x, PLOT.y0 + 0.05, 2.5], intensity: 5, angle: 0.35, distance: 3.5 });
    }
  }
  return out;
}
