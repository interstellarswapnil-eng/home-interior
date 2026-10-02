/**
 * Real light sources at dusk and night: street lamps, the moves' fixtures (hero first) and the facade lighting slots.
 *
 * three.js compiles the number of spot / point / rect-area lights into every material's shader, so a different count
 * means recompiling every material: 6–18 s per concept switch at dusk on Windows (D3D). The lights therefore come as
 * a fixed pool per quality: the same count of each kind for every design, unused ones at zero intensity.
 */
import { patternById, resolveElements, type DesignState } from "../model/resolve";
import type { Part } from "../model/types";
import { lampHead, LAMP_H, STREET_LAMPS } from "../model/context";
import { lightingSources, type LightSpec } from "../model/siteElements";
import { fixturesFromParts } from "../model/fixtures";
import type { Quality } from "./materials";

/** Real lights for the moves' fixtures (frame downlights, band LED lines, backlit jaali, lanterns, roof downlights, nameplate). */
export function moveLights(design: DesignState, parts: Part[], quality: Quality): LightSpec[] {
  const pat = patternById(design.patternId);
  const rank = (el: string) => (el === pat.hero?.element ? 0 : el === pat.crown?.element ? 1 : pat.supporting?.some((s) => s.element === el) ? 2 : 3);
  const fx = fixturesFromParts(parts)
    .filter((f) => f.element !== "lighting" && f.element !== "context")
    .sort((a, b) => rank(a.element) - rank(b.element));
  const cap = quality === "high" ? 40 : 16;
  const perElementDownlights = quality === "high" ? 10 : 3;
  const count = new Map<string, number>();
  const out: LightSpec[] = [];
  for (const f of fx) {
    if (out.length >= cap) break;
    const [x, y, z] = f.pos;
    if (f.kind === "downlight") {
      const n = (count.get(f.element) ?? 0) + 1;
      count.set(f.element, n);
      if (n > perElementDownlights) continue;
      out.push({ kind: "spot", id: `mv-${f.id}`, pos: [x, y, z - 0.02], target: [x, y, z - 3], intensity: 5, angle: 0.55, distance: 5 });
    } else if (f.kind === "lantern") {
      out.push({ kind: "point", id: `mv-${f.id}`, pos: [x, y, z], intensity: 1.6, distance: 4 });
    } else if (f.kind === "plate") {
      out.push({ kind: "point", id: `mv-${f.id}`, pos: [x, y - 0.3, z], intensity: 0.8, distance: 2.5 });
    } else {
      const [sx, sy, sz] = f.dims;
      const dir: Record<string, [number, number, number]> = { down: [0, 0, -1], up: [0, 0, 1], S: [0, -1, 0], N: [0, 1, 0], E: [1, 0, 0], W: [-1, 0, 0], all: [0, 0, -1] };
      const d = dir[f.facing];
      // rectangle size in the light's own plane: horizontal lights span plan x × y, wall-facing ones span the wall × height
      const [w, h] = f.facing === "down" || f.facing === "up" ? [sx, sy] : f.facing === "S" || f.facing === "N" ? [sx, sz] : [sy, sz];
      out.push({ kind: "rect", id: `mv-${f.id}`, pos: [x + d[0] * 0.02, y + d[1] * 0.02, z + d[2] * 0.02], target: [x + d[0], y + d[1], z + d[2]], width: w, height: h, intensity: f.kind === "panel" ? 7 : 12 });
    }
  }
  return out;
}

/** Every light the design asks for, most important first: street lamps, the moves (hero first), then the facade lighting slots. */
export function nightLightSpecs(design: DesignState, parts: Part[], quality: Quality): LightSpec[] {
  const els = resolveElements(design);
  const l: LightSpec[] = STREET_LAMPS.map((lamp, i) => {
    const [hx, hy] = lampHead(lamp);
    return { kind: "spot", id: `street-${i}`, pos: [hx, hy, LAMP_H - 0.2], target: [hx, hy, 0], intensity: 60, angle: 0.95, distance: 22 };
  });
  l.push(...moveLights(design, parts, quality));
  if (els.lighting?.enabled) l.push(...lightingSources(els.lighting.slots ?? [], quality === "high"));
  return l;
}

/** Fixed number of lights of each kind (sized for the busiest design; anything beyond is the least important). */
export const LIGHT_POOL: Record<Quality, Record<LightSpec["kind"], number>> = {
  normal: { spot: 12, point: 8, rect: 12 },
  high: { spot: 24, point: 12, rect: 14 },
};

/** The design's lights placed into the fixed pool; slot ids are stable, so React only updates them. */
export function pooledNightLights(specs: LightSpec[], quality: Quality): LightSpec[] {
  const out: LightSpec[] = [];
  for (const kind of ["spot", "point", "rect"] as const) {
    const mine = specs.filter((s) => s.kind === kind).slice(0, LIGHT_POOL[quality][kind]);
    for (let i = 0; i < LIGHT_POOL[quality][kind]; i++) {
      const s = mine[i];
      if (s) out.push({ ...s, id: `${kind}-${i}` });
      else if (kind === "spot") out.push({ kind, id: `${kind}-${i}`, pos: [0, 0, -50], target: [0, 0, -51], intensity: 0, angle: 0.5, distance: 1 });
      else if (kind === "point") out.push({ kind, id: `${kind}-${i}`, pos: [0, 0, -50], intensity: 0, distance: 1 });
      else out.push({ kind, id: `${kind}-${i}`, pos: [0, 0, -50], target: [0, 0, -51], width: 0.1, height: 0.1, intensity: 0 });
    }
  }
  return out;
}
