import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CEILING_M, furniture, openings, planBounds, roomById } from "../plan/plan";
import { FurnitureMesh } from "./Furniture3D";
import { Ceilings, Floors, OpeningMesh, RoofOccluder, Skirting, Stair, W, Walls } from "./Architecture3D";
import { EXPOSURE, QualityContext, setGlassTransmission, texturesIdle, type Quality } from "./materials3d";
import { WalkControls } from "./WalkControls";
import { TourController } from "./TourController";
import { RecorderBridge } from "./VideoRecorder";
import type { ImmersiveMode } from "./immersiveStore";

RectAreaLightUniformsLib.init();

export type CameraId = "overview" | "living" | "kitchen" | "master" | "kids" | "foyer" | "southBalcony";

export const cameraLabels: Record<CameraId, string> = {
  overview: "Overview",
  living: "Living",
  kitchen: "Kitchen",
  master: "Master",
  kids: "Kids",
  foyer: "Foyer / hall",
  southBalcony: "South balcony",
};

type V3 = [number, number, number];

function cameraPresets(): Record<CameraId, { pos: V3; target: V3; fov: number }> {
  const b = planBounds();
  const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const L = roomById.living;
  const K = roomById.kitchen;
  const M = roomById.master;
  const Kd = roomById.kids;
  const F = roomById.foyer;
  const SB = roomById.kitchenBalcony;
  return {
    overview: { pos: W(c.x + 5.5, c.y - 11, 13), target: W(c.x, c.y, 0), fov: 45 },
    living: { pos: W(L.x + 0.35, L.y + 0.25, 1.6), target: W(L.x + L.w - 1.2, L.y + L.h - 0.8, 0.9), fov: 68 },
    kitchen: { pos: W(L.x + 0.9, L.y + 1.4, 1.65), target: W(K.x + K.w - 1.0, K.y + 0.5, 0.85), fov: 66 },
    master: { pos: W(M.x + M.w - 0.2, M.y + 0.2, 2.1), target: W(M.x + 1.0, M.y + M.h - 0.9, 0.7), fov: 72 },
    kids: { pos: W(Kd.x + Kd.w - 0.9, Kd.y + 0.3, 1.6), target: W(Kd.x + 0.4, Kd.y + Kd.h - 0.6, 0.85), fov: 70 },
    foyer: { pos: W(F.x + F.w + 1.6, F.y + F.h / 2 + 0.2, 1.65), target: W(F.x, F.y + F.h / 2, 1.1), fov: 64 },
    southBalcony: { pos: W(SB.x + SB.w / 2 - 1.5, SB.y - 5.5, 3.2), target: W(SB.x + SB.w / 2, SB.y + 1.0, 1.5), fov: 50 },
  };
}

function CameraRig({ id }: { id: CameraId }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  const presets = useMemo(cameraPresets, []);
  useEffect(() => {
    // debug / screenshot override: ?cp=x,y,h&ct=x,y,h (plan metres; h = height)
    const q = new URLSearchParams(location.search);
    const parse = (k: string) => q.get(k)?.split(",").map(Number) as [number, number, number] | undefined;
    const cp = parse("cp");
    const ct = parse("ct");
    const p = cp && ct ? { pos: W(...cp), target: W(...ct), fov: Number(q.get("fov") ?? 60) } : presets[id] ?? presets.overview;
    camera.position.set(...p.pos);
    camera.fov = p.fov;
    camera.near = 0.05;
    camera.far = 200;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(...p.target);
      controls.update();
    } else {
      camera.lookAt(...p.target);
    }
  }, [id, camera, controls, presets]);
  return null;
}

/** Sets window.__sceneReady once textures have loaded and a few frames have rendered. */
function ReadyFlag() {
  const frames = useRef(0);
  useFrame(() => {
    if (!texturesIdle()) return;
    frames.current++;
    if (frames.current === 20) (window as unknown as { __sceneReady?: boolean }).__sceneReady = true;
  });
  return null;
}

/** Real glass transmission only while the camera is in / next to the master ensuite (High quality). */
function GlassLOD() {
  const bath = roomById.masterBath;
  const near = useRef(false);
  useFrame(({ camera }) => {
    const x = camera.position.x;
    const y = -camera.position.z;
    // inside the bath, or standing in front of its door (door is at the bath's west end)
    const inBath = x > bath.x && x < bath.x + bath.w && y > bath.y && y < bath.y + bath.h;
    const atDoor = x > bath.x - 0.2 && x < bath.x + 1.6 && y > bath.y - 1.1 && y <= bath.y;
    const inside = (inBath || atDoor) && camera.position.y < CEILING_M;
    if (inside !== near.current) {
      near.current = inside;
      setGlassTransmission(inside);
    }
  });
  return null;
}

/** Soft window light: a RectAreaLight filling an opening, facing into the room. */
function WindowLight({ id, color, intensity, into }: { id: string; color: string; intensity: number; into: 1 | -1 }) {
  const o = openings.find((x) => x.id === id)!;
  const horiz = o.rotationDeg === 90;
  const sill = o.type === "window" ? (o.sill ?? 0.9) : 0.05;
  const h = 2.1 - sill;
  const ref = useRef<THREE.RectAreaLight>(null);
  // position just inside the opening; `into` = +1 means toward +plan axis
  const pos: V3 = horiz ? W(o.x + o.w / 2, o.y + into * 0.12, sill + h / 2) : W(o.x + into * 0.12, o.y + o.w / 2, sill + h / 2);
  const target: V3 = horiz ? W(o.x + o.w / 2, o.y + into * 3, sill + h / 2 - 0.4) : W(o.x + into * 3, o.y + o.w / 2, sill + h / 2 - 0.4);
  useEffect(() => ref.current?.lookAt(...target), [target]);
  return <rectAreaLight ref={ref} position={pos} width={o.w} height={h} color={color} intensity={intensity} />;
}

