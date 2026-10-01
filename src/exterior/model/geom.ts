/** Small pure geometry helpers for the exterior model (plan coordinates). */
import type { Box, BoxPart, FacadeOpening, Part, Side, SurfaceRole } from "./types";

export const EPS = 1e-4;

export type WallSpec = {
  id: string;
  /** Plan rectangle of the wall (thickness included). */
  x: number;
  y: number;
  w: number;
  h: number;
  z0: number;
  z1: number;
  /** Outward-facing side. */
  side: "N" | "S" | "E" | "W";
  role: SurfaceRole;
  slot?: string;
  floor: number;
};

export const isNS = (side: Side) => side === "N" || side === "S";

/** Coordinate of a wall's outer face (plan y for N/S, plan x for E/W). */
export function outerFace(w: Pick<WallSpec, "x" | "y" | "w" | "h" | "side">): number {
  switch (w.side) {
    case "W":
      return w.x;
    case "E":
      return w.x + w.w;
    case "S":
      return w.y;
    case "N":
      return w.y + w.h;
  }
}

/**
 * Box measured from a facade face: `along` a0..a1 (plan x for N/S, plan y for E/W),
 * `depth` d0..d1 measured INTO the building from the face (negative = outside), heights z0..z1.
 */
export function faceBox(side: "N" | "S" | "E" | "W", face: number, a0: number, a1: number, d0: number, d1: number, z0: number, z1: number): Box {
  const [lo, hi] = [Math.min(d0, d1), Math.max(d0, d1)];
  switch (side) {
    case "S":
      return { x: a0, w: a1 - a0, y: face + lo, h: hi - lo, z0, z1 };
    case "N":
      return { x: a0, w: a1 - a0, y: face - hi, h: hi - lo, z0, z1 };
    case "W":
      return { y: a0, h: a1 - a0, x: face + lo, w: hi - lo, z0, z1 };
    case "E":
      return { y: a0, h: a1 - a0, x: face - hi, w: hi - lo, z0, z1 };
  }
}

export function box(id: string, role: SurfaceRole, b: Box, extra: Partial<BoxPart> = {}): BoxPart {
  return { id, role, kind: "box", box: b, floor: extra.floor ?? -1, ...extra };
}

/** Split a wall into solid boxes around the openings that pierce it. */
export function splitWall(wall: WallSpec, openings: FacadeOpening[]): BoxPart[] {
  const ns = isNS(wall.side);
  const start = ns ? wall.x : wall.y;
  const end = start + (ns ? wall.w : wall.h);
  const face = outerFace(wall);
  const cuts = openings
    .filter(
      (o) =>
        o.side === wall.side &&
        Math.abs(o.face - face) < 0.02 &&
        o.a < end - EPS &&
        o.b > start + EPS &&
        o.z0 < wall.z1 - EPS &&
        o.z1 > wall.z0 + EPS,
    )
    .map((o) => ({ a: Math.max(start, o.a), b: Math.min(end, o.b), z0: Math.max(wall.z0, o.z0), z1: Math.min(wall.z1, o.z1) }));

  const out: BoxPart[] = [];
  let n = 0;
  const seg = (a: number, b: number, z0: number, z1: number) => {
    if (b - a < EPS || z1 - z0 < EPS) return;
    const bx: Box = ns ? { x: a, y: wall.y, w: b - a, h: wall.h, z0, z1 } : { x: wall.x, y: a, w: wall.w, h: b - a, z0, z1 };
    out.push(box(`${wall.id}-${n++}`, wall.role, bx, { floor: wall.floor, side: wall.side, slot: wall.slot }));
  };
  // Vertical strips between all opening edges; each strip is solid except where openings cover it
  // (handles openings stacked above each other, e.g. stair windows on every floor).
  const xs = [...new Set([start, end, ...cuts.flatMap((c) => [c.a, c.b])])].sort((p, q) => p - q);
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i];
    const b = xs[i + 1];
    if (b - a < EPS) continue;
    const holes = cuts.filter((c) => c.a < b - EPS && c.b > a + EPS).sort((p, q) => p.z0 - q.z0);
    let z = wall.z0;
    for (const h of holes) {
      seg(a, b, z, h.z0);
      z = Math.max(z, h.z1);
    }
    seg(a, b, z, wall.z1);
  }
  return out;
}

/**
 * Walls along the edges of a counter-clockwise polygon, `t` thick on the inside.
 * Convex corners are owned by the following edge and concave corners are filled, so outer faces never overlap.
 */
export function edgeWalls(
  poly: [number, number][],
  t: number,
  z0: number,
  z1: number,
  make: (i: number, side: "N" | "S" | "E" | "W") => Omit<WallSpec, "x" | "y" | "w" | "h" | "z0" | "z1" | "side"> | null,
): WallSpec[] {
  const out: WallSpec[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = poly[i];
    const [qx, qy] = poly[(i + 1) % n];
    const [rx, ry] = poly[(i + 2) % n];
    const dx = Math.sign(qx - px);
    const dy = Math.sign(qy - py);
    // turn at q: cross of (q-p) and (r-q); > 0 = left turn = convex for CCW
    const cross = (qx - px) * (ry - qy) - (qy - py) * (rx - qx);
    const endAdj = cross > 0 ? -t : t;
    const side: "N" | "S" | "E" | "W" = dx > 0 ? "S" : dx < 0 ? "N" : dy > 0 ? "E" : "W";
    const spec = make(i, side);
    if (!spec) continue;
    let r: { x: number; y: number; w: number; h: number };
    if (dy === 0) {
      const a = px;
      const b = qx + dx * endAdj;
      const [x0, x1] = [Math.min(a, b), Math.max(a, b)];
      r = { x: x0, w: x1 - x0, y: dx > 0 ? py : py - t, h: t };
    } else {
      const a = py;
      const b = qy + dy * endAdj;
      const [y0, y1] = [Math.min(a, b), Math.max(a, b)];
      r = { y: y0, h: y1 - y0, x: dy > 0 ? px - t : px, w: t };
    }
    out.push({ ...spec, ...r, z0, z1, side });
  }
  return out;
}

export const isBox = (p: Part): p is BoxPart => p.kind === "box";

export function boxesOverlap(a: Box, b: Box, eps = 1e-3): boolean {
  return (
    a.x < b.x + b.w - eps &&
    b.x < a.x + a.w - eps &&
    a.y < b.y + b.h - eps &&
    b.y < a.y + a.h - eps &&
    a.z0 < b.z1 - eps &&
    b.z0 < a.z1 - eps
  );
}
