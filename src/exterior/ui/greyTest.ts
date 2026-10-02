/**
 * In-app grey test (quality gate 10): renders designs all-grey from the street corner in afternoon sun (offscreen,
 * with shadows so depth shows) and compares the building area pixel by pixel. A concept passes when it differs
 * from every other concept and from the Architect's design by at least THRESHOLD (mean grey level, 0–255).
 */
import * as THREE from "three";
import { CENTER, PLOT, X_W } from "../model/building";
import { defaultDesign, type DesignState } from "../model/resolve";
import { designParts } from "../scene/ExteriorScene";
import { buildRoleMeshes, toWorld } from "../scene/geometry";
import { sunDirection } from "../sun";

export const GREY_THRESHOLD = 4;
export type GreyShot = { key: string; label: string; url: string; pixels: Uint8ClampedArray };

const W = 320;
const H = 240;
const cache = new Map<string, GreyShot>();

function render(r: THREE.WebGLRenderer, design: DesignState): { url: string; pixels: Uint8ClampedArray } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#C9D3DB");
  scene.add(new THREE.HemisphereLight("#E9EEF4", "#A49C90", 0.9));
  const sun = new THREE.DirectionalLight("#FFFFFF", 2.2);
  const d = sunDirection({ altitude: 38, azimuth: 235 });
  sun.position.set(...toWorld(CENTER.x + d[0] * 60, CENTER.y - d[2] * 60, d[1] * 60));
  sun.target.position.set(...toWorld(CENTER.x, CENTER.y, 0));
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 10, far: 130 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  const mat = new THREE.MeshStandardMaterial({ color: "#BDBAB3", roughness: 0.9 });
  const meshes = buildRoleMeshes(designParts(design).filter((p) => !["interior", "context", "road"].includes(p.role)));
  for (const m of meshes) {
    const mesh = new THREE.Mesh(m.geometry, m.role === "glass" ? new THREE.MeshStandardMaterial({ color: "#3A4448", roughness: 0.2 }) : mat);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: "#A9A59D" }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const cam = new THREE.PerspectiveCamera(40, W / H, 0.1, 400);
  cam.position.set(...toWorld(X_W - 13, PLOT.y0 - 12.5, 3));
  cam.lookAt(...toWorld(CENTER.x - 0.5, CENTER.y - 1.5, 7.5));
  r.render(scene, cam);
  const url = r.domElement.toDataURL("image/jpeg", 0.85);
  const gl = r.getContext();
  const raw = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, raw);
  meshes.forEach((m) => m.geometry.dispose());
  mat.dispose();
  // grey levels of the building area (middle of the frame)
  const x0 = Math.round(W * 0.15);
  const x1 = Math.round(W * 0.85);
  const y0 = Math.round(H * 0.08);
  const y1 = Math.round(H * 0.95);
  const px = new Uint8ClampedArray((x1 - x0) * (y1 - y0));
  let k = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px[k++] = raw[(y * W + x) * 4 + 1];
  return { url, pixels: px };
}

export async function greyShots(items: { key: string; label: string; design: DesignState }[]): Promise<GreyShot[]> {
  const todo = items.filter((i) => !cache.has(i.key));
  if (todo.length) {
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setSize(W, H);
    r.setPixelRatio(1);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    try {
      for (const i of todo) {
        cache.set(i.key, { key: i.key, label: i.label, ...render(r, i.design) });
        await new Promise((res) => setTimeout(res, 0));
      }
    } finally {
      r.dispose();
      r.forceContextLoss();
    }
  }
  return items.map((i) => cache.get(i.key)!);
}

export function greyDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

export const keyOf = (d: DesignState) => JSON.stringify([d.patternId, d.overrides.elements, d.optional ?? {}]);
export const referenceSet = (ids: string[]) => ids.map((id) => ({ key: keyOf(defaultDesign(id)), id, design: defaultDesign(id) }));
