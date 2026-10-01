/**
 * Pattern card thumbnails, generated from the real model: each pattern's recommended palette is rendered
 * offscreen (a small separate renderer, so the main view is untouched) and cached in localStorage.
 * The cache key includes a hash of the pattern file, so editing a pattern refreshes its thumbnail.
 */
import * as THREE from "three";
import { CENTER, PLOT, X_W } from "../model/building";
import { defaultDesign, resolveRoles, type Pattern } from "../model/resolve";
import { designParts } from "../scene/ExteriorScene";
import { buildRoleMeshes, toWorld } from "../scene/geometry";
import { applyStyle, makeRoleMaterial, texturesIdle } from "../scene/materials";

const VERSION = 2;
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};
const keyFor = (p: Pattern) => `ext-thumb:${VERSION}:${p.id}:${hash(JSON.stringify(p))}`;

export function cachedThumb(p: Pattern): string | null {
  try {
    return localStorage.getItem(keyFor(p));
  } catch {
    return null;
  }
}

const waitTextures = async (maxMs = 15000) => {
  const t0 = performance.now();
  while (!texturesIdle() && performance.now() - t0 < maxMs) await new Promise((r) => setTimeout(r, 100));
};

export async function bakeThumbnails(patterns: Pattern[], onThumb: (id: string, url: string) => void): Promise<void> {
  const todo = patterns.filter((p) => !cachedThumb(p));
  if (!todo.length) return;
  const W = 336;
  const H = 210;
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(W, H);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.8;
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 400);
  camera.position.set(...toWorld(X_W - 15, PLOT.y0 - 15, 2.5));
  camera.lookAt(...toWorld(CENTER.x - 0.5, CENTER.y - 2, 6.6));
  try {
    for (const p of todo) {
      const design = defaultDesign(p.id);
      const roles = resolveRoles(design);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#D9E3EB");
      scene.add(new THREE.HemisphereLight("#E8EEF5", "#B5A890", 1.0));
      const sun = new THREE.DirectionalLight("#FFF1DE", 1.9);
      sun.position.set(...toWorld(CENTER.x - 30, CENTER.y - 28, 34));
      scene.add(sun);
      const meshes = buildRoleMeshes(designParts(design));
      const mats: THREE.Material[] = [];
      for (const m of meshes) {
        if (m.role === "interior") continue;
        const mat = makeRoleMaterial(m.role);
        applyStyle(mat, m.role, roles[m.role], "normal");
        mats.push(mat);
        scene.add(new THREE.Mesh(m.geometry, mat));
      }
      await waitTextures();
      r.render(scene, camera);
      const url = r.domElement.toDataURL("image/jpeg", 0.82);
      try {
        localStorage.setItem(keyFor(p), url);
      } catch {
        /* storage full or blocked: thumbnails still show for this session */
      }
      onThumb(p.id, url);
      meshes.forEach((m) => m.geometry.dispose());
      mats.forEach((m) => m.dispose());
      await new Promise((res) => setTimeout(res, 30));
    }
  } finally {
    r.dispose();
    r.forceContextLoss();
  }
}
