import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, OrbitControls, PointerLockControls } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import skies from "../../../public/exterior/hdri/skies.json";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { buildElements } from "../model/elements";
import { patternById, resolveElements, resolveRoles, type DesignState } from "../model/resolve";
import { buildShell } from "../model/shell";
import { BALCONY, CENTER, LOCATION, STILT_BAND, TOP, X_E, X_W, level } from "../model/building";
import type { LabelPart, Part } from "../model/types";
import { contextParts, type ContextOptions } from "../model/context";
import type { LightSpec } from "../model/siteElements";
import { nightLightSpecs, pooledNightLights } from "./nightLights";
// the path tracer is only downloaded when a photo-quality still is requested
const PhotoStill = lazy(() => import("./PhotoStill").then((m) => ({ default: m.PhotoStill })));
import { dayOfYear, sunDirection, sunPosition } from "../sun";
import { CAMERA_PRESETS, WALK_START, type CameraId } from "./cameras";
import { buildRoleMeshes, partAtTriangle, toWorld, type RoleMesh } from "./geometry";
import { applyStyle, castsShadow, makeRoleMaterial, roleDebugColor, texturesIdle, type Quality } from "./materials";
import { EYE, groundAt, slide, walkColliders } from "./walk";
import { CameraSync, Exporter, type SceneApi } from "./SceneTools";
export type { SceneApi };

export type { Quality };
export type Sky = "clear" | "overcast" | "dusk" | "night";
/** full = materials; grey = all grey (the "grey test"); massing = grey + the concept's accent colour */
export type Look = "full" | "grey" | "massing";
export type ViewState = {
  mode: "orbit" | "walk";
  autoRotate: boolean;
  sky: Sky;
  /** local clock hour, e.g. 16.5 */
  hour: number;
  /** yyyy-mm-dd */
  date: string;
  context: ContextOptions;
  look?: Look;
};

export type PhotoRequest = { id: number; samples: number } | null;

export type ExteriorSceneProps = {
  design: DesignState;
  camera: CameraId;
  /** bump to re-apply the same camera preset */
  cameraNonce?: number;
  quality: Quality;
  view: ViewState;
  showRoles: boolean;
  onPick?: (part: Part | null) => void;
  /** jump to presets instead of animating (scripts) */
  instantCamera?: boolean;
  photo?: PhotoRequest;
  onPhotoProgress?: (fraction: number) => void;
  onPhotoDone?: (url: string | null) => void;
  /** receives capture / export functions for this view */
  onApi?: (api: SceneApi) => void;
  /** compare mode: keep this view's camera in sync with the other one */
  syncId?: string;
};

RectAreaLightUniformsLib.init();

const shells = new Map<string, ReturnType<typeof buildShell>>();
/** The building shell for a design's optional changes (cached: there are only a few combinations). */
export function shellFor(design: Pick<DesignState, "optional">) {
  const key = JSON.stringify(Object.entries(design.optional ?? {}).filter(([, v]) => v).sort());
  let s = shells.get(key);
  if (!s) shells.set(key, (s = buildShell(design.optional ?? {})));
  return s;
}
export const shell = shellFor({});

/** Parts for a design: the shell plus the design's elements. */
export function designParts(design: DesignState): Part[] {
  const sh = shellFor(design);
  return [...sh.parts, ...buildElements(resolveElements(design), { openings: sh.openings })];
}

// ---------------------------------------------------------------------------
const GREY = "#BDBAB3";
const KEEP: string[] = ["glass", "lightGlow", "interior", "road", "context", "greenery"];

