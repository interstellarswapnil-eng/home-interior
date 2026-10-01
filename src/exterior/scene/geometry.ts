/**
 * Parts → three.js geometry. One merged mesh per role (few draw calls; recolouring = one material update).
 * Plan (x, y, z) maps to world (x, z, −y), the same convention as the interior module.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Part, SurfaceRole } from "../model/types";

export const toWorld = (x: number, y: number, z = 0): [number, number, number] => [x, z, -y];

function partGeometry(p: Exclude<Part, { kind: "label" }>): THREE.BufferGeometry {
  if (p.kind === "box") {
    const b = p.box;
    const r = p.bevel ? Math.min(p.bevel, b.w / 2 - 1e-4, b.h / 2 - 1e-4, (b.z1 - b.z0) / 2 - 1e-4) : 0;
    const g = r > 0.002 ? new RoundedBoxGeometry(b.w, b.z1 - b.z0, b.h, 2, r) : new THREE.BoxGeometry(b.w, b.z1 - b.z0, b.h);
    g.translate(b.x + b.w / 2, (b.z0 + b.z1) / 2, -(b.y + b.h / 2));
    return g;
  }
  if (p.kind === "blob") {
    const g = new THREE.IcosahedronGeometry(1, 2);
    g.scale(p.r, p.rz, p.r);
    g.translate(p.x, p.z, -p.y);
    return g;
  }
  const shape = new THREE.Shape(p.profile.map(([u, z]) => new THREE.Vector2(u, z)));
  for (const h of p.holes ?? []) shape.holes.push(new THREE.Path(h.map(([u, z]) => new THREE.Vector2(u, z))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: p.thickness, bevelEnabled: false, curveSegments: 8 });
  if (p.axis === "x") g.translate(0, 0, -(p.at + p.thickness));
  else if (p.axis === "y") {
    // local x (= plan y) → world −z, extrusion (local z) → world +x
    g.rotateY(Math.PI / 2);
    g.translate(p.at, 0, 0);
  } else {
    // plan shape (x, y) in local x/y, extruded along local z → world: x, up, −y
    g.rotateX(-Math.PI / 2);
    g.translate(0, p.at, 0);
  }
  return g;
}

/** UVs in metres, projected along each triangle's main axis, so textures keep real-world scale. */
function worldUVs(g: THREE.BufferGeometry) {
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c;
      const [u, w] = ay >= ax && ay >= az ? [v.x, v.z] : ax >= az ? [v.z, v.y] : [v.x, v.y];
      uv[(i + k) * 2] = u;
      uv[(i + k) * 2 + 1] = w;
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

export type RoleMesh = {
  role: SurfaceRole;
  geometry: THREE.BufferGeometry;
  /** triangle start index → part id, for picking */
  ranges: { start: number; id: string }[];
};

export function buildRoleMeshes(parts: Part[]): RoleMesh[] {
  const byRole = new Map<SurfaceRole, Exclude<Part, { kind: "label" }>[]>();
  for (const p of parts) {
    if (p.kind === "label") continue;
    const list = byRole.get(p.role) ?? [];
    list.push(p);
    byRole.set(p.role, list);
  }
  const out: RoleMesh[] = [];
  for (const [role, list] of byRole) {
    const geos: THREE.BufferGeometry[] = [];
    const ranges: RoleMesh["ranges"] = [];
    let tris = 0;
    for (const p of list) {
      const g0 = partGeometry(p);
      const g = g0.index ? g0.toNonIndexed() : g0;
      if (g !== g0) g0.dispose();
      g.clearGroups();
      worldUVs(g);
      ranges.push({ start: tris, id: p.id });
      tris += g.attributes.position.count / 3;
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false)!;
    geos.forEach((g) => g.dispose());
    merged.computeBoundingSphere();
    out.push({ role, geometry: merged, ranges });
  }
  return out;
}

export function partAtTriangle(m: RoleMesh, tri: number): string | undefined {
  let lo = 0;
  let hi = m.ranges.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (m.ranges[mid].start <= tri) lo = mid;
    else hi = mid - 1;
  }
  return m.ranges[lo]?.id;
}
