/**
 * v2 M15 light layers: every glowing part of the design (lightGlow role) is a real fixture with a position,
 * a type and a colour temperature. The same list drives the night / dusk light sources in 3D and the
 * exportable lighting schedule.
 */
import { BALCONY, X_E, X_W } from "./building";
import { partBounds } from "./approval";
import type { Part } from "./types";

export type FixtureKind = "downlight" | "linear" | "panel" | "lantern" | "uplight" | "sconce" | "plate";
export type Fixture = {
  id: string;
  kind: FixtureKind;
  /** element the fixture belongs to (move or detail) */
  element: string;
  /** centre, plan metres + height */
  pos: [number, number, number];
  /** length × width (m) for linear / panel fixtures */
  size: [number, number];
  /** which way the light goes */
  facing: "down" | "up" | "S" | "N" | "E" | "W" | "all";
  cct: 2700 | 3000;
  /** extent along plan x, plan y and height (m) */
  dims: [number, number, number];
};

export function fixturesFromParts(parts: Part[]): Fixture[] {
  const out: Fixture[] = [];
  for (const p of parts) {
    if (p.role !== "lightGlow") continue;
    const b = partBounds(p);
    if (!b) continue;
    const [x0, y0, x1, y1, z0, z1] = b;
    const c: [number, number, number] = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const el = p.element ?? "context";
    if (p.kind === "blob") {
      out.push({ id: p.id, kind: "lantern", element: el, pos: c, size: [dx, dz], facing: "all", cct: 2700, dims: [dx, dy, dz] });
      continue;
    }
    if (p.kind === "prism" && p.axis === "z") {
      // a band LED ribbon wrapping the corner: list its straight road-side and side-road runs
      out.push({ id: `${p.id}-s`, kind: "linear", element: el, pos: [(x0 + x1) / 2, y0 + 0.045, z0], size: [dx, 0.03], facing: "down", cct: 3000, dims: [dx, 0.03, 0.01] });
      out.push({ id: `${p.id}-w`, kind: "linear", element: el, pos: [x0 + 0.045, (y0 + y1) / 2, z0], size: [dy, 0.03], facing: "down", cct: 3000, dims: [0.03, dy, 0.01] });
      continue;
    }
    const thinZ = dz <= Math.min(dx, dy);
    if (thinZ) {
      const small = Math.max(dx, dy) < 0.3;
      if (el === "lighting" && z0 < 0.3) out.push({ id: p.id, kind: "uplight", element: el, pos: c, size: [dx, dy], facing: "up", cct: 3000, dims: [dx, dy, dz] });
      else if (small) out.push({ id: p.id, kind: z0 < 3 && el === "lighting" ? "uplight" : "downlight", element: el, pos: c, size: [dx, dy], facing: "down", cct: 2700, dims: [dx, dy, dz] });
      else out.push({ id: p.id, kind: "linear", element: el, pos: c, size: [Math.max(dx, dy), Math.min(dx, dy)], facing: "down", cct: 3000, dims: [dx, dy, dz] });
    } else {
      const facing = dy <= dx ? (c[1] < (BALCONY.S.y + BALCONY.N.y1) / 2 ? "S" : "N") : c[0] < (X_W + X_E) / 2 ? "W" : "E";
      const len = Math.max(dy <= dx ? dx : dy, dz);
      const wid = Math.min(dy <= dx ? dx : dy, dz);
      const kind: FixtureKind = el === "nameSign" ? "plate" : len > 1.2 && wid > 0.4 ? "panel" : el === "lighting" && len < 0.3 ? "sconce" : "linear";
      out.push({ id: p.id, kind, element: el, pos: c, size: [len, wid], facing: facing as Fixture["facing"], cct: kind === "panel" || kind === "plate" ? 3000 : 2700, dims: [dx, dy, dz] });
    }
  }
  return out;
}

const KIND_LABEL: Record<FixtureKind, string> = {
  downlight: "Downlight (recessed)",
  linear: "Linear LED / cove",
  panel: "Backlight panel",
  lantern: "Lantern / pendant",
  uplight: "In-ground uplight",
  sconce: "Wall sconce (up/down)",
  plate: "Backlit nameplate",
};

/** Lighting schedule (CSV) for the architect / electrician: one row per fixture. */
export function lightingScheduleCsv(fx: Fixture[], label: (element: string) => string): string {
  const rows = [["Fixture", "Type", "Part of", "Faces", "Length (m)", "Width (m)", "x (m)", "y (m)", "Height (m)", "Colour temperature"]];
  fx.forEach((f, i) =>
    rows.push([
      `L${String(i + 1).padStart(3, "0")}`,
      KIND_LABEL[f.kind],
      label(f.element),
      f.facing === "all" ? "all round" : f.facing,
      f.size[0].toFixed(2),
      f.size[1].toFixed(2),
      f.pos[0].toFixed(2),
      f.pos[1].toFixed(2),
      f.pos[2].toFixed(2),
      `${f.cct} K`,
    ]),
  );
  return rows.map((r) => r.map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\r\n") + "\r\n";
}

export function fixtureSummary(fx: Fixture[]): Record<FixtureKind, number> {
  const s = { downlight: 0, linear: 0, panel: 0, lantern: 0, uplight: 0, sconce: 0, plate: 0 } as Record<FixtureKind, number>;
  for (const f of fx) s[f.kind]++;
  return s;
}