function Building({ design, showRoles, onPick, quality, night, context, look = "full" }: Pick<ExteriorSceneProps, "design" | "showRoles" | "onPick" | "quality"> & { night: boolean; context: ContextOptions; look?: Look }) {
  const accent = useMemo(() => new Set<string>(look === "massing" ? (patternById(design.patternId).accentRoles ?? []) : []), [look, design.patternId]);
  const elements = useMemo(() => resolveElements(design), [design]);
  const sh = shellFor(design);
  const parts = useMemo(() => [...sh.parts, ...buildElements(elements, { openings: sh.openings }), ...contextParts(context)], [sh, elements, context]);
  const partById = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  const meshes = useMemo(() => buildRoleMeshes(parts), [parts]);
  useEffect(() => () => meshes.forEach((m) => m.geometry.dispose()), [meshes]);

  const materials = useMemo(() => new Map<string, THREE.MeshStandardMaterial>(), []);
  const roles = useMemo(() => resolveRoles(design), [design]);
  const matFor = (m: RoleMesh) => {
    let mat = materials.get(m.role);
    if (!mat) {
      mat = makeRoleMaterial(m.role);
      materials.set(m.role, mat);
    }
    const lookColor = look !== "full" && !KEEP.includes(m.role) && !accent.has(m.role) ? GREY : undefined;
    applyStyle(mat, m.role, roles[m.role], quality, showRoles ? roleDebugColor(m.role) : lookColor, night);
    return mat;
  };

  const click = (m: RoleMesh) => (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return; // a drag (orbit), not a click
    e.stopPropagation();
    const id = e.faceIndex != null ? partAtTriangle(m, e.faceIndex) : undefined;
    onPick?.(id ? (partById.get(id) ?? null) : null);
  };
  const labels = parts.filter((p): p is LabelPart => p.kind === "label");
  return (
    <group>
      {meshes.map((m) => (
        <mesh key={m.role} geometry={m.geometry} material={matFor(m)} castShadow={castsShadow(m.role)} receiveShadow onClick={click(m)} />
      ))}
      {labels.map((l) => (
        <NameSign key={l.id} part={l} onPick={onPick} night={night} />
      ))}
      <WalkColliders parts={parts} />
      {night && <NightLights design={design} quality={quality} parts={parts} />}
    </group>
  );
}

