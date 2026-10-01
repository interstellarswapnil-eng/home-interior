/**
 * Element generators: one function per element TYPE. Patterns (config JSON) only switch elements on,
 * pick slots and set params; adding a new kind of element is the only thing that needs code here.
 */
import {
  BALCONY,
  COMPOUND_H,
  GATES,
  PLOT,
  TERRACE,
  X_NOTCH_W,
  X_W,
  X_WING,
  Y_NOTCH,
  Y_S_MASTER,
  level,
} from "./building";
import { box, faceBox } from "./geom";
import { FLOORS, num, slotOpenings, str, type ElementConfig, type ElementCtx, type Gen } from "./elementUtil";
import { canopy, parapet, pergola, roofOverhang, stoneBase } from "./roofElements";
import { cladding, jaali, slats, sunshades } from "./wallElements";
import { landscaping, lighting, mainDoor, softFrame, solar } from "./siteElements";
import type { Part, SurfaceRole } from "./types";

export type { ElementConfig, ElementCtx };

// ---------------------------------------------------------------------------
/** D4 Box frames around windows: a projecting square frame. */
const boxFrames: Gen = (id, cfg, ctx) => {
  const out: Part[] = [];
  const depth = num(cfg.params, "depth", 0.3);
  const width = num(cfg.params, "width", 0.18);
  const roleBySlot = (cfg.params?.roleBySlot ?? {}) as Record<string, SurfaceRole>;
  for (const slot of cfg.slots ?? []) {
    const role = roleBySlot[slot] ?? str<SurfaceRole>(cfg.params, "role", "windowSurround");
    for (const o of slotOpenings(slot, ctx)) {
      if (ctx.soft) {
        out.push({ id: `${o.id}-${id}`, role, floor: o.floor, side: o.side, slot, element: id, ...softFrame(o, width, depth, ctx.soft.radius, ctx.soft.arches && o.type === "window" && o.b - o.a > 0.8) });
        continue;
      }
      const p = (k: string, a0: number, a1: number, z0: number, z1: number) =>
        out.push(box(`${o.id}-${id}-${k}`, role, faceBox(o.side, o.face, a0, a1, -depth, -0.002, z0, z1), { floor: o.floor, side: o.side, slot, element: id, bevel: 0.012 }));
      p("t", o.a - width, o.b + width, o.z1, o.z1 + width);
      p("b", o.a - width, o.b + width, o.z0 - width - 0.03, o.z0 - 0.03);
      p("l", o.a - width, o.a, o.z0 - 0.03, o.z1);
      p("r", o.b, o.b + width, o.z0 - 0.03, o.z1);
    }
  }
  return out;
};

/** D2 Vertical fins: in front of a window slot, or at the west end of a balcony ("balconySide:S"). */
const fins: Gen = (id, cfg, ctx) => {
  const out: Part[] = [];
  const count = Math.max(1, Math.round(num(cfg.params, "count", 5)));
  const w = num(cfg.params, "width", 0.05);
  const depth = num(cfg.params, "depth", 0.15);
  const role = str<SurfaceRole>(cfg.params, "role", "fins");
  for (const slot of cfg.slots ?? []) {
    if (slot.startsWith("balconySide:")) {
      const key = slot.endsWith("N") ? "N" : "S";
      const span = num(cfg.params, "span", 0.7);
      for (const f of FLOORS) {
        const z0 = level(f);
        const z1 = level(f + 1) - 0.24;
        for (let i = 0; i < count; i++) {
          const x = X_WING + 0.12 + (i * span) / Math.max(1, count - 1);
          const y = key === "S" ? Y_NOTCH - 0.12 - depth : BALCONY.N.y + 0.12;
          out.push(box(`F${f}-${id}-${key}-${i}`, role, { x, y, w, h: depth, z0, z1 }, { floor: f, side: key, slot, element: id }));
        }
      }
      continue;
    }
    for (const o of slotOpenings(slot, ctx)) {
      const gap = (o.b - o.a - w) / Math.max(1, count - 1);
      for (let i = 0; i < count; i++) {
        const a = o.a + i * gap;
        out.push(box(`${o.id}-${id}-${i}`, role, faceBox(o.side, o.face, a, a + w, -depth - 0.02, -0.02, o.z0 - 0.1, o.z1 + 0.1), { floor: o.floor, side: o.side, slot, element: id }));
      }
    }
  }
  return out;
};

