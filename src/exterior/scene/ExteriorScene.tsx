import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, OrbitControls, PointerLockControls, Sky } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { buildElements } from "../model/elements";
import { resolveElements, resolveRoles, type DesignState } from "../model/resolve";
import { buildShell } from "../model/shell";
import { BALCONY, CENTER, LOCATION, STILT_BAND, TOP, X_E, X_W, level } from "../model/building";
import type { LabelPart, Part } from "../model/types";
import { dayOfYear, sunDirection, sunPosition } from "../sun";
import { CAMERA_PRESETS, WALK_START, type CameraId } from "./cameras";
import { buildRoleMeshes, partAtTriangle, toWorld, type RoleMesh } from "./geometry";
import { applyStyle, castsShadow, makeRoleMaterial, roleDebugColor, texturesIdle, type Quality } from "./materials";
import { EYE, groundAt, slide, walkColliders } from "./walk";

export type { Quality };
export type Sky = "clear" | "overcast" | "night";
export type ViewState = {
  mode: "orbit" | "walk";
  autoRotate: boolean;
  sky: Sky;
  /** local clock hour, e.g. 16.5 */
  hour: number;
  /** yyyy-mm-dd */
  date: string;
};

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
};

export const shell = buildShell();

/** Parts for a design: the fixed shell plus the design's elements. */
export function designParts(design: DesignState): Part[] {
  return [...shell.parts, ...buildElements(resolveElements(design), { openings: shell.openings })];
}

// ---------------------------------------------------------------------------
function Building({ design, showRoles, onPick, quality, night }: Pick<ExteriorSceneProps, "design" | "showRoles" | "onPick" | "quality"> & { night: boolean }) {
  const elements = useMemo(() => resolveElements(design), [design]);
  const parts = useMemo(() => [...shell.parts, ...buildElements(elements, { openings: shell.openings })], [elements]);
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
    applyStyle(mat, m.role, roles[m.role], quality, showRoles ? roleDebugColor(m.role) : undefined, night);
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
// Sky, sun, environment
// ---------------------------------------------------------------------------
function Lighting({ view, quality }: { view: ViewState; quality: Quality }) {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...toWorld(CENTER.x, CENTER.y, 0));
    return o;
  }, []);
  const sun = useMemo(() => sunPosition(LOCATION.lat, LOCATION.lon, dayOfYear(view.date), view.hour), [view.date, view.hour]);
  const alt = Math.max(1.5, sun.altitude);
  const dir = new THREE.Vector3(...sunDirection({ ...sun, altitude: alt }));
  const sunPos = dir.clone().multiplyScalar(60).add(target.position);
  // warmer and dimmer near the horizon
  const low = THREE.MathUtils.clamp(1 - (alt - 3) / 25, 0, 1);
  const sunColor = new THREE.Color("#FFF1DE").lerp(new THREE.Color("#FFA45C"), low);
  const size = quality === "high" ? 4096 : 2048;
  const envKey = `${view.sky}-${Math.round(view.hour * 4)}-${view.date}`;
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

  if (view.sky === "night") {
    return (
      <>
        <color attach="background" args={["#0E1626"]} />
        <Environment key={envKey} frames={1} resolution={64} environmentIntensity={0.7}>
          <mesh scale={200}>
            <sphereGeometry />
            <meshBasicMaterial color="#2A3A58" side={THREE.BackSide} />
          </mesh>
        </Environment>
        <hemisphereLight args={["#4A5E88", "#2A241E", 0.6]} />
        <primitive object={target} />
        <directionalLight position={toWorld(CENTER.x - 30, CENTER.y - 20, 45)} target={target} intensity={0.3} color="#9FB4FF" {...shadowProps} />
      </>
    );
  }
  if (view.sky === "overcast") {
    return (
      <>
        <color attach="background" args={["#C9CED3"]} />
        <Environment key={envKey} frames={1} resolution={64} environmentIntensity={1.0}>
          <mesh scale={200}>
            <sphereGeometry />
            <meshBasicMaterial color="#DADDE0" side={THREE.BackSide} />
          </mesh>
        </Environment>
        <hemisphereLight args={["#E6E9EC", "#9C968C", 0.55]} />
        <primitive object={target} />
        <directionalLight position={toWorld(CENTER.x - 5, CENTER.y - 8, 60)} target={target} intensity={0.35} color="#F4F4F2" {...shadowProps} shadow-radius={12} />
      </>
    );
  }
  const sunArr = dir.toArray() as [number, number, number];
  return (
    <>
      <Sky sunPosition={sunArr} turbidity={6} rayleigh={1.2 + low} mieCoefficient={0.004} mieDirectionalG={0.8} distance={4500} />
      <Environment key={envKey} frames={1} resolution={256} environmentIntensity={0.75 - 0.35 * low}>
        <Sky sunPosition={sunArr} turbidity={6} rayleigh={1.2 + low} mieCoefficient={0.004} mieDirectionalG={0.8} distance={4500} />
      </Environment>
      <hemisphereLight args={["#DDE8F5", "#B8A88E", 0.25]} />
      <primitive object={target} />
      <directionalLight position={sunPos} target={target} intensity={1.7 * (0.35 + 0.65 * (1 - low))} color={sunColor} {...shadowProps} />
    </>
  );
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

export function ExteriorScene({ design, camera, cameraNonce, quality, view, showRoles, onPick, instantCamera }: ExteriorSceneProps) {
  const high = quality === "high";
  const night = view.sky === "night";
  return (
    <Canvas
      shadows="soft"
      dpr={high ? [1, 2] : [1, 1.25]}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: night ? 1.1 : 0.72 }}
      camera={{ position: [0, 10, 30], fov: 50 }}
      onPointerMissed={() => onPick?.(null)}
    >
      <Lighting view={view} quality={quality} />
      <Building design={design} showRoles={showRoles} onPick={view.mode === "orbit" ? onPick : undefined} quality={quality} night={night} />
      {view.mode === "orbit" ? (
        <>
          <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI * 0.49} minDistance={2} maxDistance={160} autoRotate={view.autoRotate} autoRotateSpeed={0.7} />
          <CameraRig id={camera} nonce={cameraNonce} instant={instantCamera} />
          <CameraLimits />
        </>
      ) : (
        <Walk />
      )}
      <ReadyFlag />
      <Expose />
    </Canvas>
  );
}
