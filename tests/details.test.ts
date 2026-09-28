import { describe, expect, it } from "vitest";
import { openings, roomById } from "../plan/plan";
import { SKIRTED_ROOMS, ceilingTrays, downlights, skirtingRuns } from "../plan/details";

describe("design details layer", () => {
  const runs = skirtingRuns();
  it("runs skirting in every dry room", () => {
    for (const id of SKIRTED_ROOMS) expect(runs.some((r) => r.room === id), id).toBe(true);
  });
  it("leaves every door gap clear of skirting", () => {
    for (const o of openings.filter((x) => x.type === "door" || x.type === "doubleDoor")) {
      const horiz = o.rotationDeg === 90;
      const mid = horiz ? { x: o.x + o.w / 2, y: o.y } : { x: o.x, y: o.y + o.w / 2 };
      const blocked = runs.some((r) => mid.x > r.x - 0.12 && mid.x < r.x + r.w + 0.12 && mid.y > r.y - 0.12 && mid.y < r.y + r.h + 0.12 && (horiz ? r.w > r.h : r.h > r.w) && (horiz ? mid.x > r.x && mid.x < r.x + r.w : mid.y > r.y && mid.y < r.y + r.h));
      expect(blocked, o.id).toBe(false);
    }
  });
  it("stays out of the open living–kitchen junction", () => {
    const y = roomById.living.y;
    expect(runs.some((r) => r.w > r.h && Math.abs(r.y - y) < 0.02 && r.x >= roomById.living.x - 1e-6)).toBe(false);
  });
  it("places trays in living + master and downlights inside their rooms", () => {
    expect(ceilingTrays.map((t) => t.room).sort()).toEqual(["living", "master"]);
    for (const d of downlights()) {
      const r = roomById[d.room];
      expect(d.x > r.x && d.x < r.x + r.w && d.y > r.y && d.y < r.y + r.h, d.room).toBe(true);
    }
  });
});
