import { describe, expect, it } from "vitest";
import { openings as planOpenings, planBounds } from "../../plan/plan";
import { PLOT, PLOT_AREA, TERRACE, TOP, X_E, X_W, level } from "../../src/exterior/model/building";
import { buildElements } from "../../src/exterior/model/elements";
import { boxesOverlap, isBox, outerFace } from "../../src/exterior/model/geom";
import { MATERIALS, PATTERNS, ROLES, defaultDesign, resolveElements, resolveRoles } from "../../src/exterior/model/resolve";
import { buildShell } from "../../src/exterior/model/shell";
import { SURFACE_ROLES, type BoxPart } from "../../src/exterior/model/types";

const shell = buildShell();
const design = defaultDesign();
const elementParts = buildElements(resolveElements(design), { openings: shell.openings });
const all = [...shell.parts, ...elementParts];

describe("exterior building model", () => {
  it("every part has a known role and a unique id", () => {
    const roles = new Set<string>(SURFACE_ROLES);
    const ids = new Set<string>();
    for (const p of all) {
      expect(roles.has(p.role), `${p.id} role ${p.role}`).toBe(true);
      expect(ids.has(p.id), `duplicate id ${p.id}`).toBe(false);
      ids.add(p.id);
    }
  });

  it("boxes have positive size", () => {
    for (const p of all.filter(isBox)) {
      const b = p.box;
      expect(b.w > 0 && b.h > 0 && b.z1 > b.z0, `${p.id} ${JSON.stringify(b)}`).toBe(true);
    }
  });

  it("matches the plan footprint (E-W extent and balconies)", () => {
    const pb = planBounds();
    expect(X_W).toBeCloseTo(pb.x, 2);
    expect(X_E).toBeCloseTo(pb.x + pb.w, 2);
  });

  it("puts every outside window/door of the plan on all 3 flat floors", () => {
    const outer = ["win-master-w", "win-mbath-w", "win-kids-w", "win-living-e", "win-kitchen-e", "win-kitchen-s", "win-gbath-s", "kitchen-balcony", "living-balcony"];
    for (const id of outer) {
      expect(planOpenings.some((o) => o.id === id)).toBe(true);
      for (const f of [1, 2, 3]) {
        const o = shell.openings.find((x) => x.id === `F${f}-${id}`);
        expect(o, `F${f}-${id}`).toBeDefined();
        expect(shell.parts.some((p) => p.id === `F${f}-${id}-frame-l`)).toBe(true);
      }
    }
    expect(shell.openings.filter((o) => o.planId === "entry")).toHaveLength(0); // flat entry is inside the lobby
  });

  it("leaves every opening clear of wall pieces", () => {
    const walls = shell.parts.filter((p): p is BoxPart => isBox(p) && /-wall-|tower-|core-|R-head-/.test(p.id));
    for (const o of shell.openings) {
      const hole = { ...(o.side === "N" || o.side === "S" ? { x: o.a, w: o.b - o.a, y: o.side === "S" ? o.face : o.face - o.depth, h: o.depth } : { y: o.a, h: o.b - o.a, x: o.side === "W" ? o.face : o.face - o.depth, w: o.depth }), z0: o.z0, z1: o.z1 };
      const hits = walls.filter((w) => boxesOverlap(w.box, hole, 0.005));
      expect(hits.map((h) => h.id), o.id).toEqual([]);
    }
  });

  it("has sensible levels: stilt + 3 floors, terrace and head room", () => {
    expect(level(0)).toBeCloseTo(0.45, 2);
    expect(level(1)).toBeCloseTo(3.45, 2);
    expect(level(2) - level(1)).toBeCloseTo(3.198, 2);
    expect(TERRACE).toBeCloseTo(13.04, 1);
    expect(TOP).toBeCloseTo(16.04, 1);
  });

  it("plot is 2 gunthas and contains the building", () => {
    expect((PLOT.x1 - PLOT.x0) * (PLOT.y1 - PLOT.y0)).toBeCloseTo(PLOT_AREA, 1);
    expect(PLOT_AREA).toBeCloseTo(202.34, 1);
    const pb = planBounds();
    expect(PLOT.x0).toBeLessThan(pb.x);
    expect(PLOT.x1).toBeGreaterThan(pb.x + pb.w);
    expect(PLOT.y0).toBeLessThan(pb.y);
    expect(PLOT.y1).toBeGreaterThan(pb.y + pb.h);
  });

  it("no two differently-styled facade boxes share an outer face (no flicker)", () => {
    const facade = all.filter((p): p is BoxPart => isBox(p) && !!p.side && ["N", "S", "E", "W"].includes(p.side) && p.role !== "interior");
    const clashes: string[] = [];
    for (let i = 0; i < facade.length; i++)
      for (let j = i + 1; j < facade.length; j++) {
        const a = facade[i];
        const b = facade[j];
        if (a.role === b.role || a.side !== b.side) continue;
        const fa = outerFace({ ...a.box, side: a.side as "N" });
        const fb = outerFace({ ...b.box, side: b.side as "N" });
        if (Math.abs(fa - fb) > 1e-4) continue;
        const ns = a.side === "N" || a.side === "S";
        const ov = (p0: number, p1: number, q0: number, q1: number) => Math.min(p1, q1) - Math.max(p0, q0) > 1e-3;
        const along = ns ? ov(a.box.x, a.box.x + a.box.w, b.box.x, b.box.x + b.box.w) : ov(a.box.y, a.box.y + a.box.h, b.box.y, b.box.y + b.box.h);
        if (along && ov(a.box.z0, a.box.z1, b.box.z0, b.box.z1)) clashes.push(`${a.id} / ${b.id}`);
      }
    expect(clashes).toEqual([]);
  });
});

describe("style config", () => {
  it("patterns are valid: known roles, hex colours, known materials", () => {
    expect(PATTERNS.length).toBeGreaterThan(0);
    for (const p of PATTERNS) {
      expect(p.palettes.some((x) => x.id === p.defaultPaletteId), p.id).toBe(true);
      for (const pal of p.palettes)
        for (const [role, st] of Object.entries(pal.roles)) {
          expect(role in ROLES, `${p.id}/${pal.id}: role ${role}`).toBe(true);
          expect(st!.color, `${p.id}/${pal.id}/${role}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
          expect(st!.material in MATERIALS, `${p.id}/${pal.id}/${role}: material ${st!.material}`).toBe(true);
        }
    }
  });

  it("every role resolves to a colour and material", () => {
    const r = resolveRoles(design);
    for (const role of SURFACE_ROLES) {
      expect(r[role].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r[role].material in MATERIALS, role).toBe(true);
    }
    expect(r.mainWall.color).toBe("#EADCCB");
    expect(r.door.color).toBe("#6B4A2E");
  });

  it("overrides win over the palette, fallbacks fill gaps", () => {
    const r = resolveRoles({ ...design, overrides: { roles: { mainWall: { color: "#112233" } }, elements: {} } });
    expect(r.mainWall.color).toBe("#112233");
    expect(r.mainWall.material).toBe("plaster");
    // compound wall is set by the palette, so it does not follow the main wall
    expect(r.compoundWall.color).toBe("#E3D5C2");
  });

  it("architect's design elements generate geometry", () => {
    for (const id of ["boxFrames", "fins", "railings", "planters", "compoundWall", "nameSign"])
      expect(elementParts.some((p) => p.element === id), id).toBe(true);
  });
});
