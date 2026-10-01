import { describe, expect, it } from "vitest";
import { designReducer, materialsForRole, suggestedColors } from "../../src/exterior/state/design";
import { defaultDesign, resolveElements, resolveRoles } from "../../src/exterior/model/resolve";

describe("design edits", () => {
  const d0 = defaultDesign("warmMinimal");

  it("custom colour wins; switching palette drops unlocked customisations", () => {
    const d1 = designReducer(d0, { type: "roleColor", role: "mainWall", color: "#112233" });
    expect(resolveRoles(d1).mainWall.color).toBe("#112233");
    const d2 = designReducer(d1, { type: "palette", id: "whiteTeak" });
    expect(resolveRoles(d2).mainWall.color).toBe("#EEEAE1");
  });

  it("a locked colour survives palette and pattern switches", () => {
    let d = designReducer(d0, { type: "roleColor", role: "base", color: "#555555" });
    d = designReducer(d, { type: "lock", role: "base", locked: true });
    d = designReducer(d, { type: "palette", id: "greyWalnut" });
    expect(resolveRoles(d).base.color).toBe("#555555");
    d = designReducer(d, { type: "pattern", id: "japandi" });
    expect(resolveRoles(d).base.color).toBe("#555555");
    expect(d.paletteId).toBe("greigeCharred");
  });

  it("locking an unedited role freezes its current value", () => {
    let d = designReducer(d0, { type: "lock", role: "featureWall", locked: true });
    const before = resolveRoles(d).featureWall;
    d = designReducer(d, { type: "palette", id: "greyWalnut" });
    expect(resolveRoles(d).featureWall).toEqual(before);
  });

  it("reset restores the pattern's colours", () => {
    let d = designReducer(d0, { type: "roleColor", role: "mainWall", color: "#000000" });
    d = designReducer(d, { type: "lock", role: "mainWall", locked: true });
    d = designReducer(d, { type: "resetColors" });
    expect(resolveRoles(d).mainWall.color).toBe("#E8E0D2");
  });

  it("element on/off, params and slots; pattern switch resets elements", () => {
    let d = designReducer(d0, { type: "element", id: "slats", patch: { enabled: false } });
    expect(resolveElements(d).slats.enabled).toBe(false);
    d = designReducer(d, { type: "elementParam", id: "boxFrames", key: "depth", value: 0.5 });
    expect(resolveElements(d).boxFrames.params?.depth).toBe(0.5);
    d = designReducer(d, { type: "elementSlot", id: "boxFrames", slot: "win:win-kids-w", on: true });
    expect(resolveElements(d).boxFrames.slots).toContain("win:win-kids-w");
    expect(resolveElements(d).boxFrames.slots).toContain("win:win-master-w");
    d = designReducer(d, { type: "elementSlot", id: "boxFrames", slot: "win:win-master-w", on: false });
    expect(resolveElements(d).boxFrames.slots).toEqual(["win:win-kids-w"]);
    d = designReducer(d, { type: "pattern", id: "warmMinimal" });
    expect(resolveElements(d).slats.enabled).toBe(true);
  });

  it("suggestions and material choices make sense", () => {
    expect(suggestedColors(d0, "mainWall").slice(0, 3)).toEqual(["#EEEAE1", "#E8E0D2", "#ECEBE7"]);
    expect(materialsForRole("railing")).toContain("metalMatte");
    expect(materialsForRole("railing")).not.toContain("brick");
    expect(materialsForRole("mainWall")).toContain("brick");
    expect(materialsForRole("mainWall")).not.toContain("glass");
  });
});