function NameSign({ part, onPick, night }: { part: LabelPart; onPick?: (p: Part | null) => void; night: boolean }) {
  const tex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = 1024;
    cv.height = Math.round((1024 * part.height) / part.width);
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#5A3E26";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(cv.height * 0.62)}px "Nirmala UI", "Mangal", "Noto Sans Devanagari", sans-serif`;
    ctx.fillText(part.text, cv.width / 2, cv.height / 2);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [part]);
  return (
    <mesh position={toWorld(part.x, part.y, part.z)} onClick={(e) => (e.delta <= 4 ? (e.stopPropagation(), onPick?.(part)) : undefined)}>
      <planeGeometry args={[part.width, part.height]} />
      <meshStandardMaterial map={tex} transparent roughness={0.35} metalness={0.6} emissive="#FFB060" emissiveMap={tex} emissiveIntensity={night ? 0.8 : 0} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Sky (HDRI), sun, night lights
// ---------------------------------------------------------------------------
type SkyKey = keyof typeof skies;
const HDRI = (k: SkyKey) => `${import.meta.env.BASE_URL}exterior/hdri/${skies[k].file}`;

/** Rotation (about the vertical) that puts the sky image's sun at the real sun's compass direction. */
function skyRotation(k: SkyKey, sunWorld: THREE.Vector3): [number, number, number] {
  const phiSky = (skies[k].sunU - 0.5) * 2 * Math.PI; // three.js equirect: u = atan2(z, x) / 2π + 0.5
  const phiSun = Math.atan2(sunWorld.z, sunWorld.x);
  return [0, phiSky - phiSun, 0];
}

function Lighting({ view, quality }: { view: ViewState; quality: Quality }) {
  const { scene } = useThree();
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...toWorld(CENTER.x, CENTER.y, 0));
    return o;
  }, []);
  const sun = useMemo(() => sunPosition(LOCATION.lat, LOCATION.lon, dayOfYear(view.date), view.hour), [view.date, view.hour]);
  const alt = Math.max(1.5, sun.altitude);
  const dir = new THREE.Vector3(...sunDirection({ ...sun, altitude: alt }));
  const sunPos = dir.clone().multiplyScalar(60).add(target.position);
  const low = THREE.MathUtils.clamp(1 - (alt - 3) / 25, 0, 1); // 1 near the horizon
  const sunColor = new THREE.Color("#FFF1DE").lerp(new THREE.Color("#FFA45C"), low);
  const size = quality === "high" ? 4096 : 2048;
  const sky: SkyKey = view.sky === "night" || view.sky === "dusk" ? "night" : view.sky === "overcast" ? "overcast" : alt < 15 ? "golden" : "day";
  // the sky image's sun goes where the real sun is (cloudy / night: its bright side towards the south-west)
  const rot = skyRotation(sky, view.sky === "clear" ? dir : new THREE.Vector3(...sunDirection({ altitude: 30, azimuth: 225 })));
  const fog = view.sky === "night" ? "#0B111C" : view.sky === "dusk" ? "#4A587A" : view.sky === "overcast" ? "#C6CBCF" : "#C9D3DB";
  useEffect(() => {
    scene.fog = new THREE.Fog(fog, 260, 700);
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  const shadowProps = {
    castShadow: true,
    "shadow-mapSize": [size, size] as [number, number],
    "shadow-camera-left": -18,
    "shadow-camera-right": 18,
    "shadow-camera-top": 18,
    "shadow-camera-bottom": -18,
    "shadow-camera-near": 20,
    "shadow-camera-far": 110,
    "shadow-bias": -0.0003,
    "shadow-normalBias": 0.03,
  };
  const env = { clear: { env: 0.55 - 0.2 * low, bg: 0.9 }, overcast: { env: 0.95, bg: 1.0 }, dusk: { env: 0.95, bg: 1 }, night: { env: 0.08, bg: 0.18 } }[view.sky];
  return (
    <>
      {view.sky === "dusk" ? (
        <Environment map={duskSky()} background environmentIntensity={env.env} backgroundIntensity={env.bg} />
      ) : (
        <Environment files={HDRI(sky)} background environmentIntensity={env.env} backgroundIntensity={env.bg} environmentRotation={rot} backgroundRotation={rot} />
      )}
      {view.sky === "dusk" && (
        <>
          <hemisphereLight args={["#6F84B8", "#3A3128", 0.55]} />
          {/* afterglow from the west: the sun is just below the horizon */}
          <directionalLight position={toWorld(CENTER.x - 60, CENTER.y - 10, 6)} target={target} intensity={0.75} color="#FFB48A" {...shadowProps} />
        </>
      )}
      <primitive object={target} />
      {view.sky === "clear" && <directionalLight position={sunPos} target={target} intensity={1.75 * (0.35 + 0.65 * (1 - low))} color={sunColor} {...shadowProps} />}
      {view.sky === "overcast" && <directionalLight position={toWorld(CENTER.x - 5, CENTER.y - 8, 60)} target={target} intensity={0.3} color="#F4F4F2" {...shadowProps} shadow-radius={12} />}
      {view.sky === "night" && (
        <>
          <hemisphereLight args={["#34466C", "#1C1814", 0.18]} />
          <directionalLight position={toWorld(CENTER.x - 30, CENTER.y - 20, 45)} target={target} intensity={0.08} color="#A8BBFF" {...shadowProps} />
        </>
      )}
    </>
  );
}

/** Real light sources for the facade lights, the moves and the street lamps (dusk and night), as a fixed pool (see nightLights.ts). */
function NightLights({ design, quality, parts }: { design: DesignState; quality: Quality; parts: Part[] }) {
  const lights = useMemo(() => pooledNightLights(nightLightSpecs(design, parts, quality), quality), [design, parts, quality]);
  const warm = "#FFC98A";
  return (
    <group>
      {lights.map((l) => {
        if (l.kind === "point") return <pointLight key={l.id} position={toWorld(...l.pos)} intensity={l.intensity} distance={l.distance} decay={2} color={warm} />;
        if (l.kind === "spot") return <Spot key={l.id} spec={l} color={warm} />;
        return <Rect key={l.id} spec={l} color={warm} />;
      })}
    </group>
  );
}

function Spot({ spec, color }: { spec: Extract<LightSpec, { kind: "spot" }>; color: string }) {
  const t = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...toWorld(...spec.target));
    return o;
  }, [spec]);
  return (
    <>
      <primitive object={t} />
      <spotLight position={toWorld(...spec.pos)} target={t} intensity={spec.intensity} distance={spec.distance} angle={spec.angle} penumbra={0.7} decay={2} color={color} />
    </>
  );
}
function Rect({ spec, color }: { spec: Extract<LightSpec, { kind: "rect" }>; color: string }) {
  const ref = useRef<THREE.RectAreaLight>(null);
  useEffect(() => ref.current?.lookAt(...toWorld(...spec.target)), [spec]);
  return <rectAreaLight ref={ref} position={toWorld(...spec.pos)} width={spec.width} height={spec.height} intensity={spec.intensity} color={color} />;
}

/** Ambient occlusion + anti-aliasing (High), glow around lights at night (bloom). */
function Effects({ quality, night }: { quality: Quality; night: boolean }) {
  const high = quality === "high";
  if (!high && !night) return null;
  return (
    <>
      <RestoreAutoClear />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <>{high && <N8AO aoRadius={0.9} intensity={1.4} distanceFalloff={0.6} quality="medium" halfRes />}</>
        <>{night && <Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.2} intensity={0.9} />}</>
        <>{high && <SMAA />}</>
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}

/**
 * postprocessing's EffectComposer switches the renderer's autoClear off and never switches it back. When the composer
 * goes away (Dusk / Night → Day in Normal quality) frames were drawn over the last one without clearing colour or
 * depth: fine while still, smeared and see-through as soon as the camera moved.
 */
