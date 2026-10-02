import { describe, expect, it } from "vitest";
import optional from "../../src/exterior/config/optional.json";
import { buildElements } from "../../src/exterior/model/elements";
import { boxesOverlap, isBox } from "../../src/exterior/model/geom";
import { defaultDesign, resolveElements } from "../../src/exterior/model/resolve";
import { buildShell, type OptionalChanges } from "../../src/exterior/model/shell";
import type { BoxPart } from "../../src/exterior/model/types";

const ids = Object.keys(optional).filter((k) => !k.startsWith("_")) as (keyof OptionalChanges)[];

describe("optional bigger changes (need architect approval)", () => {
  it("are all off by default", () => {
    expect(defaultDesign().optional ?? {}).toEqual({});
  });

  for (const id of [...ids, "all" as const])
    it(`${id}: valid geometry, openings stay clear`, () => {
      const opt: OptionalChanges = id === "all" ? Object.fromEntries(ids.map((k) => [k, true])) : { [id]: true };
      const shell = buildShell(opt);
      const parts = [...shell.parts, ...buildElements(resolveElements(defaultDesign("warmCurves")), { openings: shell.openings })];
      const seen = new Set<string>();
      for (const p of parts) {
        expect(seen.has(p.id), p.id).toBe(false);
        seen.add(p.id);
      }
      const walls = shell.parts.filter((p): p is BoxPart => isBox(p) && /-wall-|tower-|core-|R-head-/.test(p.id));
      for (const o of shell.openings) {
        const hole = { ...(o.side === "N" || o.side === "S" ? { x: o.a, w: o.b - o.a, y: o.side === "S" ? o.face : o.face - o.depth, h: o.depth } : { y: o.a, h: o.b - o.a, x: o.side === "W" ? o.face : o.face - o.depth, w: o.depth }), z0: o.z0, z1: o.z1 };
        expect(walls.filter((w) => boxesOverlap(w.box, hole, 0.005)).map((w) => w.id), o.id).toEqual([]);
      }
    });

  it("each change really changes the openings", () => {
    const base = buildShell().openings;
    const width = (os: typeof base, id: string) => os.find((o) => o.id === id)!.b - os.find((o) => o.id === id)!.a;
    expect(width(buildShell({ widerBedroomWindows: true }).openings, "F1-win-master-w")).toBeCloseTo(2.13, 2);
    expect(width(buildShell({ kitchenBalconySlider: true }).openings, "F1-kitchen-balcony")).toBeCloseTo(1.5, 2);
    expect(buildShell({ masterRoadWindow: true }).openings.filter((o) => o.planId === "opt-win-master-s")).toHaveLength(3);
    const h = (os: typeof base) => os.find((o) => o.id === "F1-stair-a")!.z1 - os.find((o) => o.id === "F1-stair-a")!.z0;
    expect(h(buildShell({ tallerStairWindows: true }).openings) - h(base)).toBeCloseTo(0.6, 2);
    expect(base.length).toBeGreaterThan(0);
  });
});
