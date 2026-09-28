/**
 * Boot checks shared by `npm run check`, vitest and the in-app Checks panel.
 */
import {
  assertNoOverlaps,
  assertPlanAreas,
  assertPlanDims,
  furniture,
  meta,
  openings,
  roomById,
  rooms,
} from "./plan";
import { budgetLines, budgetMeta } from "./budget";
import { finishes, palette, roomFloorMaterial } from "./materials";

export type Check = { group: string; name: string; ok: boolean; detail?: string };

/** Every "bought" thing in the model must map to a budget line, and vice versa. */
export function budgetMapping() {
  const mapped = new Set(budgetLines.flatMap((l) => l.visibleInModel));
  const knownIds = new Set<string>([
    ...rooms.map((r) => r.id),
    ...furniture.map((f) => f.id),
    ...openings.map((o) => o.id),
  ]);
  const unmappedFurniture = furniture.filter((f) => !mapped.has(f.id)).map((f) => f.id);
  const unmappedOpenings = openings.filter((o) => !o.builder && !mapped.has(o.id)).map((o) => o.id);
  const danglingRefs = [...mapped].filter((id) => !knownIds.has(id));
  return { unmappedFurniture, unmappedOpenings, danglingRefs };
}

export function runChecks(): Check[] {
  const checks: Check[] = [];
  for (const r of assertPlanAreas())
    checks.push({
      group: "Plan areas (±2%)",
      name: r.id,
      ok: r.ok,
      detail: `${r.got.toFixed(2)} m² vs ${r.expected.toFixed(2)} m²`,
    });
  for (const r of assertPlanDims())
    checks.push({ group: "Plan dimensions (±2%)", name: r.id, ok: r.ok, detail: r.label });

  const overlaps = assertNoOverlaps();
  checks.push({
    group: "Plan topology",
    name: "No overlapping rooms",
    ok: overlaps.length === 0,
    detail: overlaps.map((o) => `${o.a}×${o.b}`).join(", ") || "clean",
  });
  const k = roomById.kids;
  const m = roomById.master;
  const mb = roomById.masterBath;
  checks.push({ group: "Plan topology", name: "Kids bedroom is upper (north of master)", ok: k.y > m.y });
  checks.push({
    group: "Plan topology",
    name: "8'×4' bath sits between bedrooms, door from master",
    ok:
      mb.y >= m.y + m.h &&
      mb.y + mb.h <= k.y &&
      openings.some((o) => o.fromRoom === "master" && o.toRoom === "masterBath"),
  });
  checks.push({
    group: "Plan topology",
    name: "Kitchen south of living (open, no wall between)",
    ok: roomById.kitchen.y + roomById.kitchen.h <= roomById.living.y + 1e-6,
  });
  checks.push({
    group: "Plan topology",
    name: "Kitchen balcony tagged south and below kitchen",
    ok:
      roomById.kitchenBalcony.facing === "south" &&
      meta.kitchenBalconyFacing === "south" &&
      roomById.kitchenBalcony.y + roomById.kitchenBalcony.h <= roomById.kitchen.y,
  });
  checks.push({
    group: "Plan topology",
    name: "Storage has no wash basin",
    ok: !furniture.some((f) => f.room === "storage" && f.kind === "basin"),
  });
  const hob = furniture.find((f) => f.id === "hob")!;
  const sink = furniture.find((f) => f.id === "sink")!;
  const inside = (f: { x: number; y: number; w: number; h: number }, id: string) => {
    const c = furniture.find((x) => x.id === id)!;
    return f.x >= c.x - 1e-6 && f.y >= c.y - 1e-6 && f.x + f.w <= c.x + c.w + 1e-6 && f.y + f.h <= c.y + c.h + 1e-6;
  };
  checks.push({
    group: "Kitchen",
    name: "Hob and sink on different L legs",
    ok: inside(hob, "kit-counter-e") && inside(sink, "kit-counter-s"),
  });
  checks.push({
    group: "Kitchen",
    name: "Pale artificial granite counter",
    ok: finishes.kitchenCounter.code === palette.granite && /artificial granite/i.test(finishes.kitchenCounter.name),
  });
  checks.push({
    group: "Materials",
    name: "Every room has a floor material",
    ok: rooms.every((r) => roomFloorMaterial[r.id] in palette),
  });

  checks.push({
    group: "Budget",
    name: "Total within ₹8–10 lakh (budgetMeta.inBand())",
    ok: budgetMeta.inBand(),
    detail: `₹${budgetMeta.total.toLocaleString("en-IN")}`,
  });
  const bm = budgetMapping();
  checks.push({
    group: "Budget",
    name: "Every modelled item maps to a budget line",
    ok: bm.unmappedFurniture.length === 0 && bm.unmappedOpenings.length === 0,
    detail: [...bm.unmappedFurniture, ...bm.unmappedOpenings].join(", ") || "all mapped",
  });
  checks.push({
    group: "Budget",
    name: "Budget lines reference real model ids",
    ok: bm.danglingRefs.length === 0,
    detail: bm.danglingRefs.join(", ") || "all resolve",
  });
  return checks;
}