function RestoreAutoClear() {
  const gl = useThree((s) => s.gl);
  useEffect(
    () => () => {
      gl.autoClear = true;
    },
    [gl],
  );
  return null;
}

/** Blue-hour sky: deep blue zenith, a warm afterglow low in the west, dark ground (equirect, made once). */
let duskTex: THREE.Texture | null = null;
function duskSky(): THREE.Texture {
  if (duskTex) return duskTex;
  const W = 1024;
  const H = 512;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
  const zenith = [14, 26, 56];
  const mid = [38, 62, 112];
  const horizon = [110, 128, 168];
  const glow = [236, 150, 104];
  const ground = [24, 24, 30];
  for (let y = 0; y < H; y++) {
    const el = (0.5 - y / H) * Math.PI; // elevation: +π/2 at the top … −π/2 at the bottom
    for (let x = 0; x < W; x++) {
      // three.js equirect: u = atan2(z, x) / 2π + 0.5, so west (−x) sits at u = 0 / 1
      const toWest = Math.cos((x / W) * 2 * Math.PI);
      let c: number[];
      if (el < 0) c = mix(horizon, ground, -el / 0.15);
      else {
        const t = el / (Math.PI / 2);
        c = t < 0.25 ? mix(horizon, mid, t / 0.25) : mix(mid, zenith, (t - 0.25) / 0.75);
        c = mix(c, glow, Math.max(0, toWest) ** 3 * Math.max(0, 1 - el / 0.35));
      }
      const i = (y * W + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  duskTex = t;
  return t;
}

// ---------------------------------------------------------------------------
// Cameras
// ---------------------------------------------------------------------------
type Ctl = OrbitControlsImpl | null;

function CameraRig({ id, nonce, instant }: { id: CameraId; nonce?: number; instant?: boolean }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: Ctl };
  const anim = useRef<{ p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; f0: number; f1: number; t: number } | null>(null);
  const first = useRef(true);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const parse = (k: string) => q.get(k)?.split(",").map(Number) as [number, number, number] | undefined;
    const cp = parse("cp");
    const ct = parse("ct");
    const useUrl = first.current && cp && ct;
    const p = useUrl ? { pos: cp!, target: ct!, fov: Number(q.get("fov") ?? 50) } : CAMERA_PRESETS[id];
    const p1 = new THREE.Vector3(...toWorld(...p.pos));
    const t1 = new THREE.Vector3(...toWorld(...p.target));
    camera.near = 0.1;
    camera.far = 600;
    if (first.current || instant || !controls) {
      if (controls) first.current = false;
      camera.position.copy(p1);
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
      if (controls) {
        controls.target.copy(t1);
        controls.update();
      } else camera.lookAt(t1);
      return;
    }
    anim.current = { p0: camera.position.clone(), t0: controls.target.clone(), p1, t1, f0: camera.fov, f1: p.fov, t: 0 };
  }, [id, nonce, camera, controls, instant]);
  useFrame((_, dt) => {
    const a = anim.current;
    if (!a || !controls) return;
    a.t = Math.min(1, a.t + dt / 0.9);
    const e = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2; // ease in-out
    camera.position.lerpVectors(a.p0, a.p1, e);
    controls.target.lerpVectors(a.t0, a.t1, e);
    camera.fov = a.f0 + (a.f1 - a.f0) * e;
    camera.updateProjectionMatrix();
    controls.update();
    if (a.t >= 1) anim.current = null;
  });
  return null;
}

/** Keeps the orbit camera above ground and out of the flats (the parking under them is allowed). */
const FLATS_BOX = new THREE.Box3(
  new THREE.Vector3(X_W - 0.3, level(1) - STILT_BAND - 0.2, -(BALCONY.N.y1 + 0.3)),
  new THREE.Vector3(X_E + 0.3, TOP + 0.4, -(BALCONY.S.y - 0.3)),
);
function CameraLimits() {
  const { camera, controls } = useThree() as unknown as { camera: THREE.Camera; controls: Ctl };
  useFrame(() => {
    const p = camera.position;
    if (p.y < 0.6) p.y = 0.6;
    if (controls && controls.target.y < 0) controls.target.y = 0;
    if (FLATS_BOX.containsPoint(p)) {
      // push out through the nearest face
      const b = FLATS_BOX;
      const d = [p.x - b.min.x, b.max.x - p.x, p.y - b.min.y, b.max.y - p.y, p.z - b.min.z, b.max.z - p.z];
      const i = d.indexOf(Math.min(...d));
      if (i === 0) p.x = b.min.x;
      else if (i === 1) p.x = b.max.x;
      else if (i === 2) p.y = b.min.y;
      else if (i === 3) p.y = b.max.y;
      else if (i === 4) p.z = b.min.z;
      else p.z = b.max.z;
    }
  });
  return null;
}

