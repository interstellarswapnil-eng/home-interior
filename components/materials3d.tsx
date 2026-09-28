import { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { materialLibrary, type MaterialId, type MaterialSpec } from "../plan/materials";

/**
 * Builds three.js materials from plan/materials.ts `materialLibrary`.
 * Textures load once per file; per-use clones share the GPU image (same Source) and only
 * differ in repeat, which is set from real-world size so tiles/grain/weave stay to scale.
 */
export type Quality = "high" | "performance";
/** Base tone-mapping exposure (ACES Filmic). Tour adds small bumps on balcony views. */
export const EXPOSURE = 1.0;
export const QualityContext = createContext<Quality>("high");
export const HighlightContext = createContext(false);

const loader = new THREE.TextureLoader();
const base = new Map<string, THREE.Texture>();
/** clones made before their image arrived — flagged for upload once it has */
const waiting = new Map<string, THREE.Texture[]>();
let pending = 0;
/** true once every requested texture has finished loading (used by the screenshot/ready flag) */
export const texturesIdle = () => pending === 0;

function baseTexture(path: string, color: boolean): THREE.Texture {
  let t = base.get(path);
  if (!t) {
    pending++;
    t = loader.load(
      path,
      () => {
        pending--;
        for (const c of waiting.get(path) ?? []) c.needsUpdate = true;
        waiting.delete(path);
      },
      undefined,
      () => pending--,
    );
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    base.set(path, t);
  }
  return t;
}

function mapFor(spec: MaterialSpec, file: string, color: boolean, ru: number, rv: number): THREE.Texture {
  const path = `${import.meta.env.BASE_URL}textures/${spec.tex!.dir}/${file}.jpg`;
  const src = baseTexture(path, color);
  const t = src.clone();
  if (!src.image) {
    t.version = 0; // don't upload an empty image; re-flagged when the file loads
    waiting.set(path, [...(waiting.get(path) ?? []), t]);
  }
  t.repeat.set(ru, rv);
  if (spec.rotation) {
    t.center.set(0.5, 0.5);
    t.rotation = spec.rotation;
  }
  return t;
}

const cache = new Map<string, THREE.Material>();

/**
 * @param u,v  real-world size (m) of the surface the UVs span, for texture repeat
 */
export function getMaterial(id: MaterialId, u = 1, v = 1, quality: Quality = "high", highlight = false): THREE.Material {
  const spec: MaterialSpec = materialLibrary[id];
  const tile = spec.tileM ?? 1;
  const ru = Math.max(0.05, u / tile);
  const rv = Math.max(0.05, v / tile);
  const key = `${id}|${ru.toFixed(2)}|${rv.toFixed(2)}|${quality}|${highlight ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const high = quality === "high";
  let m: THREE.MeshStandardMaterial;
  if (spec.glass) {
    m = high
      ? new THREE.MeshPhysicalMaterial({
          color: spec.color,
          roughness: spec.roughness,
          metalness: 0,
          transmission: 0, // enabled near the ensuite by setGlassTransmission()
          thickness: spec.glass.thickness,
          ior: spec.glass.ior,
          transparent: true,
          opacity: spec.glass.opacityFallback,
          depthWrite: false,
          envMapIntensity: 1,
        })
      : new THREE.MeshStandardMaterial({ color: spec.color, roughness: spec.roughness, transparent: true, opacity: spec.glass.opacityFallback, depthWrite: false });
  } else {
    m = new THREE.MeshStandardMaterial({ color: spec.color, roughness: spec.roughness, metalness: spec.metalness ?? 0 });
  }
  if (spec.tex) {
    if (spec.tex.albedo) m.map = mapFor(spec, "albedo", true, ru, rv);
    // Performance mode keeps colour maps, drops normal/roughness detail
    if (high && spec.tex.normal) {
      m.normalMap = mapFor(spec, "normal", false, ru, rv);
      m.normalScale.setScalar(spec.normalScale ?? 1);
    }
    if (high && spec.tex.rough) m.roughnessMap = mapFor(spec, "rough", false, ru, rv);
  }
  if (spec.opacity !== undefined && spec.opacity < 1) {
    m.transparent = true;
    m.opacity = spec.opacity;
    m.depthWrite = false;
  }
  if (spec.doubleSide) m.side = THREE.DoubleSide;
  if (spec.envMapIntensity !== undefined) m.envMapIntensity = spec.envMapIntensity;
  if (spec.emissive) {
    m.emissive.set(spec.emissive);
    m.emissiveIntensity = spec.emissiveIntensity ?? 1;
  }
  if (highlight) {
    m.emissive.set("#E0892B");
    m.emissiveIntensity = 0.45;
  }
  m.name = id;
  cache.set(key, m);
  return m;
}

/**
 * True glass transmission costs a full extra scene pass whenever a transmissive mesh is in view,
 * so the shower screen only transmits while the camera is in/near the ensuite; elsewhere it is
 * reflective transparent glass. Toggling recompiles the shader once at that threshold.
 */
export function setGlassTransmission(on: boolean) {
  for (const [key, m] of cache) {
    if (!key.startsWith("glass|") || !(m instanceof THREE.MeshPhysicalMaterial)) continue;
    const spec = materialLibrary.glass;
    if ((m.transmission > 0) === on) continue;
    m.transmission = on ? spec.glass.transmission : 0;
    m.opacity = on ? 1 : spec.glass.opacityFallback;
    m.depthWrite = on;
    m.needsUpdate = true;
  }
}

/** `<mesh><boxGeometry/><Mat id="granite" u={L} v={D} /></mesh>` */
export function Mat({ id, u, v }: { id: MaterialId; u?: number; v?: number }) {
  const q = useContext(QualityContext);
  const hl = useContext(HighlightContext);
  const m = useMemo(() => getMaterial(id, u, v, q, hl && id !== "ledWarm"), [id, u, v, q, hl]);
  return <primitive object={m} attach="material" />;
}
