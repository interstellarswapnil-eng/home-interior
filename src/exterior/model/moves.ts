/**
 * Design MOVES (exterior v2): bold, parametric 3D shapes placed in front of / around the architect's building.
 * The floor plan, floor heights, slabs, stair and core never change; moves only add depth in front of them.
 * Each move is an element generator (config-driven, role-based colours), like the v1 elements.
 *
 * Coordinates: a facade-facing move is described in its face's (u, z) plane:
 *   S / N faces: u = plan x;  W / E faces: u = plan y.  `back` = plane the move sits against (plan y for S/N,
 *   plan x for W/E); it projects `depth` outwards.
 */
import { BALCONY, PARAPET_H, TERRACE, TOP, X_E, X_W, Y_S_MASTER, Y_STAIR_N, level } from "./building";
import { box } from "./geom";
import { num, str, type Gen } from "./elementUtil";
import type { Part, PrismPart, SurfaceRole } from "./types";

type Side = "S" | "N" | "E" | "W";
type Meta = { floor: number; slot?: string; element: string; side?: Part["side"] };
const SEG = 10;

/** A shape in a facade plane → prism (axis + extent along the face normal). */
function facePrism(id: string, role: SurfaceRole, side: Side, back: number, depth: number, profile: [number, number][], meta: Meta, holes?: [number, number][][]): PrismPart {
  const out = side === "S" || side === "W" ? -1 : 1;
  const near = back;
  const far = back + out * depth;
  return {
    id,
    kind: "prism",
    role,
    axis: side === "S" || side === "N" ? "x" : "y",
    at: Math.min(near, far),
    thickness: Math.abs(depth),
    profile,
    holes,
    ...meta,
  };
}

