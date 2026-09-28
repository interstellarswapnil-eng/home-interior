import { describe, expect, it } from "vitest";
import { runChecks } from "../plan/checks";
import { assertPlanAreas } from "../plan/plan";
import { budgetMeta } from "../plan/budget";

describe("plan + budget boot checks", () => {
  it("assertPlanAreas() passes for every locked room", () => {
    for (const r of assertPlanAreas()) expect(r.ok, r.id).toBe(true);
  });
  it("budgetMeta.inBand() is true", () => {
    expect(budgetMeta.inBand()).toBe(true);
  });
  it.each(runChecks().map((c) => [`${c.group}: ${c.name}`, c] as const))("%s", (_n, c) => {
    expect(c.ok, c.detail).toBe(true);
  });
});
