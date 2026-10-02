import { describe, expect, it } from "vitest";
import { defaultDesign, resolveRoles } from "../../src/exterior/model/resolve";
import { historyReducer, initHistory } from "../../src/exterior/state/history";
import { designFromJson, designToJson } from "../../src/exterior/state/saves";
import { crc32, makeZip } from "../../src/exterior/export/zip";
import { designSheetHtml } from "../../src/exterior/export/sheet";

describe("undo / redo", () => {
  it("undoes and redoes design edits", () => {
    let h = initHistory(defaultDesign("warmMinimal"));
    h = historyReducer(h, { type: "pattern", id: "japandi" }, 0);
    h = historyReducer(h, { type: "palette", id: "paperStone" }, 5000);
    expect(h.present.paletteId).toBe("paperStone");
    h = historyReducer(h, { type: "undo" });
    expect(h.present.patternId).toBe("japandi");
    expect(h.present.paletteId).toBe("greigeCharred");
    h = historyReducer(h, { type: "undo" });
    expect(h.present.patternId).toBe("warmMinimal");
    h = historyReducer(h, { type: "redo" });
    h = historyReducer(h, { type: "redo" });
    expect(h.present.paletteId).toBe("paperStone");
  });

  it("merges a quick drag of the same colour into one step", () => {
    let h = initHistory(defaultDesign("warmMinimal"));
    for (let i = 0; i < 10; i++) h = historyReducer(h, { type: "roleColor", role: "mainWall", color: `#1${i}1111` }, 1000 + i * 50);
    expect(h.past.length).toBe(1);
    h = historyReducer(h, { type: "undo" });
    expect(resolveRoles(h.present).mainWall.color).toBe("#E8E0D2");
  });

  it("a new edit clears redo; no-op edits are not recorded", () => {
    let h = initHistory(defaultDesign());
    h = historyReducer(h, { type: "palette", id: "asDesigned" }, 0); // already selected
    expect(h.past.length).toBe(0);
    h = historyReducer(h, { type: "pattern", id: "japandi" }, 0);
    h = historyReducer(h, { type: "undo" });
    h = historyReducer(h, { type: "pattern", id: "darkModern" }, 9000);
    expect(h.future.length).toBe(0);
  });
});

describe("design files", () => {
  it("round-trips through JSON export / import", () => {
    let h = initHistory(defaultDesign("tropicalModern"));
    h = historyReducer(h, { type: "roleColor", role: "base", color: "#334455" }, 0);
    h = historyReducer(h, { type: "lock", role: "base", locked: true }, 2000);
    h = historyReducer(h, { type: "optional", id: "masterRoadWindow", on: true }, 4000);
    const back = designFromJson(designToJson(h.present, { camera: "front", sky: "night" }));
    expect(back.design).toEqual({ ...h.present });
    expect(back.view?.sky).toBe("night");
  });

  it("rejects files that are not designs, in plain words", () => {
    expect(() => designFromJson("not json")).toThrow(/not a design file/);
    expect(() => designFromJson('{"hello":1}')).toThrow(/not a Pasaydan/);
    expect(() => designFromJson('{"format":"pasaydan-exterior-design","design":{"patternId":"nope"}}')).toThrow(/Unknown design pattern/);
  });
});

describe("exports", () => {
  it("crc32 matches the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("zip has the right structure (local headers + central directory + end record)", async () => {
    const blob = makeZip([
      { name: "a.txt", data: new TextEncoder().encode("hello") },
      { name: "b.txt", data: new TextEncoder().encode("world!") },
    ]);
    const b = new Uint8Array(await blob.arrayBuffer());
    const v = new DataView(b.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    const end = b.length - 22;
    expect(v.getUint32(end, true)).toBe(0x06054b50);
    expect(v.getUint16(end + 10, true)).toBe(2);
  });

  it("design sheet lists colours, elements, approval changes and views", () => {
    let d = defaultDesign("warmCurves");
    d = { ...d, optional: { widerBedroomWindows: true } };
    const html = designSheetHtml(d, [{ label: "Front", url: "data:image/png;base64,AA==" }], { date: "2 Oct 2026", viewNote: "Sunny." });
    expect(html).toContain("#ECE4D6");
    expect(html).toContain("Box frames around windows");
    expect(html).toContain("Wider bedroom windows");
    expect(html).toContain("Print / save as PDF");
    expect(html).toContain('alt="Front"');
  });
});
