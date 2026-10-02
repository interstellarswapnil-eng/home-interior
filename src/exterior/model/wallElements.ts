/** Wall elements: slats / louvers (D1), jaali screens (D3), feature cladding (D5), sunshades (D8). */
import { box, faceBox, splitWall, type WallSpec } from "./geom";
import { num, outSign, slotOpenings, str, type ElementCtx, type Gen } from "./elementUtil";
import { slotRegions, type Region } from "./slots";
import type { FacadeOpening, Part, SurfaceRole } from "./types";

/** Regions for a slot: wall slots use slotRegions(); window slots use each opening plus a margin. */
function regionsFor(slot: string, ctx: ElementCtx, margin = 0.1): (Region & { floor: number; key: string })[] {
  if (slot.startsWith("win:"))
    return slotOpenings(slot, ctx).map((o) => ({ side: o.side, face: o.face, a: o.a - margin, b: o.b + margin, z0: o.z0 - margin, z1: o.z1 + margin, floor: o.floor, key: o.id }));
  return slotRegions(slot).map((r, i) => ({ ...r, floor: 1, key: `${slot.replace(/[:]/g, "-")}-${i}` }));
}

/** D1 Wood slats / louvers: blades standing off a wall or in front of a window. */
export const slats: Gen = (id, cfg, ctx) => {
  const out: Part[] = [];
  const vertical = str(cfg.params, "orientation", "vertical") === "vertical";
  const w = num(cfg.params, "width", 0.05);
  const gap = num(cfg.params, "gap", 0.05);
  const depth = num(cfg.params, "depth", 0.08);
  const off = num(cfg.params, "offset", 0.06);
  const role = str<SurfaceRole>(cfg.params, "role", "slats");
  for (const slot of cfg.slots ?? [])
    for (const r of regionsFor(slot, ctx)) {
      const meta = { floor: r.floor, side: r.side, slot, element: id };
      const len = vertical ? r.b - r.a : r.z1 - r.z0;
      const n = Math.max(1, Math.floor((len + gap) / (w + gap)));
      const start = (len - (n * w + (n - 1) * gap)) / 2;
      for (let i = 0; i < n; i++) {
        const s0 = start + i * (w + gap);
        const b = vertical
          ? faceBox(r.side, r.face, r.a + s0, r.a + s0 + w, -(off + depth), -off, r.z0, r.z1)
          : faceBox(r.side, r.face, r.a, r.b, -(off + depth), -off, r.z0 + s0, r.z0 + s0 + w);
        out.push(box(`${r.key}-${id}-${i}`, role, b, meta));
      }
      // two thin carriers behind the blades
      for (const [k, t] of [
        ["c0", 0.15],
        ["c1", 0.85],
      ] as const) {
        const b = vertical
          ? faceBox(r.side, r.face, r.a, r.b, -off, -0.001, r.z0 + (r.z1 - r.z0) * t, r.z0 + (r.z1 - r.z0) * t + 0.04)
          : faceBox(r.side, r.face, r.a + (r.b - r.a) * t, r.a + (r.b - r.a) * t + 0.04, -off, -0.001, r.z0, r.z1);
        out.push(box(`${r.key}-${id}-${k}`, "railing", b, meta));
      }
    }
  return out;
};