function Lights({ quality }: { quality: Quality }) {
  const high = quality === "high";
  const b = planBounds();
  const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const sb = roomById.kitchenBalcony;
  const spot = useRef<THREE.SpotLight>(null);
  const spotTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...W(sb.x + sb.w * 0.45, sb.y + sb.h + 0.4, 0));
    return o;
  }, [sb]);
  useEffect(() => {
    if (spot.current) spot.current.target = spotTarget;
  }, [spotTarget]);
  return (
    <>
      <ambientLight intensity={0.12} color="#FFFFFF" />
      {/* Sun from the east (living / kitchen windows side), soft shadows */}
      <directionalLight
        position={W(c.x + 14, c.y - 3, 9)}
        intensity={2.6}
        color="#FFF4E6"
        castShadow={high}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
      >
        <object3D attach="target" position={W(c.x, c.y, 0)} />
      </directionalLight>
      {/* Afternoon heat on the south kitchen balcony — low, warm, hitting the shade */}
      <spotLight
        ref={spot}
        // low afternoon sun from the south: aimed between the parapet top (1.05 m) and the shade's
        // bottom edge (1.55 m) so it lands as a warm wash on the balcony floor / door threshold.
        // No shadow map (it's an outdoor wash); the sun + parapet still cast shadows elsewhere.
        position={W(sb.x + sb.w * 0.45, sb.y - 1.6, 2.75)}
        angle={0.75}
        penumbra={0.5}
        intensity={40}
        distance={8}
        decay={1.6}
        color="#FFC98A"
      />
      <primitive object={spotTarget} />
      {/* North living balcony: cool, bright daylight through the double doors */}
      <WindowLight id="living-balcony" color="#EEF3FF" intensity={9} into={-1} />
      {/* South kitchen balcony door: hot, warm bounce */}
      <WindowLight id="kitchen-balcony" color="#FFD7A3" intensity={7} into={1} />
      {/* Other windows: soft sky light */}
      <WindowLight id="win-living-e" color="#FFF9F2" intensity={4} into={-1} />
      <WindowLight id="win-kitchen-e" color="#FFF9F2" intensity={4} into={-1} />
      <WindowLight id="win-master-w" color="#F1F4FA" intensity={3.5} into={1} />
      <WindowLight id="win-kids-w" color="#F1F4FA" intensity={3.5} into={1} />
      {/* Performance: one cheap warm hemisphere fill instead of per-room point lights (no shadows / AO to lean on) */}
      {!high && <hemisphereLight args={["#FFF4E6", "#D9D2C5", 0.55]} />}
    </>
  );
}

export type Scene3DProps = {
  camera: CameraId;
  mode?: ImmersiveMode;
  wallMode: "auto" | "full" | "cut";
  quality?: Quality;
  highlight?: Set<string>;
  showFurniture?: boolean;
};

export function Scene3D({ camera, mode = "orbit", wallMode, quality = "high", highlight, showFurniture = true }: Scene3DProps) {
  const immersiveMode = mode !== "orbit";
  const cut = !immersiveMode && (wallMode === "cut" || (wallMode === "auto" && camera === "overview"));
  const cap = cut ? 1.2 : CEILING_M;
  const high = quality === "high";
  const b = planBounds();
  return (
    <Canvas
      key={quality}
      shadows={high ? "soft" : false}
      dpr={high ? [1, 2] : [1, 1.25]}
      camera={{ position: [0, 10, 10], fov: 50 }}
      gl={{ antialias: !high, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: EXPOSURE }}
      onCreated={({ gl }) => {
        // the shower screen's transmission pass renders at half resolution (it's seen through frosted-ish glass anyway)
        (gl as THREE.WebGLRenderer & { transmissionResolutionScale: number }).transmissionResolutionScale = 0.5;
      }}
    >
      <QualityContext.Provider value={quality}>
        <color attach="background" args={["#E9EEF2"]} />
        <Suspense fallback={null}>
          <Environment files={`${import.meta.env.BASE_URL}hdri/small_empty_room_1_1k.hdr`} background={false} environmentIntensity={0.5} />
        </Suspense>
        <Lights quality={quality} />
        <group>
          <mesh position={W(b.x + b.w / 2, b.y + b.h / 2, -0.06)} receiveShadow>
            <boxGeometry args={[b.w, 0.1, b.h]} />
            <meshStandardMaterial color="#D8D5CF" />
          </mesh>
          <Floors />
          <Walls cap={cap} />
          <Skirting />
          <Stair />
          {immersiveMode && <Ceilings />}
          {!cut && <RoofOccluder />}
          {openings.map((o) => (
            <OpeningMesh key={o.id} o={o} cap={cap} />
          ))}
          {showFurniture &&
            furniture
              .filter((f) => !(cut && (f.kind === "chimney" || f.kind === "wallUnit" || f.kind === "curtain")))
              .map((f) => <FurnitureMesh key={f.id} f={f} highlighted={highlight?.has(f.id) ?? false} />)}
        </group>
        {mode === "orbit" && (
          <>
            <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI * 0.495} />
            <CameraRig id={camera} />
          </>
        )}
        {mode === "walk" && <WalkControls />}
        {mode === "tour" && <TourController />}
        {high && (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <N8AO aoRadius={0.45} intensity={1.6} distanceFalloff={0.6} quality="medium" halfRes />
            <SMAA />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
        {high && <GlassLOD />}
        <RecorderBridge />
        <ReadyFlag />
      </QualityContext.Provider>
    </Canvas>
  );
}
