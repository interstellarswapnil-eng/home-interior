import { describe, expect, it } from "vitest";
import { approvalFlags, qualityGate } from "../../src/exterior/model/approval";
import { buildElements } from "../../src/exterior/model/elements";
import { fixtureSummary, fixturesFromParts, lightingScheduleCsv } from "../../src/exterior/model/fixtures";
import { PATTERNS, defaultDesign, resolveElements } from "../../src/exterior/model/resolve";
import { buildShell } from "../../src/exterior/model/shell";

const concepts = PATTERNS.filter((p) => p.kind === "concept");
const partsFor = (id: string) => {
  const d = defaultDesign(id);
  const sh = buildShell(d.optional ?? {});
  return { d, parts: [...sh.parts, ...buildElements(resolveElements(d), { openings: sh.openings })] };
};

describe("v2 concepts", () => {
  it("there are 7, each with one hero, ≤3 supporting moves, a crown and a threshold", () => {
    expect(concepts).toHaveLength(7);
    for (const c of concepts) {
      expect(c.hero, c.id).toBeDefined();
      expect(c.supporting!.length, c.id).toBeLessThanOrEqual(3);
      expect(c.crown && c.threshold, c.id).toBeTruthy();
      expect(c.elements[c.hero!.element]?.enabled, `${c.id} hero element`).toBe(true);
    }
  });

  for (const c of concepts)
    it(`${c.id}: quality gate passes ≥ 8 of the automated checks; flags are listed`, () => {
      const { d, parts } = partsFor(c.id);
      const gate = qualityGate(d, parts);
      const fails = gate.filter((g) => g.pass === false);
      expect(fails.map((f) => `${f.n} ${f.label}: ${f.note}`), c.id).toEqual([]);
      const flags = approvalFlags(d, parts);
      console.log(`${c.name}: ${flags.length} flag(s) · ${flags.map((f) => f.title).join(" | ")}`);
    });
});

describe("v2 light fixtures", () => {
  for (const c of concepts)
    it(`${c.id}: the hero carries real fixtures with sensible positions`, () => {
      const { parts } = partsFor(c.id);
      const fx = fixturesFromParts(parts);
      expect(fx.length, c.id).toBeGreaterThan(0);
      expect(fx.some((f) => f.element === c.hero!.element), `${c.id} hero is lit`).toBe(true);
      for (const f of fx) {
        expect(f.pos.every(Number.isFinite), f.id).toBe(true);
        expect(f.pos[2], f.id).toBeGreaterThanOrEqual(-0.1);
        expect(f.pos[2], f.id).toBeLessThan(20);
      }
    });

  it("the schedule CSV has a header and one row per fixture, quoted where needed", () => {
    const { parts } = partsFor(concepts[0].id);
    const fx = fixturesFromParts(parts);
    const csv = lightingScheduleCsv(fx, (el) => `${el}, named`);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toMatch(/^Fixture,Type,Part of/);
    expect(lines).toHaveLength(fx.length + 1);
    expect(lines[1]).toMatch(/^L001,/);
    expect(lines[1]).toMatch(/,"[^"]+, named",/);
    const sum = fixtureSummary(fx);
    expect(Object.values(sum).reduce((a, b) => a + b, 0)).toBe(fx.length);
  });
});