// ---------------------------------------------------------------------------
// Walk mode
// ---------------------------------------------------------------------------
let colliders: ReturnType<typeof walkColliders> = [];
function WalkColliders({ parts }: { parts: Part[] }) {
  useEffect(() => {
    colliders = walkColliders(parts);
  }, [parts]);
  return null;
}

function Walk() {
  const { camera } = useThree();
  const keys = useRef(new Set<string>());
  const state = useRef({ x: WALK_START.x, y: WALK_START.y, eye: groundAt(WALK_START.x, WALK_START.y) + EYE });
  useEffect(() => {
    const s = state.current;
    camera.position.set(...toWorld(s.x, s.y, s.eye));
    camera.lookAt(...toWorld(s.x, s.y + 10, s.eye + 1.5));
    (camera as THREE.PerspectiveCamera).fov = 65;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    const down = (e: KeyboardEvent) => keys.current.add(e.code);
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [camera]);
  useFrame((_, dt) => {
    const k = keys.current;
    const fwd = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    const side = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    const s = state.current;
    if (fwd || side) {
      const speed = (k.has("ShiftLeft") || k.has("ShiftRight") ? 3.2 : 1.4) * Math.min(dt, 0.05);
      const look = new THREE.Vector3();
      camera.getWorldDirection(look);
      // world → plan: plan x = world x, plan y = −world z
      const n = Math.hypot(look.x, look.z) || 1;
      const ux = look.x / n;
      const uy = -look.z / n;
      const dx = (ux * fwd + uy * side) * speed;
      const dy = (uy * fwd - ux * side) * speed;
      [s.x, s.y] = slide(s.x, s.y, dx, dy, colliders);
    }
    const eye = groundAt(s.x, s.y) + EYE;
    s.eye += (eye - s.eye) * Math.min(1, dt * 8);
    camera.position.set(...toWorld(s.x, s.y, s.eye));
  });
  return <PointerLockControls selector="#walk-start" />;
}

// ---------------------------------------------------------------------------
/** window.__extReady once textures are loaded and frames have rendered (used by scripts). */
function ReadyFlag() {
  const n = useRef(0);
  useFrame(() => {
    if (!texturesIdle()) return;
    if (++n.current === 30) (window as unknown as { __extReady?: boolean }).__extReady = true;
  });
  return null;
}

/** Exposes the renderer to the app (screenshots, thumbnails). */
function Expose() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    (window as unknown as { __ext?: unknown }).__ext = { gl, scene, camera };
  }, [gl, scene, camera]);
  return null;
}

export function ExteriorScene({ design, camera, cameraNonce, quality, view, showRoles, onPick, instantCamera, photo, onPhotoProgress, onPhotoDone, onApi, syncId }: ExteriorSceneProps) {
  const high = quality === "high";
  // dusk counts as "lights on": facade lights, window glow and bloom
  const night = view.sky === "night" || view.sky === "dusk";
  return (
    <Canvas
      shadows="soft"
      dpr={high ? [1, 2] : [1, 1.25]}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: night ? 1.0 : 0.85 }}
      camera={{ position: [0, 10, 30], fov: 50 }}
      onPointerMissed={() => onPick?.(null)}
    >
      <Lighting view={view} quality={quality} />
      <Building design={design} showRoles={showRoles} onPick={view.mode === "orbit" ? onPick : undefined} quality={quality} night={night} context={view.context} look={view.look} />
      {view.mode === "orbit" ? (
        <>
          <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI * 0.49} minDistance={2} maxDistance={160} autoRotate={view.autoRotate} autoRotateSpeed={0.7} />
          <CameraRig id={camera} nonce={cameraNonce} instant={instantCamera} />
          <CameraLimits />
          {syncId && <CameraSync id={syncId} />}
        </>
      ) : (
        <Walk />
      )}
      {photo ? (
        <Suspense fallback={null}>
          <PhotoStill key={photo.id} samples={photo.samples} onProgress={onPhotoProgress} onDone={onPhotoDone} />
        </Suspense>
      ) : (
        <Effects quality={quality} night={night} />
      )}
      <ReadyFlag />
      <Expose />
      <Exporter onApi={onApi} />
    </Canvas>
  );
}
