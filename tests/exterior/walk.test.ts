import { describe, expect, it } from "vitest";
import { PLOT, X_WING, Y_NOTCH } from "../../src/exterior/model/building";
import { buildElements } from "../../src/exterior/model/elements";
import { defaultDesign, resolveElements } from "../../src/exterior/model/resolve";
import { buildShell } from "../../src/exterior/model/shell";
import { WALK_START } from "../../src/exterior/scene/cameras";
import { groundAt, slide, walkColliders } from "../../src/exterior/scene/walk";

const shell = buildShell();
const parts = [...shell.parts, ...buildElements(resolveElements(defaultDesign("architect")), { openings: shell.openings })];
const cs = walkColliders(parts);

function walk(x: number, y: number, tx: number, ty: number, steps = 400): [number, number] {
  for (let i = 0; i < steps; i++) {
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) break;
    [x, y] = slide(x, y, (dx / d) * 0.05, (dy / d) * 0.05, cs);
  }
  return [x, y];
}

describe("walk mode", () => {
  it("starts on the footpath, outside the plot", () => {
    expect(WALK_START.y).toBeLessThan(PLOT.y0);
    expect(groundAt(WALK_START.x, WALK_START.y)).toBeCloseTo(0.1);
  });

  it("can walk in through the pedestrian gate and under the building (parking)", () => {
    const [x, y] = walk(WALK_START.x, WALK_START.y, WALK_START.x, Y_NOTCH + 1.5);
    expect(y).toBeGreaterThan(PLOT.y0 + 1);
    expect(groundAt(x, y)).toBeGreaterThan(0.29);
  });

  it("is stopped by the compound wall", () => {
    const [, y] = walk(PLOT.x0 + 1.0, PLOT.y0 - 1.0, PLOT.x0 + 1.0, PLOT.y0 + 2.0);
    expect(y).toBeLessThan(PLOT.y0);
  });

  it("is stopped by the stair / lift core walls on the ground floor", () => {
    // from the parking towards the stair core (north-west)
    const [, y] = walk(2.0, 4.0, 2.0, 9.0);
    expect(y).toBeLessThan(7.9);
  });

  it("ground heights: road, plot, parking", () => {
    expect(groundAt(5, PLOT.y0 - 6)).toBe(0);
    expect(groundAt(X_WING + 1, PLOT.y0 + 1)).toBeCloseTo(0.3);
    expect(groundAt(7, 3)).toBeCloseTo(0.45);
  });
});
