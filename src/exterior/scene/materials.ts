/**
 * One three.js material per surface role. Restyling only changes colour / maps on these,
 * so switching palettes is instant and the camera never moves.
 *
 * Colours: hex values are sRGB; three.js colour management converts them to linear.
 * Textures: albedo maps are neutral grey with a linear mean of 0.5 (scripts/exterior-fetch-assets.ts),
 * so the colour is doubled: the surface's average tone then equals the palette hex.
 * Textures load lazily (only for materials the current design uses) and are cached.
 */
import * as THREE from "three";
import { MATERIALS, type MaterialDef, type RoleStyle } from "../model/resolve";
import { SURFACE_ROLES, type SurfaceRole } from "../model/types";

export type Quality = "normal" | "high";

const NO_SHADOW: SurfaceRole[] = ["glass", "interior", "context", "road", "ground", "paving"];
export const castsShadow = (role: SurfaceRole) => !NO_SHADOW.includes(role);

/** Debug view: a distinct colour per role ("Colour each surface type"). */
export function roleDebugColor(role: SurfaceRole): string {
  const i = SURFACE_ROLES.indexOf(role);
  if (role === "glass") return "#7FB3D5";
  if (role === "interior" || role === "context" || role === "road") return "#9A9A9A";
  return `hsl(${Math.round(i * 137.5) % 360}, ${i % 2 ? 70 : 55}%, ${i % 3 === 0 ? 52 : 64}%)`;
}

// ---------------------------------------------------------------------------
// Texture cache
// ---------------------------------------------------------------------------
const loader = new THREE.TextureLoader();
const textures = new Map<string, THREE.Texture>();
let pending = 0;
/** True once every requested texture has loaded (screenshot / ready flag). */
export const texturesIdle = () => pending === 0;

function texture(set: string, map: "albedo" | "normal" | "rough", size: [number, number]): THREE.Texture {
  const key = `${set}/${map}@${size[0]}x${size[1]}`;
  let t = textures.get(key);
  if (!t) {
    pending++;
    t = loader.load(
      `${import.meta.env.BASE_URL}exterior/textures/${set}/${map}.jpg`,
      () => pending--,
      undefined,
      () => pending--,
    );
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / size[0], 1 / size[1]); // UVs are in metres
    t.anisotropy = 8;
    t.colorSpace = map === "albedo" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    textures.set(key, t);
  }
  return t;
}

// ---------------------------------------------------------------------------
export function makeRoleMaterial(role: SurfaceRole): THREE.MeshStandardMaterial {
  if (role === "glass") {
    return new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.82, roughness: 0.04, metalness: 0.2, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: 0.03 });
  }
  const m = new THREE.MeshStandardMaterial();
  m.name = role;
  return m;
}

/** Apply a resolved role style; flags a shader rebuild only when the set of maps changes. */
export function applyStyle(m: THREE.MeshStandardMaterial, role: SurfaceRole, style: RoleStyle, quality: Quality, debugColor?: string) {
  const def: MaterialDef | undefined = MATERIALS[style.material];
  const textured = !debugColor && !!def?.textureSet && role !== "glass";
  const before = `${!!m.map}${!!m.normalMap}${!!m.roughnessMap}`;
  if (textured) {
    const size = def!.realSizeMeters ?? [1, 1];
    m.map = texture(def!.textureSet!, "albedo", size);
    m.normalMap = texture(def!.normalSet ?? def!.textureSet!, "normal", def!.normalSizeMeters ?? size);
    m.normalScale.setScalar(def!.normalScale ?? 1);
    m.roughnessMap = quality === "high" && !def!.normalSet ? texture(def!.textureSet!, "rough", size) : null;
    m.color.set(style.color).multiplyScalar(2);
  } else {
    m.map = null;
    m.normalMap = null;
    m.roughnessMap = null;
    m.color.set(debugColor ?? style.color);
  }
  if (role !== "glass") {
    m.roughness = m.roughnessMap ? 1 : (def?.roughness ?? 0.9);
    m.metalness = def?.metalness ?? 0;
  }
  if (role === "interior") {
    m.roughness = 1;
    m.envMapIntensity = 0.2;
  }
  if (`${!!m.map}${!!m.normalMap}${!!m.roughnessMap}` !== before) m.needsUpdate = true;
}