/** S-curve profile: high solid part on the west, sweeping down to a low wall under glass. */
function curvedProfile(x0: number, len: number, z: number, high: number, low: number, split: number): [number, number][] {
  const x1 = x0 + len * split;
  const x2 = x1 + Math.min(0.9, len * 0.2);
  const pts: [number, number][] = [
    [x0, z],
    [x0 + len, z],
    [x0 + len, z + low],
  ];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = t * t * (3 - 2 * t); // smoothstep
    pts.push([x2 - (x2 - x1) * t, z + low + (high - low) * s]);
  }
  pts.push([x0, z + high]);
  return pts;
}

/** D11 Railings / balcony fronts. Styles: curvedSolidGlass (#28), glass, bars, solid. */
const railings: Gen = (id, cfg) => {
  const out: Part[] = [];
  const style = str(cfg.params, "style", "curvedSolidGlass");
  const H = num(cfg.params, "height", 1.05);
  const low = num(cfg.params, "low", 0.35);
  const split = num(cfg.params, "split", 0.38);
  const T = 0.12;
  for (const slot of cfg.slots ?? []) {
    const key = slot.endsWith("N") ? "N" : "S";
    const b = BALCONY[key];
    const len = b.x1 - b.x;
    const yFront = key === "S" ? b.y : b.y1 - T;
    for (const f of FLOORS) {
      const z = level(f);
      const meta = { floor: f, side: key, slot, element: id } as const;
      // side walls (solid, full height)
      out.push(box(`F${f}-${id}-${key}-side-w`, "balconyFront", { x: b.x, y: b.y, w: 0.1, h: b.y1 - b.y, z0: z, z1: z + H }, meta));
      out.push(box(`F${f}-${id}-${key}-side-e`, "balconyFront", { x: b.x1 - 0.2, y: b.y, w: 0.2, h: b.y1 - b.y, z0: z, z1: z + H }, meta));
      const glass = (from: number, zb: number) => {
        const gy = key === "S" ? yFront + 0.05 : yFront + T - 0.062;
        out.push(box(`F${f}-${id}-${key}-glass`, "glass", { x: from, y: gy, w: b.x1 - 0.2 - from, h: 0.012, z0: zb, z1: z + H - 0.04 }, meta));
        out.push(box(`F${f}-${id}-${key}-cap`, "railing", { x: from, y: gy - 0.014, w: b.x1 - 0.2 - from, h: 0.04, z0: z + H - 0.04, z1: z + H }, meta));
      };
      if (style === "curvedSolidGlass") {
        out.push({ id: `F${f}-${id}-${key}-front`, kind: "prism", role: "balconyFront", axis: "x", at: yFront, thickness: T, profile: curvedProfile(b.x + 0.1, len - 0.3, z, H, low, split), ...meta });
        glass(b.x + 0.1 + (len - 0.3) * split, z + low);
      } else if (style === "glass") {
        out.push(box(`F${f}-${id}-${key}-kerb`, "balconyFront", { x: b.x + 0.1, y: yFront, w: len - 0.3, h: T, z0: z, z1: z + 0.15 }, meta));
        glass(b.x + 0.1, z + 0.15);
      } else if (style === "bars") {
        out.push(box(`F${f}-${id}-${key}-kerb`, "balconyFront", { x: b.x + 0.1, y: yFront, w: len - 0.3, h: T, z0: z, z1: z + 0.15 }, meta));
        const n = Math.floor((len - 0.3) / 0.12);
        for (let i = 0; i <= n; i++)
          out.push(box(`F${f}-${id}-${key}-bar-${i}`, "railing", { x: b.x + 0.1 + i * ((len - 0.32) / n), y: yFront + 0.04, w: 0.02, h: 0.02, z0: z + 0.15, z1: z + H }, meta));
        out.push(box(`F${f}-${id}-${key}-cap`, "railing", { x: b.x + 0.1, y: yFront + 0.02, w: len - 0.3, h: 0.06, z0: z + H - 0.04, z1: z + H }, meta));
      } else {
        out.push(box(`F${f}-${id}-${key}-front`, "balconyFront", { x: b.x + 0.1, y: yFront, w: len - 0.3, h: T, z0: z, z1: z + H }, meta));
      }
    }
  }
  return out;
};

