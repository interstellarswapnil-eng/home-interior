import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, OrbitControls, Sky } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { buildElements } from "../model/elements";
import { resolveElements, resolveRoles, type DesignState } from "../model/resolve";
import { buildShell } from "../model/shell";
import { CENTER } from "../model/building";
import type { LabelPart, Part } from "../model/types";
import { CAMERA_PRESETS, type CameraId } from "./cameras";
import { buildRoleMeshes, partAtTriangle, toWorld, type RoleMesh } from "./geometry";
import { applyStyle, castsShadow, makeRoleMaterial, roleDebugColor } from "./materials";

export type Quality = "normal" | "high";

export type ExteriorSceneProps = {
  design: DesignState;
  camera: CameraId;
  /** bump to re-apply the same camera preset */
  cameraNonce?: number;
  quality: Quality;
  showRoles: boolean;
  onPick?: (part: Part | null) => void;
};

const shell = buildShell();

/** Sun from the south-west, mid-afternoon (Phase 4 adds the real sun path for Ahilyanagar). */
const SUN_DIR = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();

function Building({ design, showRoles, onPick }: Pick<ExteriorSceneProps, "design" | "showRoles" | "onPick">) {
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
    applyStyle(mat, m.role, roles[m.role], showRoles ? roleDebugColor(m.role) : undefined);
    return mat;
  };

  const click = (m: RoleMesh) => (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return; // it was a drag (orbit), not a click
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
        <NameSign key={l.id} part={l} onPick={onPick} />
      ))}
    </group>
  );
}

function NameSign({ part, onPick }: { part: LabelPart; onPick?: (p: Part | null) => void }) {
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
      <meshStandardMaterial map={tex} transparent roughness={0.35} metalness={0.6} />
    </mesh>
  );
}

function SunAndSky({ quality }: { quality: Quality }) {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...toWorld(CENTER.x, CENTER.y, 0));
    return o;
  }, []);
  const sunPos = SUN_DIR.clone().multiplyScalar(60).add(target.position);
  const size = quality === "high" ? 4096 : 2048;
  return (
    <>
      <Sky sunPosition={SUN_DIR.toArray()} turbidity={6} rayleigh={1.2} mieCoefficient={0.004} mieDirectionalG={0.8} distance={4500} />
      <Environment frames={1} resolution={256} environmentIntensity={0.75}>
        <Sky sunPosition={SUN_DIR.toArray()} turbidity={6} rayleigh={1.2} mieCoefficient={0.004} mieDirectionalG={0.8} distance={4500} />
      </Environment>
      <hemisphereLight args={["#DDE8F5", "#B8A88E", 0.25]} />
      <primitive object={target} />
      <directionalLight
        position={sunPos}
        target={target}
        intensity={2.1}
        color="#FFEFD9"
        castShadow
        shadow-mapSize={[size, size]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={20}
        shadow-camera-far={110}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />
    </>
  );
}

function CameraRig({ id, nonce }: { id: CameraId; nonce?: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const parse = (k: string) => q.get(k)?.split(",").map(Number) as [number, number, number] | undefined;
    const cp = parse("cp");
    const ct = parse("ct");
    const p = cp && ct ? { pos: cp, target: ct, fov: Number(q.get("fov") ?? 50) } : CAMERA_PRESETS[id];
    camera.position.set(...toWorld(...p.pos));
    camera.fov = p.fov;
    camera.near = 0.1;
    camera.far = 600;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(...toWorld(...p.target));
      controls.update();
    } else camera.lookAt(...toWorld(...p.target));
  }, [id, nonce, camera, controls]);
  return null;
}

/** Keeps the camera above the ground and the orbit target inside a sensible box. */
function CameraLimits() {
  const { camera, controls } = useThree() as unknown as { camera: THREE.Camera; controls: OrbitControlsImpl | null };
  useFrame(() => {
    if (camera.position.y < 0.6) camera.position.y = 0.6;
    if (controls && controls.target.y < 0) controls.target.y = 0;
  });
  return null;
}

/** window.__extReady once a few frames have rendered (used by the screenshot script). */
function ReadyFlag() {
  const n = useRef(0);
  useFrame(() => {
    if (++n.current === 30) (window as unknown as { __extReady?: boolean }).__extReady = true;
  });
  return null;
}

export function ExteriorScene({ design, camera, cameraNonce, quality, showRoles, onPick }: ExteriorSceneProps) {
  const high = quality === "high";
  return (
    <Canvas
      shadows="soft"
      dpr={high ? [1, 2] : [1, 1.25]}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.78 }}
      camera={{ position: [0, 10, 30], fov: 50 }}
      onPointerMissed={() => onPick?.(null)}
    >
      <SunAndSky quality={quality} />
      <Building design={design} showRoles={showRoles} onPick={onPick} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI * 0.49} minDistance={2} maxDistance={110} />
      <CameraRig id={camera} nonce={cameraNonce} />
      <CameraLimits />
      <ReadyFlag />
    </Canvas>
  );
}
