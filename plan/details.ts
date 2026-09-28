/**
 * Architectural finishing layer derived from plan.ts (pure data, plan metres):
 * skirting runs, false-ceiling trays with LED cove, downlight points.
 * Budget: skirting → paint line, trays/downlights → false ceiling + LED line (no new heads).
 */
import { CEILING_M, roomById, walls, type Rect, type RoomId } from "./plan";
import { wallBoxes } from "./geometry";

export const SKIRTING_H = 0.09;
export const SKIRTING_T = 0.012;

/** Dry rooms get painted skirting; wet rooms are tiled, storage is shuttered. */
export const SKIRTED_ROOMS: RoomId[] = ["living", "kitchen", "master", "kids", "foyer"];

const fullBoxes = () => walls.flatMap(wallBoxes).filter((b) => b.z0 < 0.01 && b.z1 >= 0.5 && b.wall.kind !== "parapet");

/** Skirting strips along every wall face of the skirted rooms (door gaps skipped, window sills kept). */
export function skirtingRuns(): (Rect & { room: RoomId })[] {
  const boxes = fullBoxes();
  const solid = (x: number, y: number) => boxes.some((b) => x >= b.x - 1e-6 && x <= b.x + b.w + 1e-6 && y >= b.y - 1e-6 && y <= b.y + b.h + 1e-6);
  const out: (Rect & { room: RoomId })[] = [];
  const step = 0.02;
  for (const id of SKIRTED_ROOMS) {
    const r = roomById[id];
    const edges = [
      { horiz: true, line: r.y, out: -0.03, a: r.x, b: r.x + r.w, inward: 1 },
      { horiz: true, line: r.y + r.h, out: 0.03, a: r.x, b: r.x + r.w, inward: -1 },
      { horiz: false, line: r.x, out: -0.03, a: r.y, b: r.y + r.h, inward: 1 },
      { horiz: false, line: r.x + r.w, out: 0.03, a: r.y, b: r.y + r.h, inward: -1 },
    ];
    for (const e of edges) {
      let start: number | null = null;
      const flush = (end: number) => {
        if (start === null) return;
        if (end - start > 0.05) {
          const t = e.inward > 0 ? e.line : e.line - SKIRTING_T;
          out.push(
            e.horiz ? { room: id, x: start, y: t, w: end - start, h: SKIRTING_T } : { room: id, x: t, y: start, w: SKIRTING_T, h: end - start },
          );
        }
        start = null;
      };
      for (let s = e.a; s <= e.b + 1e-9; s += step) {
        const p = Math.min(s + step / 2, e.b);
        const has = e.horiz ? solid(p, e.line + e.out) : solid(e.line + e.out, p);
        if (has && start === null) start = s;
        if (!has) flush(s);
      }
      flush(e.b);
    }
  }
  return out;
}

export type Tray = { room: RoomId; band: number; drop: number };
/** Simple peripheral trays (mid false-ceiling budget) in living + master; cove LED on the inner lip. */
export const ceilingTrays: Tray[] = [
  { room: "living", band: 0.55, drop: 0.3 },
  { room: "master", band: 0.5, drop: 0.3 },
];

export type Downlight = { room: RoomId; x: number; y: number; h: number };

/** Downlight points: along the tray band in tray rooms, a light grid elsewhere. */
export function downlights(): Downlight[] {
  const out: Downlight[] = [];
  const grid = (id: RoomId, nx: number, ny: number, inset = 0.6) => {
    const r = roomById[id];
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++)
        out.push({
          room: id,
          x: nx === 1 ? r.x + r.w / 2 : r.x + inset + ((r.w - 2 * inset) * i) / (nx - 1),
          y: ny === 1 ? r.y + r.h / 2 : r.y + inset + ((r.h - 2 * inset) * j) / (ny - 1),
          h: CEILING_M,
        });
  };
  for (const t of ceilingTrays) {
    const r = roomById[t.room];
    const h = CEILING_M - t.drop;
    const m = t.band / 2;
    const xs = [r.x + r.w * 0.25, r.x + r.w * 0.75];
    const ys = [r.y + r.h * 0.25, r.y + r.h * 0.75];
    for (const x of xs) out.push({ room: t.room, x, y: r.y + m, h }, { room: t.room, x, y: r.y + r.h - m, h });
    for (const y of ys) out.push({ room: t.room, x: r.x + m, y, h }, { room: t.room, x: r.x + r.w - m, y, h });
  }
  grid("kitchen", 2, 2, 0.9);
  grid("kids", 2, 2, 0.9);
  grid("foyer", 2, 1, 0.7);
  grid("masterBath", 1, 1);
  grid("guestBath", 1, 1);
  grid("kitchenBalcony", 1, 1);
  grid("livingBalcony", 1, 1);
  return out;
}
