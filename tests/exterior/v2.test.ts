import { describe, expect, it } from "vitest";
import { approvalFlags, qualityGate } from "../../src/exterior/model/approval";
import { buildElements } from "../../src/exterior/model/elements";
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
