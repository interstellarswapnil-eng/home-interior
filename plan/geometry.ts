/**
 * Pure helpers derived from plan.ts — shared by 2D and 3D so both read the same data.
 */
import { CEILING_M, FT, openingBand, openings, type Opening, type Wall } from "./plan";

/** 3.2 m → 10'6" */
export function fmtFtIn(m: number): string {
  const totalIn = Math.round(m / FT * 12);
  const f = Math.floor(totalIn / 12);
  const i = totalIn - f * 12;
  return i ? `${f}'${i}"` : `${f}'`;
}

export function fmtM(m: number): string {
  return `${m.toFixed(2)} m`;
}

/** Is the wall horizontal (runs E-W)? */
export const isHorizontal = (w: Wall) => w.w >= w.h;

/** Openings that cut through a given wall. */
export function openingsInWall(wall: Wall, list: Opening[] = openings): Opening[] {
  const eps = 0.011;
  const horiz = isHorizontal(wall);
  return list.filter((o) => {
    const oHoriz = o.rotationDeg === 90 || o.rotationDeg === 270;
    if (oHoriz !== horiz) return false;
    if (horiz) {
      const onLine = o.y >= wall.y - eps && o.y <= wall.y + wall.h + eps;
      return onLine && o.x < wall.x + wall.w - eps && o.x + o.w > wall.x + eps;
    }
    const onLine = o.x >= wall.x - eps && o.x <= wall.x + wall.w + eps;
    return onLine && o.y < wall.y + wall.h - eps && o.y + o.w > wall.y + eps;
  });
}

/** Axis-aligned box in plan space with a vertical band (m). */
export type WallBox = { x: number; y: number; w: number; h: number; z0: number; z1: number; wall: Wall };

/**
 * Split a wall into solid boxes around its openings:
 * full-height pieces between openings, plus sill (below) and lintel (above) pieces.
 */
export function wallBoxes(wall: Wall): WallBox[] {
  const H = wall.height ?? CEILING_M;
  const horiz = isHorizontal(wall);
  const start = horiz ? wall.x : wall.y;
  const len = horiz ? wall.w : wall.h;
  const cuts = openingsInWall(wall)
    .map((o) => {
      const a = Math.max(start, horiz ? o.x : o.y);
      const b = Math.min(start + len, (horiz ? o.x : o.y) + o.w);
      return { a, b, ...openingBand(o) };
    })
    .sort((p, q) => p.a - q.a);

  const out: WallBox[] = [];
  const seg = (a: number, b: number, z0: number, z1: number) => {
    if (b - a < 1e-4 || z1 - z0 < 1e-4) return;
    out.push(
      horiz
        ? { x: a, y: wall.y, w: b - a, h: wall.h, z0, z1, wall }
        : { x: wall.x, y: a, w: wall.w, h: b - a, z0, z1, wall },
    );
  };
  let cursor = start;
  for (const c of cuts) {
    seg(cursor, c.a, 0, H);
    seg(c.a, c.b, 0, Math.min(c.sill, H));
    seg(c.a, c.b, Math.min(c.head, H), H);
    cursor = Math.max(cursor, c.b);
  }
  seg(cursor, start + len, 0, H);
  return out;
}

/** Wall pieces in plan (2D) — just the solid spans, ignoring heights. */
export function wallSpans2D(wall: Wall): { x: number; y: number; w: number; h: number }[] {
  const horiz = isHorizontal(wall);
  const start = horiz ? wall.x : wall.y;
  const len = horiz ? wall.w : wall.h;
  const cuts = openingsInWall(wall)
    .map((o) => ({ a: horiz ? o.x : o.y, b: (horiz ? o.x : o.y) + o.w }))
    .sort((p, q) => p.a - q.a);
  const out: { x: number; y: number; w: number; h: number }[] = [];
  let cursor = start;
  const push = (a: number, b: number) => {
    if (b - a < 1e-4) return;
    out.push(horiz ? { x: a, y: wall.y, w: b - a, h: wall.h } : { x: wall.x, y: a, w: wall.w, h: b - a });
  };
  for (const c of cuts) {
    push(cursor, Math.max(cursor, c.a));
    cursor = Math.max(cursor, c.b);
  }
  push(cursor, start + len);
  return out;
}

/** Thickness band of the wall an opening sits in (for drawing jambs/leaves). */
export function hostWall(o: Opening, walls: Wall[]): Wall | undefined {
  return walls.find((w) => openingsInWall(w, [o]).length > 0);
}
