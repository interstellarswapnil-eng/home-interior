import { describe, expect, it } from "vitest";
import { PLOT, SOUTH_ROAD, WEST_FOOTPATH, WEST_ROAD, X_W } from "../../src/exterior/model/building";
import { contextParts } from "../../src/exterior/model/context";
import { isBox } from "../../src/exterior/model/geom";
import { buildShell } from "../../src/exterior/model/shell";
import { groundAt } from "../../src/exterior/scene/walk";

const shell = buildShell();
const box = (id: string) => {
  const p = shell.parts.find((x) => x.id === id);
  if (!p || !isBox(p)) throw new Error(id);
  return p.box;
};

describe("roads: main road (south) + side road (west, windows side)", () => {
  it("the side road runs north–south along the west of the plot, beyond its footpath", () => {
    const r = box("site-road-west");
    expect(r.x + r.w).toBeCloseTo(WEST_FOOTPATH.x0, 3);
    expect(r.x + r.w).toBeLessThan(PLOT.x0);
    expect(r.x + r.w).toBeLessThan(X_W);
    expect(r.h).toBeGreaterThan(100); // long, perpendicular to the south road
    expect(r.y).toBeCloseTo(SOUTH_ROAD.y1, 3); // joins the main road
  });

  it("footpaths meet at the corner and the south footpath does not cross the side road", () => {
    const s = box("site-footpath");
    const w = box("site-footpath-west");
    expect(s.x).toBeCloseTo(WEST_FOOTPATH.x0, 3);
    expect(w.x).toBeCloseTo(WEST_FOOTPATH.x0, 3);
    const sw = box("site-footpath-sw");
    expect(sw.x + sw.w).toBeCloseTo(WEST_ROAD.x0, 3);
  });

  it("nothing from the context (neighbours, lamps) stands on a road", () => {
    for (const p of contextParts({ neighbours: true, car: true, person: true })) {
      if (!isBox(p) || p.role === "lightGlow" || p.id.includes("-arm") || p.id.includes("-head")) continue;
      const b = p.box;
      if (b.z0 > 3) continue; // overhead wires may cross a road
      const onWest = b.x < WEST_ROAD.x1 - 1e-3 && b.x + b.w > WEST_ROAD.x0 + 1e-3 && b.y + b.h > SOUTH_ROAD.y1;
      const onSouth = b.y < SOUTH_ROAD.y1 - 1e-3 && b.y + b.h > SOUTH_ROAD.y0 + 1e-3;
      expect(onWest || onSouth, p.id).toBe(false);
    }
  });

  it("walk heights: side road 0, west footpath 0.1", () => {
    expect(groundAt((WEST_ROAD.x0 + WEST_ROAD.x1) / 2, PLOT.y0 + 5)).toBe(0);
    expect(groundAt((WEST_FOOTPATH.x0 + WEST_FOOTPATH.x1) / 2, PLOT.y0 + 5)).toBeCloseTo(0.1);
    expect(groundAt((WEST_ROAD.x0 + WEST_ROAD.x1) / 2, PLOT.y0 - 1)).toBe(0); // the junction is road, not footpath
  });
});