function arc(cu: number, cz: number, r: number, a0: number, a1: number, n = SEG): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([cu + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// M1 / M2 / M3  Frames: portal, picture, squircle, capsule, quarter-arc
// ---------------------------------------------------------------------------
/**
 * A thick frame made of pieces: straight sides + rounded (or square) corners. Any side can be left out:
 * "left + top" with a big top-left radius is the quarter-arc frame (M2).
 * radii: [bottom-left, bottom-right, top-right, top-left] (outer radius, m).
 */
export function framePieces(
  idBase: string,
  role: SurfaceRole,
  side: Side,
  back: number,
  depth: number,
  rect: { u0: number; u1: number; z0: number; z1: number },
  w: number,
  radii: [number, number, number, number],
  sides: { l: boolean; r: boolean; t: boolean; b: boolean },
  meta: Meta,
): Part[] {
  const { u0, u1, z0, z1 } = rect;
  const [rbl0, rbr0, rtr0, rtl0] = radii;
  const lim = Math.min((u1 - u0) / 2, (z1 - z0) / 2);
  const corner = (r: number, a: boolean, b: boolean) => (a && b ? Math.min(r, lim) : 0);
  const rbl = corner(rbl0, sides.l, sides.b);
  const rbr = corner(rbr0, sides.r, sides.b);
  const rtr = corner(rtr0, sides.r, sides.t);
  const rtl = corner(rtl0, sides.l, sides.t);
  const pieces: [number, number][][] = [];
  const rect2 = (a0: number, a1: number, b0: number, b1: number) => {
    if (a1 - a0 > 1e-3 && b1 - b0 > 1e-3) pieces.push([[a0, b0], [a1, b0], [a1, b1], [a0, b1]]);
  };
  // vertical sides own square corners; horizontal sides fill between
  const sq = (r: number, both: boolean) => both && r === 0;
  if (sides.l) rect2(u0, u0 + w, z0 + (rbl > 0 ? rbl : 0), z1 - (rtl > 0 ? rtl : 0));
  if (sides.r) rect2(u1 - w, u1, z0 + (rbr > 0 ? rbr : 0), z1 - (rtr > 0 ? rtr : 0));
  if (sides.t) rect2(u0 + (rtl > 0 ? rtl : sq(rtl, sides.l) ? w : 0), u1 - (rtr > 0 ? rtr : sq(rtr, sides.r) ? w : 0), z1 - w, z1);
  if (sides.b) rect2(u0 + (rbl > 0 ? rbl : sq(rbl, sides.l) ? w : 0), u1 - (rbr > 0 ? rbr : sq(rbr, sides.r) ? w : 0), z0, z0 + w);
  const ring = (cu: number, cz: number, r: number, a0: number, a1: number) => {
    if (r <= 0) return;
    const ri = Math.max(0, r - w);
    const outer = arc(cu, cz, r, a0, a1);
    const inner = ri > 1e-3 ? arc(cu, cz, ri, a1, a0) : [[cu, cz] as [number, number]];
    pieces.push([...outer, ...inner]);
  };
  ring(u0 + rbl, z0 + rbl, rbl, Math.PI, 1.5 * Math.PI);
  ring(u1 - rbr, z0 + rbr, rbr, 1.5 * Math.PI, 2 * Math.PI);
  ring(u1 - rtr, z1 - rtr, rtr, 0, 0.5 * Math.PI);
  ring(u0 + rtl, z1 - rtl, rtl, 0.5 * Math.PI, Math.PI);
  return pieces.map((p, i) => facePrism(`${idBase}-${i}`, role, side, back, depth, p, meta));
}

/** Thin warm LED line along the inner edge of a frame (on the inside face, near the front). */
function frameEdgeLight(idBase: string, side: Side, back: number, depth: number, rect: { u0: number; u1: number; z0: number; z1: number }, w: number, sides: { t: boolean; b: boolean }, meta: Meta): Part[] {
  const out: Part[] = [];
  const o = side === "S" || side === "W" ? -1 : 1;
  const y0 = back + o * (depth - 0.08);
  const y1 = back + o * (depth - 0.05);
  const along = (u0: number, u1: number, z: number, k: string) => {
    const b = side === "S" || side === "N" ? { x: u0, w: u1 - u0, y: Math.min(y0, y1), h: Math.abs(y1 - y0), z0: z, z1: z + 0.012 } : { y: u0, h: u1 - u0, x: Math.min(y0, y1), w: Math.abs(y1 - y0), z0: z, z1: z + 0.012 };
    out.push(box(`${idBase}-led-${k}`, "lightGlow", b, meta));
  };
  if (sides.t) along(rect.u0 + w + 0.3, rect.u1 - w - 0.3, rect.z1 - w - 0.012, "t");
  if (sides.b) along(rect.u0 + w + 0.3, rect.u1 - w - 0.3, rect.z0 + w, "b");
  return out;
}

const sidesOf = (s: unknown) => {
  const v = typeof s === "string" ? s : "lrtb";
  return { l: v.includes("l"), r: v.includes("r"), t: v.includes("t"), b: v.includes("b") };
};
const radiiOf = (p: Record<string, unknown> | undefined): [number, number, number, number] => {
  const r = p?.radii;
  if (Array.isArray(r) && r.length === 4) return r.map(Number) as [number, number, number, number];
  const all = num(p, "radius", 0);
  return [all, all, all, all];
};
/** Heights in config: whole numbers 0..3 = that floor level, 4 = terrace, 5 = top of the head room; other numbers = metres. */
export const zOf = (v: unknown, d: number) => (typeof v === "number" ? (Number.isInteger(v) && v >= 0 && v <= 5 ? (v === 5 ? TOP : level(v)) : v) : d);

/** M1 Portal / picture / squircle frame (and M2 quarter arc via sides + one big radius). */
export const frame: Gen = (id, cfg) => {
  const p = cfg.params;
  const side = str<Side>(p, "side", "S");
  const back = num(p, "back", Y_S_MASTER);
  const depth = num(p, "depth", 0.6);
  const w = num(p, "faceWidth", 0.45);
  const rect = { u0: num(p, "u0", X_W), u1: num(p, "u1", X_E), z0: zOf(p?.from, level(1)) + num(p, "dz0", 0), z1: zOf(p?.to, TERRACE) + num(p, "dz1", 0) };
  const sides = sidesOf(p?.sides);
  const role = str<SurfaceRole>(p, "role", "featureWall");
  const meta: Meta = { floor: 1, slot: `move:${id}`, element: id, side };
  const parts = framePieces(`${id}`, role, side, back, depth, rect, w, radiiOf(p), sides, meta);
  if (p?.edgeLight !== false) parts.push(...frameEdgeLight(id, side, back, depth, rect, w, sides, meta));
  return parts;
};

// ---------------------------------------------------------------------------
// M6 Streamline bands: rounded slab bands wrapping the corner(s), LED under each edge
// ---------------------------------------------------------------------------
/** Plan outline of a band: offset `proj` out from the south face, wrapping round the SW (and SE) corner with radius R. */
function bandOutline(proj: number, R: number, westRun: number, eastRun: number): [number, number][] {
  const ys = Y_S_MASTER - proj; // outer south line
  const xw = X_W - proj; // outer west line
  const xe = X_E + proj; // outer east line
  const r = Math.min(R, proj + 0.6);
  const pts: [number, number][] = [];
  // outer path: east end (north) → SE corner → SW corner → west end (north)
  pts.push([xe, Y_S_MASTER + eastRun]);
  pts.push(...arc(xe - r, ys + r, r, 0, -0.5 * Math.PI));
  pts.push(...arc(xw + r, ys + r, r, -0.5 * Math.PI, -Math.PI));
  pts.push([xw, Y_S_MASTER + westRun]);
  // inner path back along the building faces
  pts.push([X_W, Y_S_MASTER + westRun]);
  pts.push([X_W, Y_S_MASTER]);
  pts.push([X_E, Y_S_MASTER]);
  pts.push([X_E, Y_S_MASTER + eastRun]);
  return pts;
}

export const bands: Gen = (id, cfg) => {
  const p = cfg.params;
  const proj = num(p, "projection", 0.6);
  const t = num(p, "thickness", 0.35);
  const R = num(p, "endRadius", 1.0);
  const westRun = num(p, "westRun", 6.5);
  const eastRun = num(p, "eastRun", 2.0);
  const role = str<SurfaceRole>(p, "role", "trim");
  const floors = (Array.isArray(p?.floors) ? (p!.floors as number[]) : [1, 2, 3, 4]).map((f) => zOf(f, level(1)));
  const out: Part[] = [];
  const outline = bandOutline(proj, R, westRun, eastRun);
  const ledOutline = bandOutline(proj - 0.06, Math.max(0.1, R - 0.06), westRun, eastRun).slice(0, 2 * (SEG + 1) + 2);
  floors.forEach((z, i) => {
    const meta: Meta = { floor: i + 1, slot: `move:${id}`, element: id };
    out.push({ id: `${id}-${i}`, kind: "prism", role, axis: "z", at: z - t + 0.1, thickness: t, profile: outline, ...meta });
    if (p?.ledLine !== false) {
      // LED line under the outer edge: a 30 mm ribbon following the outer path
      const rib: [number, number][] = [...ledOutline, ...bandOutline(proj - 0.03, Math.max(0.1, R - 0.03), westRun, eastRun).slice(0, 2 * (SEG + 1) + 2).reverse()];
      out.push({ id: `${id}-${i}-led`, kind: "prism", role: "lightGlow", axis: "z", at: z - t + 0.1 - 0.012, thickness: 0.011, profile: rib, ...meta });
    }
  });
  if (p?.doubleCornice) {
    for (const [k, dz] of [
      ["c1", PARAPET_H + 0.1],
      ["c2", PARAPET_H + 0.55],
    ] as const)
      out.push({ id: `${id}-${k}`, kind: "prism", role, axis: "z", at: TERRACE + dz - 0.2, thickness: 0.2, profile: bandOutline(proj * 0.7, R, westRun, eastRun), floor: 4, slot: `move:${id}`, element: id });
  }
  return out;
};

// ---------------------------------------------------------------------------
// M7 Floating roof (flat or tilted, solid or slatted), with fascia, soffit and downlights
// ---------------------------------------------------------------------------
export const floatingRoof: Gen = (id, cfg) => {
  const p = cfg.params;
  const ovS = num(p, "overhangS", 1.2);
  const ovW = num(p, "overhangW", 0.6);
  const ovE = num(p, "overhangE", 0.6);
  const ovN = num(p, "overhangN", 0.3);
  const z = num(p, "height", TOP + 0.15);
  const t = num(p, "fascia", 0.18);
  const tilt = (num(p, "tiltDeg", 0) * Math.PI) / 180;
  const slatted = p?.slatted === true;
  // optional area limits (e.g. a pergola crown over the east terrace only, clear of the stair head room)
  const x0 = num(p, "x0", X_W - ovW);
  const x1 = num(p, "x1", X_E + ovE);
  const y0 = num(p, "y0", BALCONY.S.y - ovS);
  const y1 = num(p, "y1", Math.max(Y_STAIR_N, BALCONY.N.y1) + ovN);
  const meta: Meta = { floor: 4, slot: `move:${id}`, element: id, side: "roof" };
  const out: Part[] = [];
  // the roof rises towards the south by `tilt` (a monsoon umbrella that opens to the street)
  const zAt = (y: number) => z + (y1 - y) * Math.tan(tilt);
  const sect = (ya: number, yb: number, th: number): [number, number][] => [
    [ya, zAt(ya)],
    [yb, zAt(yb)],
    [yb, zAt(yb) + th],
    [ya, zAt(ya) + th],
  ];
  const slab = (k: string, xa: number, xb: number, ya: number, yb: number, th: number, role: SurfaceRole) =>
    out.push({ id: `${id}-${k}`, kind: "prism", role, axis: "y", at: xa, thickness: xb - xa, profile: sect(ya, yb, th), ...meta });
  if (slatted) {
    const fw = 0.3;
    slab("fascia-s", x0, x1, y0, y0 + fw, t + 0.12, "roofEdge");
    slab("fascia-n", x0, x1, y1 - fw, y1, t + 0.12, "roofEdge");
    slab("fascia-w", x0, x0 + fw, y0, y1, t + 0.12, "roofEdge");
    slab("fascia-e", x1 - fw, x1, y0, y1, t + 0.12, "roofEdge");
    const spacing = num(p, "slatSpacing", 0.16);
    const n = Math.floor((x1 - x0 - 2 * fw) / spacing);
    for (let i = 1; i < n; i++) slab(`slat-${i}`, x0 + fw + i * spacing - 0.025, x0 + fw + i * spacing + 0.025, y0 + fw, y1 - fw, 0.14, "pergola");
  } else {
    slab("slab", x0, x1, y0, y1, t, "roofEdge");
    slab("soffit", x0 + 0.04, x1 - 0.04, y0 + 0.04, y1 - 0.04, -0.02, "soffit");
    // downlights in the overhang soffit (south and west edges)
    const dl = (k: string, x: number, y: number) => out.push(box(`${id}-dl-${k}`, "lightGlow", { x: x - 0.05, y: y - 0.05, w: 0.1, h: 0.1, z0: zAt(y) - 0.032, z1: zAt(y) - 0.022 }, meta));
    for (let x = x0 + 0.6, i = 0; x < x1 - 0.4; x += 1.2, i++) dl(`s${i}`, x, y0 + Math.min(0.6, ovS / 2));
    for (let y = y0 + 1.6, i = 0; y < y1 - 0.4; y += 1.2, i++) dl(`w${i}`, x0 + Math.min(0.35, ovW / 2), y);
  }
  // slim steel posts at the south corners carry the overhang down to the parapet / terrace
  for (const [k, x] of [
    ["a", x0 + 0.5],
    ["b", x1 - 0.5],
  ] as const)
    out.push(box(`${id}-post-${k}`, "railing", { x: x - 0.06, y: BALCONY.S.y + 0.2, w: 0.12, h: 0.12, z0: TERRACE, z1: zAt(BALCONY.S.y + 0.2) }, meta));
  return out;
};

// ---------------------------------------------------------------------------
// M8 extras: lanterns hanging in a pergola
// ---------------------------------------------------------------------------
export const lanterns: Gen = (id, cfg) => {
  const p = cfg.params;
  const n = Math.round(num(p, "count", 4));
  const xa = num(p, "x0", X_W + 1.2);
  const xb = num(p, "x1", X_E - 1.2);
  const y = num(p, "y", BALCONY.S.y + 0.4);
  const zt = num(p, "zTop", TERRACE + PARAPET_H + 1.7);
  const out: Part[] = [];
  for (let i = 0; i < n; i++) {
    const x = xa + (i * (xb - xa)) / Math.max(1, n - 1);
    const meta: Meta = { floor: 4, slot: `move:${id}`, element: id };
    out.push(box(`${id}-cord-${i}`, "railing", { x: x - 0.008, y: y - 0.008, w: 0.016, h: 0.016, z0: zt - 0.6, z1: zt }, meta));
    out.push({ id: `${id}-lamp-${i}`, kind: "blob", role: "lightGlow", x, y, z: zt - 0.75, r: 0.13, rz: 0.17, ...meta });
  }
  return out;
};

/** Generators that count as design MOVES (v2); the rest are v1 detail elements. */
export const MOVE_TYPES = ["frame", "bands", "floatingRoof", "lanterns"] as const;