/** D3 Jaali / breeze-block screen: a deep lattice standing off the wall. */
export const jaali: Gen = (id, cfg, ctx) => {
  const out: Part[] = [];
  const cell = num(cfg.params, "cell", 0.22);
  const bar = num(cfg.params, "bar", 0.05);
  const depth = num(cfg.params, "depth", 0.1);
  const off = num(cfg.params, "offset", 0.12);
  const role = str<SurfaceRole>(cfg.params, "role", "jaali");
  for (const slot of cfg.slots ?? [])
    for (const r of regionsFor(slot, ctx, 0.25)) {
      const meta = { floor: r.floor, side: r.side, slot, element: id };
      const d0 = -(off + depth);
      const d1 = -off;
      const nA = Math.max(1, Math.round((r.b - r.a) / cell));
      const nZ = Math.max(1, Math.round((r.z1 - r.z0) / cell));
      const ca = (r.b - r.a) / nA;
      const cz = (r.z1 - r.z0) / nZ;
      for (let i = 0; i <= nA; i++) {
        const a = Math.min(r.b - bar, r.a + i * ca - (i === 0 ? 0 : bar / 2));
        out.push(box(`${r.key}-${id}-v${i}`, role, faceBox(r.side, r.face, a, a + bar, d0, d1, r.z0, r.z1), meta));
      }
      const graded = cfg.params?.graded === true;
      for (let j = 0; j <= nZ; j++) {
        // graded: bars thick at the bottom (dense), thin at the top (open)
        const t = nZ ? j / nZ : 0;
        const bj = graded ? bar * (1.9 - 1.5 * t) : bar;
        const z = Math.min(r.z1 - bj, r.z0 + j * cz - (j === 0 ? 0 : bj / 2));
        out.push(box(`${r.key}-${id}-h${j}`, role, faceBox(r.side, r.face, r.a + bar, r.b - bar, d0 + 0.01, d1 - 0.01, z, z + bj), meta));
      }
      if (cfg.params?.backlight === true)
        out.push(box(`${r.key}-${id}-glow`, "lightGlow", faceBox(r.side, r.face, r.a + 0.05, r.b - 0.05, -0.02, -0.004, r.z0 + 0.05, r.z1 - 0.05), meta));
      // standoff brackets
      out.push(box(`${r.key}-${id}-br0`, "railing", faceBox(r.side, r.face, r.a + 0.1, r.a + 0.14, -off, -0.001, r.z0, r.z1), meta));
      out.push(box(`${r.key}-${id}-br1`, "railing", faceBox(r.side, r.face, r.b - 0.14, r.b - 0.1, -off, -0.001, r.z0, r.z1), meta));
    }
  return out;
};

/** A thin cladding layer over a facade region, cut around its openings. */
export function claddingLayer(r: Region, depth: number, role: SurfaceRole, id: string, slot: string, openings: FacadeOpening[], floor = 1): Part[] {
  const b = faceBox(r.side, r.face, r.a, r.b, -depth, 0, r.z0, r.z1);
  const wall: WallSpec = { id, x: b.x, y: b.y, w: b.w, h: b.h, z0: r.z0, z1: r.z1, side: r.side, role, slot, floor };
  const shift = outSign(r.side) * depth;
  const shifted = openings.filter((o) => o.side === r.side && Math.abs(o.face - r.face) < 0.02).map((o) => ({ ...o, face: o.face + shift }));
  return splitWall(wall, shifted).map((p) => ({ ...p, element: id }));
}

/** D5 Feature wall cladding: wood-look, stone, brick, fluted or terracotta panels over a wall slot. */
export const cladding: Gen = (id, cfg, ctx) => {
  // 30 mm: sits just proud of the 25 mm stone-base layer, so the two never share a plane
  const depth = num(cfg.params, "depth", 0.03);
  const role = str<SurfaceRole>(cfg.params, "role", "featureWall");
  return (cfg.slots ?? []).flatMap((slot) => slotRegions(slot).flatMap((r, i) => claddingLayer(r, depth, role, `${id}-${slot.replace(/[:]/g, "-")}-${i}`, slot, ctx.openings)));
};

/** D8 Sunshades (chajja) over windows. */
export const sunshades: Gen = (id, cfg, ctx) => {
  const out: Part[] = [];
  const depth = num(cfg.params, "depth", 0.6);
  const t = num(cfg.params, "thickness", 0.08);
  const ext = num(cfg.params, "extend", 0.15);
  const gap = num(cfg.params, "gap", 0.25);
  for (const slot of cfg.slots ?? [])
    for (const o of slotOpenings(slot, ctx)) {
      const meta = { floor: o.floor, side: o.side, slot, element: id };
      out.push(box(`${o.id}-${id}`, "sunshade", faceBox(o.side, o.face, o.a - ext, o.b + ext, -depth, -0.001, o.z1 + gap, o.z1 + gap + t), meta));
    }
  return out;
};
