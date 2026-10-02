import { describe, expect, it } from "vitest";
import skies from "../../public/exterior/hdri/skies.json";
import { existsSync } from "node:fs";
import { contextParts } from "../../src/exterior/model/context";
import { lightingSources } from "../../src/exterior/model/siteElements";
import { buildShell } from "../../src/exterior/model/shell";
import { isBox } from "../../src/exterior/model/geom";
import { level } from "../../src/exterior/model/building";

describe("realism layer", () => {
  it("every sky image exists and has a sun position", () => {
    for (const [k, s] of Object.entries(skies)) {
      expect(existsSync(`public/exterior/hdri/${s.file}`), k).toBe(true);
      expect(s.sunU).toBeGreaterThanOrEqual(0);
      expect(s.sunU).toBeLessThanOrEqual(1);
    }
  });

  it("joint lines sit at the floor lines on the plaster walls and the stair tower", () => {
    const joints = buildShell().parts.filter((p) => p.role === "joint" && isBox(p));
    expect(joints.length).toBeGreaterThan(10);
    for (const j of joints.filter((p) => p.id.includes("-joint-")))
      if (isBox(j)) expect([2, 3, 1, 4].some((f) => Math.abs((j.box.z0 + j.box.z1) / 2 - level(f)) < 0.01)).toBe(true);
  });

  it("context objects are valid and can be switched off", () => {
    const all = contextParts({ neighbours: true, car: true, person: true });
    const none = contextParts({ neighbours: false, car: false, person: false });
    expect(all.length).toBeGreaterThan(none.length);
    expect(none.every((p) => p.id.startsWith("ctx-lamp"))).toBe(true);
    const ids = new Set<string>();
    for (const p of all) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      if (isBox(p)) expect(p.box.w > 0 && p.box.h > 0 && p.box.z1 > p.box.z0).toBe(true);
    }
    // a person is about 1.7 m tall
    const person = all.filter((p) => p.id.startsWith("ctx-person"));
    const top = Math.max(...person.map((p) => (p.kind === "blob" ? p.z + p.rz : isBox(p) ? p.box.z1 : 0)));
    expect(top - 0.3).toBeGreaterThan(1.6);
    expect(top - 0.3).toBeLessThan(1.8);
  });

  it("the flat elevations leave out the neighbour across that road (and the side road's tree and pole)", () => {
    const ids = (o: Parameters<typeof contextParts>[0]) => contextParts(o).map((p) => p.id);
    const base = { neighbours: true, car: false, person: false };
    const all = ids(base);
    expect(all.some((i) => i.startsWith("ctx-nb-s"))).toBe(true);
    expect(all.some((i) => i.startsWith("ctx-nb-w"))).toBe(true);
    const s = ids({ ...base, clearView: "S" });
    expect(s.some((i) => i.startsWith("ctx-nb-s"))).toBe(false);
    expect(s.some((i) => i.startsWith("ctx-nb-w"))).toBe(true);
    const w = ids({ ...base, clearView: "W" });
    expect(w.some((i) => i.startsWith("ctx-nb-w") || i.startsWith("ctx-pole") || i.startsWith("ctx-t1"))).toBe(false);
    expect(w.some((i) => i.startsWith("ctx-nb-s"))).toBe(true);
  });

  it("night lights: High has more lights than Normal; every source is above ground", () => {
    const slots = ["wall:frontName", "wall:featureRecess", "balcony:S", "edge:stiltBand", "site:compoundFront", "site:gate"];
    const hi = lightingSources(slots, true);
    const lo = lightingSources(slots, false);
    expect(hi.length).toBeGreaterThan(lo.length);
    expect(lo.length).toBeLessThanOrEqual(24);
    for (const l of hi) expect(l.pos[2]).toBeGreaterThan(0);
    expect(new Set(hi.map((l) => l.id)).size).toBe(hi.length);
  });
});
