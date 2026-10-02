/** Walk mode physics (pure, testable): colliders from the model, ground height, sliding movement. */
import { PAVING, PLINTH, PLOT, SOUTH_FOOTPATH, WEST_FOOTPATH, WEST_ROAD } from "../model/building";
import { FOOTPRINT_RECTS } from "../model/shell";
import type { Part } from "../model/types";

export type Rect2 = { x0: number; y0: number; x1: number; y1: number };
export const EYE = 1.6;
const RADIUS = 0.25;
const NOT_SOLID = new Set(["gate", "paving", "ground", "road", "context", "lightGlow", "greenery", "glass", "sill", "soffit"]);

/** Obstacles at body height (0.5–1.9 m), from every box part. The gates are open, so you can walk in. */
export function walkColliders(parts: Part[]): Rect2[] {
  const out: Rect2[] = [];
  for (const p of parts) {
    if (p.kind !== "box" || NOT_SOLID.has(p.role)) continue;
    const b = p.box;
    if (b.z0 > 2.0 || b.z1 < 0.55) continue;
    out.push({ x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h });
  }
  return out;
}

/** Ground level under a point: road 0, footpath 0.1, plot paving 0.3, parking floor 0.45. */
export function groundAt(x: number, y: number): number {
  if (FOOTPRINT_RECTS.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)) return PLINTH;
  if (x >= PLOT.x0 && x <= PLOT.x1 && y >= PLOT.y0 && y <= PLOT.y1) return PAVING;
  const onWestRoad = x >= WEST_ROAD.x0 && x < WEST_ROAD.x1;
  if (y >= SOUTH_FOOTPATH.y0 && y < SOUTH_FOOTPATH.y1 && !onWestRoad) return 0.1; // south footpath
  if (x >= WEST_FOOTPATH.x0 && x < WEST_FOOTPATH.x1 && y >= SOUTH_FOOTPATH.y0) return 0.1; // west footpath
  return 0;
}

const hits = (x: number, y: number, cs: Rect2[]) => cs.some((c) => x > c.x0 - RADIUS && x < c.x1 + RADIUS && y > c.y0 - RADIUS && y < c.y1 + RADIUS);

/** Area you can walk in: the plot, the footpath and the near side of the road. */
const BOUNDS: Rect2 = { x0: PLOT.x0 - 14, y0: PLOT.y0 - 9, x1: PLOT.x1 + 14, y1: PLOT.y1 - 0.3 };

/** Move by (dx, dy) with wall sliding: each axis is tried on its own. */
export function slide(x: number, y: number, dx: number, dy: number, cs: Rect2[]): [number, number] {
  let nx = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, x + dx));
  if (hits(nx, y, cs)) nx = x;
  let ny = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, y + dy));
  if (hits(nx, ny, cs)) ny = y;
  return [nx, ny];
}
