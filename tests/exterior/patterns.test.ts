import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import catalogue from "../../src/exterior/config/elements.json";
import { ELEMENT_GENERATORS, buildElements } from "../../src/exterior/model/elements";
import { isBox, outerFace } from "../../src/exterior/model/geom";
import { MATERIALS, PATTERNS, resolveElements, resolveRoles } from "../../src/exterior/model/resolve";
import { buildShell } from "../../src/exterior/model/shell";
import { SLOTS } from "../../src/exterior/model/slots";
import { SURFACE_ROLES, type BoxPart, type Part } from "../../src/exterior/model/types";

const shell = buildShell();
const CATALOGUE = catalogue as unknown as Record<string, { status: string; label: string; tip: string }>;
const slotIds = new Set(SLOTS.map((s) => s.id));

function facadeClashes(parts: Part[]): string[] {
  const facade = parts.filter((p): p is BoxPart => isBox(p) && !!p.side && ["N", "S", "E", "W"].includes(p.side) && p.role !== "interior");
  const out: string[] = [];
  const ov = (p0: number, p1: number, q0: number, q1: number) => Math.min(p1, q1) - Math.max(p0, q0) > 1e-3;
  for (let i = 0; i < facade.length; i++)
    for (let j = i + 1; j < facade.length; j++) {
      const a = facade[i];
      const b = facade[j];
      if (a.role === b.role || a.side !== b.side) continue;
      if (Math.abs(outerFace({ ...a.box, side: a.side as "N" }) - outerFace({ ...b.box, side: b.side as "N" })) > 1e-4) continue;
      const ns = a.side === "N" || a.side === "S";
      const along = ns ? ov(a.box.x, a.box.x + a.box.w, b.box.x, b.box.x + b.box.w) : ov(a.box.y, a.box.y + a.box.h, b.box.y, b.box.y + b.box.h);
      if (along && ov(a.box.z0, a.box.z1, b.box.z0, b.box.z1)) out.push(`${a.id} / ${b.id}`);
    }
  return out;
}

describe("design library", () => {
  it("has the architect's design, the 6 starting patterns and My references", () => {
    expect(PATTERNS.filter((p) => p.kind !== "concept").map((p) => p.id)).toEqual(["architect", "warmMinimal", "japandi", "darkModern", "tropicalModern", "earthyOrganic", "brickConcrete", "warmCurves"]);
    expect(PATTERNS.filter((p) => p.kind === "concept").map((p) => p.id)).toEqual(["c1TravertineLantern", "c2SoftStreamline", "c3SquircleGarden", "c4QuarterArc", "c5BrassLotus", "c6TaupeFlute", "c7DeccanVeranda"]);
  });

  it("each pattern (except the architect's) has ≥3 palettes and exactly one recommended", () => {
    for (const p of PATTERNS.filter((x) => x.id !== "architect")) {
      // v2 concepts get their 2–3 palette variants in Step 3; until then one is enough
      expect(p.palettes.length, p.id).toBeGreaterThanOrEqual(p.kind === "concept" ? 1 : 3);
      expect(p.palettes.filter((x) => x.recommended).length, p.id).toBe(1);
      expect(p.notes.climate && p.notes.maintenance && p.notes.relativeCost, p.id).toBeTruthy();
    }
  });

  it("pattern elements are in the catalogue, ready ones have generators, slots exist", () => {
    for (const p of PATTERNS)
      for (const [id, cfg] of Object.entries(p.elements)) {
        const type = (cfg.params?.type as string) ?? id;
        expect(CATALOGUE[type] ?? ELEMENT_GENERATORS[type], `${p.id}: element ${id} (${type})`).toBeDefined();
        if (CATALOGUE[type]?.status === "ready" || !CATALOGUE[type]) expect(ELEMENT_GENERATORS[type], `${p.id}: generator ${type}`).toBeDefined();
        for (const s of cfg.slots ?? []) expect(slotIds.has(s), `${p.id}/${id}: slot ${s}`).toBe(true);
      }
  });

  it("every catalogue entry has a label and tip; ready entries have generators", () => {
    for (const [id, c] of Object.entries(CATALOGUE)) {
      if (id.startsWith("_")) continue;
      expect(c.label && c.tip, id).toBeTruthy();
      if (c.status === "ready") expect(ELEMENT_GENERATORS[id], id).toBeDefined();
    }
  });

  it("textured materials have their files on disk", () => {
    for (const [id, m] of Object.entries(MATERIALS)) {
      if (!m.textureSet) continue;
      for (const f of ["albedo", "normal", "rough"]) expect(existsSync(`public/exterior/textures/${m.textureSet}/${f}.jpg`), `${id}: ${m.textureSet}/${f}`).toBe(true);
      if (m.normalSet) expect(existsSync(`public/exterior/textures/${m.normalSet}/normal.jpg`), id).toBe(true);
    }
  });

  for (const p of PATTERNS)
    for (const pal of p.palettes)
      it(`${p.id} / ${pal.id}: builds valid geometry with no facade flicker`, () => {
        const design = { patternId: p.id, paletteId: pal.id, overrides: { roles: {}, elements: {} } };
        const roles = resolveRoles(design);
        for (const r of SURFACE_ROLES) expect(roles[r].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        const parts = [...shell.parts, ...buildElements(resolveElements(design), { openings: shell.openings })];
        const ids = new Set<string>();
        for (const part of parts) {
          expect(ids.has(part.id), `duplicate ${part.id}`).toBe(false);
          ids.add(part.id);
          if (isBox(part)) expect(part.box.w > 0 && part.box.h > 0 && part.box.z1 > part.box.z0, `${part.id}`).toBe(true);
        }
        expect(facadeClashes(parts)).toEqual([]);
      });
});