/** D13 Planters: plant boxes along the roof edge over a balcony stack, or inside each balcony front. */
const planters: Gen = (id, cfg) => {
  const out: Part[] = [];
  const h = num(cfg.params, "height", 0.45);
  for (const slot of cfg.slots ?? []) {
    const key = slot.endsWith("N") ? "N" : "S";
    const b = BALCONY[key];
    const roof = slot.startsWith("edge:balconyRoof-");
    if (!roof && !slot.startsWith("balcony:")) continue;
    // roof: on the slab behind the edge; balcony: a trough on the inside of the front, below the rail
    const levels = roof ? [{ pre: "R", z0: TERRACE, floor: 4 }] : FLOORS.map((f) => ({ pre: `F${f}`, z0: level(f) + 0.65 - h, floor: f }));
    const depth = roof ? 0.45 : 0.3;
    const y = key === "S" ? b.y + (roof ? 0.15 : 0.13) : b.y1 - (roof ? 0.15 : 0.13) - depth;
    for (const { pre, z0, floor } of levels) {
      const meta = { floor, side: key, slot, element: id } as const;
      out.push(box(`${pre}-${id}-${key}-box`, "planter", { x: b.x + 0.15, y, w: b.x1 - b.x - 0.4, h: depth, z0, z1: z0 + h }, meta));
      const n = Math.round((b.x1 - b.x) / 0.42);
      for (let i = 0; i < n; i++) {
        const x = b.x + 0.4 + i * ((b.x1 - b.x - 0.85) / Math.max(1, n - 1));
        const r = (roof ? 0.24 : 0.18) + 0.06 * Math.abs(Math.sin(i * 2.3 + floor));
        out.push({ id: `${pre}-${id}-${key}-leaf-${i}`, kind: "blob", role: "greenery", x, y: y + depth / 2, z: z0 + h + r * 0.4, r, rz: r * 0.85, ...meta });
      }
    }
  }
  return out;
};

