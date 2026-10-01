/**
 * One three.js material per surface role. Restyling only changes colour / roughness on these,
 * so switching palettes is instant and the camera never moves.
 * Hex colours are sRGB; three.js colour management converts them to linear.
 */
import * as THREE from "three";
import { MATERIALS, type RoleStyle } from "../model/resolve";
import { SURFACE_ROLES, type SurfaceRole } from "../model/types";

const NO_SHADOW: SurfaceRole[] = ["glass", "interior", "context", "road", "ground", "paving"];
export const castsShadow = (role: SurfaceRole) => !NO_SHADOW.includes(role);

/** Debug view: a distinct colour per role ("Show surface roles"). */
export function roleDebugColor(role: SurfaceRole): string {
  const i = SURFACE_ROLES.indexOf(role);
  if (role === "glass") return "#7FB3D5";
  if (role === "interior" || role === "context" || role === "road") return "#9A9A9A";
  return `hsl(${Math.round(i * 137.5) % 360}, ${i % 2 ? 70 : 55}%, ${i % 3 === 0 ? 52 : 64}%)`;
}

export function makeRoleMaterial(role: SurfaceRole): THREE.MeshStandardMaterial {
  if (role === "glass") {
    return new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.82, roughness: 0.04, metalness: 0.2, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: 0.03 });
  }
  const m = new THREE.MeshStandardMaterial();
  m.name = role;
  return m;
}

export function applyStyle(m: THREE.MeshStandardMaterial, role: SurfaceRole, style: RoleStyle, debugColor?: string) {
  const def = MATERIALS[style.material];
  m.color.set(debugColor ?? style.color);
  if (role !== "glass") {
    m.roughness = def?.roughness ?? 0.9;
    m.metalness = def?.metalness ?? 0;
  }
  if (role === "interior") {
    m.roughness = 1;
    m.envMapIntensity = 0.2;
  }
  m.needsUpdate = false;
}
