/**
 * Walk-mode collision, derived from plan.ts (walls split around openings, closed doors,
 * lift core, furniture footprints). Pure — used by WalkControls, tour tests and vitest.
 * All coordinates are plan metres (x east, y north).
 */
import { furniture, openings, roomById, walls, type Opening } from "./plan";
import { hostWall, wallBoxes } from "./geometry";

export type AABB = { id: string; x0: number; y0: number; x1: number; y1: number; kind: "wall" | "closed" | "core" | "furniture" };

/** Player radius (m) for walk mode. */
export const PLAYER_R = 0.2;
/** Eye height (m) for walk + tour. */
export const EYE_H = 1.6;

/** Openings that stay shut in the model — you can't walk through them. */
export const CLOSED_OPENINGS = new Set(["entry", "storage-door", "lift-door"]);

/** Furniture you bump into (low items on counters, curtains, shower trays etc. are skipped). */
const BLOCKING_KINDS = new Set([
  "sofa3",
  "loungeChair",
  "coffeeTable",
  "tvUnit",
  "counter",
  "fridge",
  "queenBed",
  "singleBed",
  "sideTable",
  "wardrobe",
  "studyDesk",
  "chair",
  "shelving",
  "utilityRack",
  "wc",
  "basin",
  "showerGlass",
  "washZone",
]);

function openingRect(o: Opening): AABB | null {
  const w = hostWall(o, walls);
  if (!w) return null;
  const horiz = o.rotationDeg === 90 || o.rotationDeg === 270;
  return horiz
    ? { id: o.id, kind: "closed", x0: o.x, x1: o.x + o.w, y0: w.y, y1: w.y + w.h }
    : { id: o.id, kind: "closed", x0: w.x, x1: w.x + w.w, y0: o.y, y1: o.y + o.w };
}

let cache: { walls: AABB[]; all: AABB[] } | null = null;

/** Wall pieces that block a body (anything starting below 1.2 m: full walls, window sills, parapets). */
export function wallColliders(): AABB[] {
  build();
  return cache!.walls;
}

/** Everything that blocks walking. */
export function walkColliders(): AABB[] {
  build();
  return cache!.all;
}

function build() {
  if (cache) return;
  const wallsA: AABB[] = walls
    .flatMap(wallBoxes)
    .filter((b) => b.z0 < 1.2)
    .map((b, i) => ({ id: `${b.wall.id}#${i}`, kind: "wall" as const, x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h }));
  const closed = openings.filter((o) => CLOSED_OPENINGS.has(o.id)).map(openingRect).filter((r): r is AABB => !!r);
  const lift = roomById.lift;
  const core: AABB = { id: "lift", kind: "core", x0: lift.x, y0: lift.y, x1: lift.x + lift.w, y1: lift.y + lift.h };
  const furn: AABB[] = furniture
    .filter((f) => BLOCKING_KINDS.has(f.kind))
    .map((f) => ({ id: f.id, kind: "furniture" as const, x0: f.x, y0: f.y, x1: f.x + f.w, y1: f.y + f.h }));
  const wallsAll = [...wallsA, ...closed, core];
  cache = { walls: wallsAll, all: [...wallsAll, ...furn] };
}

/** Distance from a point to an AABB (0 if inside). */
export function distToBox(x: number, y: number, b: AABB): number {
  const dx = Math.max(b.x0 - x, 0, x - b.x1);
  const dy = Math.max(b.y0 - y, 0, y - b.y1);
  return Math.hypot(dx, dy);
}

export function hits(x: number, y: number, r: number, cols: AABB[] = walkColliders()): AABB | undefined {
  return cols.find((b) => distToBox(x, y, b) < r);
}

/**
 * Move by (dx, dy) with sliding: sub-steps of ≤5 cm, each axis resolved separately,
 * so you glide along walls and can never tunnel through a 100 mm partition.
 */
export function moveWithCollision(
  p: { x: number; y: number },
  dx: number,
  dy: number,
  cols: AABB[] = walkColliders(),
  r = PLAYER_R,
): { x: number; y: number } {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.05));
  let { x, y } = p;
  for (let i = 0; i < steps; i++) {
    const nx = x + dx / steps;
    if (!hits(nx, y, r, cols)) x = nx;
    const ny = y + dy / steps;
    if (!hits(x, ny, r, cols)) y = ny;
  }
  return { x, y };
}

/** Which room (if any) contains a plan point — for the HUD label. */
export function roomAt(x: number, y: number) {
  return Object.values(roomById).find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}