/** D16 Compound wall with pilasters, gate pillars and gates. */
const compoundWall: Gen = (id, cfg) => {
  const out: Part[] = [];
  const H = num(cfg.params, "height", COMPOUND_H);
  const every = num(cfg.params, "pilasterEvery", 3.0);
  const gateStyle = str<"verticalBars" | "slats" | "solid">(cfg.params, "gate", "verticalBars");
  const P = PLOT;
  const T = 0.23;
  const meta = (slot: string) => ({ floor: -1, slot, element: id });
  const wall = (k: string, x0: number, y0: number, x1: number, y1: number, slot: string) => {
    out.push(box(`${id}-${k}`, "compoundWall", { x: x0, y: y0, w: x1 - x0, h: y1 - y0, z0: 0, z1: H }, meta(slot)));
    out.push(box(`${id}-${k}-cap`, "trim", { x: x0 - 0.02, y: y0 - 0.02, w: x1 - x0 + 0.04, h: y1 - y0 + 0.04, z0: H, z1: H + 0.06 }, { ...meta(slot), bevel: 0.01 }));
    const along = x1 - x0 > y1 - y0;
    const len = along ? x1 - x0 : y1 - y0;
    const n = Math.floor(len / every);
    for (let i = 1; i < n; i++) {
      const c = (along ? x0 : y0) + (i * len) / n;
      const r = along ? { x: c - 0.15, y: y0 - 0.04, w: 0.3, h: y1 - y0 + 0.08 } : { x: x0 - 0.04, y: c - 0.15, w: x1 - x0 + 0.08, h: 0.3 };
      out.push(box(`${id}-${k}-pilaster-${i}`, "trim", { ...r, z0: 0, z1: H + 0.12 }, { ...meta(slot), bevel: 0.01 }));
    }
  };
  const gv = GATES.vehicle;
  const gp = GATES.pedestrian;
  wall("front-1", P.x0, P.y0, gp.a - 0.25, P.y0 + T, "site:compoundFront");
  wall("front-2", gp.b + 0.25, P.y0, gv.a - 0.25, P.y0 + T, "site:compoundFront");
  wall("front-3", gv.b + 0.25, P.y0, P.x1, P.y0 + T, "site:compoundFront");
  wall("west", P.x0, P.y0 + T, P.x0 + T, P.y1, "site:compoundSides");
  wall("east", P.x1 - T, P.y0 + T, P.x1, P.y1, "site:compoundSides");
  wall("rear", P.x0 + T, P.y1 - T, P.x1 - T, P.y1, "site:compoundSides");
  // gate pillars
  for (const [k, x] of [
    ["p1", gp.a - 0.25],
    ["p2", gp.b],
    ["p3", gv.a - 0.25],
    ["p4", gv.b],
  ] as const) {
    out.push(box(`${id}-pillar-${k}`, "secondSurface", { x, y: P.y0 - 0.05, w: 0.25 + 0.0, h: 0.4, z0: 0, z1: H + 0.35 }, meta("site:gate")));
    out.push(box(`${id}-pillar-${k}-cap`, "trim", { x: x - 0.03, y: P.y0 - 0.08, w: 0.31, h: 0.46, z0: H + 0.35, z1: H + 0.42 }, meta("site:gate")));
  }
  // gates
  const gate = (k: string, a: number, b: number) => {
    const y = k === "ped" ? P.y0 + 0.26 : P.y0 + 0.08;
    const gh = H + 0.1;
    out.push(box(`${id}-gate-${k}-top`, "gate", { x: a, y, w: b - a, h: 0.05, z0: gh - 0.06, z1: gh }, meta("site:gate")));
    out.push(box(`${id}-gate-${k}-bottom`, "gate", { x: a, y, w: b - a, h: 0.05, z0: 0.05, z1: 0.12 }, meta("site:gate")));
    if (gateStyle === "solid") {
      out.push(box(`${id}-gate-${k}-panel`, "gate", { x: a, y: y + 0.01, w: b - a, h: 0.03, z0: 0.12, z1: gh - 0.06 }, meta("site:gate")));
      return;
    }
    if (gateStyle === "slats") {
      // horizontal boards with narrow gaps
      const rows = Math.floor((gh - 0.18) / 0.13);
      for (let i = 0; i < rows; i++)
        out.push(box(`${id}-gate-${k}-board-${i}`, "gate", { x: a, y: y + 0.01, w: b - a, h: 0.03, z0: 0.12 + i * 0.13, z1: 0.12 + i * 0.13 + 0.1 }, meta("site:gate")));
      return;
    }
    const n = Math.floor((b - a) / 0.11);
    for (let i = 0; i <= n; i++)
      out.push(box(`${id}-gate-${k}-bar-${i}`, "gate", { x: a + i * ((b - a - 0.03) / n), y: y + 0.01, w: 0.03, h: 0.03, z0: 0.12, z1: gh - 0.06 }, meta("site:gate")));
  };
  // the pedestrian gate is shown slid open (behind the wall, inside the plot): it is the way in
  const slid = gp.b - gp.a;
  gate("ped", gp.a - slid - 0.1, gp.a - 0.1);
  gate("veh", gv.a, gv.b);
  return out;
};

/** Building name plate on the road-facing wall. */
const nameSign: Gen = (id, cfg) => {
  const text = str(cfg.params, "text", "पसायदान");
  return [
    {
      id: `${id}-plate`,
      kind: "label",
      role: "featureWall",
      floor: 2,
      side: "S",
      slot: "wall:frontName",
      element: id,
      text,
      x: (X_W + X_NOTCH_W) / 2,
      y: Y_S_MASTER - 0.012,
      z: level(2) + 1.4,
      width: 1.9,
      height: 0.62,
    },
  ];
};

export const ELEMENT_GENERATORS: Record<string, Gen> = {
  boxFrames,
  fins,
  railings,
  planters,
  compoundWall,
  nameSign,
  slats,
  jaali,
  cladding,
  sunshades,
  roofOverhang,
  parapet,
  pergola,
  canopy,
  stoneBase,
  lighting,
  mainDoor,
  landscaping,
  solar,
  // D12 is a modifier: it changes how boxFrames are drawn (see buildElements)
  roundedCorners: () => [],
};

/** Generate the parts for every enabled element. Unknown element ids are ignored (Phase 3 adds more generators). */
export function buildElements(elements: Record<string, ElementConfig>, ctx: ElementCtx): Part[] {
  const out: Part[] = [];
  const rc = elements.roundedCorners;
  if (rc?.enabled) ctx = { ...ctx, soft: { radius: num(rc.params, "radius", 0.25), arches: rc.params?.arches === true } };
  for (const [id, cfg] of Object.entries(elements)) {
    if (!cfg.enabled) continue;
    const gen = ELEMENT_GENERATORS[(cfg.params?.type as string) ?? id];
    if (gen) out.push(...gen(id, cfg, ctx));
  }
  return out;
}

