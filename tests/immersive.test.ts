import { describe, expect, it } from "vitest";
import { roomById, type RoomId } from "../plan/plan";
import { EYE_H, PLAYER_R, distToBox, hits, moveWithCollision, roomAt, walkColliders, wallColliders } from "../plan/collision";
import { INTRO_SECONDS, TOUR_SECONDS, tourPath, tourState, tourStops, walkSpawn } from "../plan/tour";

const plan = (w: [number, number, number]) => ({ x: w[0], y: -w[2] });
const inRoom = (p: { x: number; y: number }, id: RoomId) => {
  const r = roomById[id];
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
};

/** Walk a polyline of plan targets with the real collision step; returns the final point. */
function walk(route: [number, number][], start = plan(walkSpawn.position)) {
  let p = start;
  for (const [tx, ty] of route) {
    for (let i = 0; i < 400; i++) {
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.02) break;
      const s = Math.min(d, 1.4 / 60); // 1.4 m/s at 60 fps
      p = moveWithCollision(p, (dx / d) * s, (dy / d) * s);
    }
  }
  return p;
}

describe("walk mode collision", () => {
  it("spawns in the foyer at eye height, clear of everything", () => {
    expect(walkSpawn.position[1]).toBeCloseTo(EYE_H);
    const p = plan(walkSpawn.position);
    expect(inRoom(p, "foyer")).toBe(true);
    expect(hits(p.x, p.y, PLAYER_R)).toBeUndefined();
  });

  it("walks foyer → living → kitchen → master → kids through the door gaps", () => {
    const living = walk([[6.5, 5.3], [7.0, 7.0]]);
    expect(inRoom(living, "living")).toBe(true);
    const kitchen = walk([[6.8, 4.2], [7.5, 2.8]], living);
    expect(inRoom(kitchen, "kitchen")).toBe(true);
    const master = walk([[6.2, 3.9], [3.2, 3.9], [3.2, 2.3]], kitchen);
    expect(inRoom(master, "master")).toBe(true);
    const kids = walk([[3.2, 3.9], [3.25, 3.95], [3.0, 5.2]], master);
    expect(inRoom(kids, "kids")).toBe(true);
  });

  it("cannot pass through walls, the closed entry door or the lift core", () => {
    // push west from the kids room into the exterior wall
    const a = walk([[-1, 6.2]], { x: 1.2, y: 5.2 });
    expect(a.x).toBeGreaterThanOrEqual(PLAYER_R - 1e-6);
    // from living, straight at the closed entry door (to the common lobby)
    const b = walk([[4.5, 8.9]], { x: 6.6, y: 8.9 });
    expect(b.x).toBeGreaterThan(roomById.living.x);
    // from the hall straight north through storage shutters towards the lift
    const c = walk([[4.8, 7.0]], { x: 4.8, y: 3.9 });
    expect(c.y).toBeLessThan(roomById.storage.y);
    // off the south balcony parapet
    const d = walk([[7.3, 1.5], [7.3, -3]], { x: 7.3, y: 2.2 });
    expect(d.y).toBeGreaterThan(roomById.kitchenBalcony.y);
  });

  it("slides along walls instead of sticking", () => {
    const p = walk([[5.2, 4.3]], { x: 3.0, y: 4.3 });
    expect(p.x).toBeGreaterThan(5.0);
  });

  it("roomAt labels the room you stand in", () => {
    expect(roomAt(7, 7)?.id).toBe("living");
    expect(roomAt(1, 1)?.id).toBe("master");
  });
});

describe("guided tour", () => {
  it("lasts 45–75 s", () => {
    expect(TOUR_SECONDS).toBeGreaterThanOrEqual(45);
    expect(TOUR_SECONDS).toBeLessThanOrEqual(75);
  });

  it("stays at eye height (1.6 m) after the establishing shot", () => {
    for (const w of tourPath) expect(w.position[1]).toBeCloseTo(EYE_H);
    for (let t = INTRO_SECONDS; t <= TOUR_SECONDS; t += 0.25) expect(tourState(t).position[1]).toBeCloseTo(EYE_H, 1);
  });

  it("stops in foyer, living, kitchen, master (+ ensuite peek) and kids with titles", () => {
    const titled = tourStops.filter((s) => s.w.title);
    const rooms = new Set(
      titled.map((s) => {
        const p = plan(s.w.position);
        return roomAt(p.x, p.y)?.id;
      }),
    );
    for (const id of ["foyer", "living", "kitchen", "master", "kids"] as const) expect(rooms.has(id), id).toBe(true);
    expect(titled.some((s) => s.w.room === "masterBath")).toBe(true);
    expect(titled.map((s) => s.w.title)).toContain("Master ensuite");
  });

  it("acknowledges the south kitchen balcony (looks out over it, never walks onto the slab)", () => {
    const b = roomById.kitchenBalcony;
    const s = tourPath.find((w) => w.id === "south-balcony")!;
    const look = plan(s.lookAt);
    expect(look.x >= b.x && look.x <= b.x + b.w && look.y < b.y + b.h).toBe(true);
    for (let t = 0; t <= TOUR_SECONDS; t += 0.1) {
      const f = tourState(t);
      if (f.intro) continue;
      expect(inRoom(plan(f.position), "kitchenBalcony")).toBe(false);
    }
  });

  it("waypoints keep ≥0.4 m from walls", () => {
    for (const w of tourPath) {
      const p = plan(w.position);
      const d = Math.min(...wallColliders().map((b) => distToBox(p.x, p.y, b)));
      expect(d, w.id).toBeGreaterThanOrEqual(0.4);
    }
  });

  it("never clips walls, furniture or the lift core along the whole path", () => {
    const cols = walkColliders();
    for (let t = INTRO_SECONDS; t <= TOUR_SECONDS; t += 0.02) {
      const p = plan(tourState(t).position);
      const hit = hits(p.x, p.y, 0.12, cols);
      expect(hit?.id, `t=${t.toFixed(2)} at (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).toBeUndefined();
    }
  });

  it("moves smoothly (no jumps between 60 fps frames)", () => {
    let prev = tourState(INTRO_SECONDS).position;
    for (let t = INTRO_SECONDS; t <= TOUR_SECONDS; t += 1 / 60) {
      const p = tourState(t).position;
      expect(Math.hypot(p[0] - prev[0], p[2] - prev[2])).toBeLessThan(0.06);
      prev = p;
    }
  });

  it("shows readable titles at each stop and finishes", () => {
    for (const s of tourStops.filter((x) => x.w.title)) {
      const f = tourState((s.arrive + s.depart) / 2);
      expect(f.title).toBe(s.w.title);
      expect(f.titleOpacity).toBeGreaterThan(0.95);
    }
    expect(tourState(TOUR_SECONDS + 1).done).toBe(true);
  });
});
