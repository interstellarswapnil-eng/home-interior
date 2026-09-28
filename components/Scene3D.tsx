import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  CEILING_M,
  contextAreas,
  furniture,
  lobbyContext,
  openingBand,
  openings,
  planBounds,
  roomById,
  rooms,
  stairContext,
  walls,
  type Opening,
  type RoomId,
} from "../plan/plan";
import { palette, roomFloorMaterial } from "../plan/materials";
import { hostWall, wallBoxes } from "../plan/geometry";
import { FurnitureMesh } from "./Furniture3D";
import { WalkControls } from "./WalkControls";
import { TourController } from "./TourController";
import { RecorderBridge } from "./VideoRecorder";
import type { ImmersiveMode } from "./immersiveStore";

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
/** Plan (x, y, height) → world */
const W = (x: number, y: number, h = 0): V3 => [x, h, -y];

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

// ---------------------------------------------------------------------------
function makeTileTexture(): THREE.CanvasTexture {
  const s = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, s, s);
  g.strokeStyle = "#cfc9bf";
  g.lineWidth = 2;
  g.strokeRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Floors() {
  const base = useMemo(makeTileTexture, []);
  return (
    <group>
      {rooms.map((r) => {
        const tile = r.id === "masterBath" || r.id === "guestBath" || r.id.includes("Balcony") ? 0.3 : 0.6;
        const tex = base.clone();
        tex.needsUpdate = true;
        tex.repeat.set(r.w / tile, r.h / tile);
        const color = palette[roomFloorMaterial[r.id] as keyof typeof palette];
        return (
          <mesh key={r.id} position={W(r.x + r.w / 2, r.y + r.h / 2, 0.001)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[r.w, r.h]} />
            <meshStandardMaterial color={color} map={r.id === "lift" ? null : tex} roughness={0.55} />
          </mesh>
        );
      })}
      {contextAreas.map((c) => (
        <mesh key={c.label} position={W(c.x + c.w / 2, c.y + c.h / 2, 0.0)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[c.w, c.h]} />
          <meshStandardMaterial color={c === lobbyContext ? "#D7D3CC" : "#C9C6C0"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Walls({ cap }: { cap: number }) {
  const boxes = useMemo(() => walls.flatMap(wallBoxes), []);
  return (
    <group>
      {boxes.map((b, i) => {
        const z1 = Math.min(b.z1, cap);
        if (z1 - b.z0 < 1e-3) return null;
        const color = b.wall.kind === "context" ? "#BDBAB4" : b.wall.kind === "shaft" ? palette.wallAccent : palette.wall;
        return (
          <mesh key={i} position={W(b.x + b.w / 2, b.y + b.h / 2, (b.z0 + z1) / 2)} castShadow receiveShadow>
            <boxGeometry args={[b.w, z1 - b.z0, b.h]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function OpeningMesh({ o, cap }: { o: Opening; cap: number }) {
  const wall = hostWall(o, walls);
  if (!wall) return null;
  const horiz = o.rotationDeg === 90 || o.rotationDeg === 270;
  const { sill, head } = openingBand(o);
  const thick = horiz ? wall.h : wall.w;
  const mid = horiz ? wall.y + wall.h / 2 : wall.x + wall.w / 2;
  const s0 = horiz ? o.x : o.y;
  // world transform: group centred on the opening, local x along the wall
  const cx = horiz ? s0 + o.w / 2 : mid;
  const cy = horiz ? mid : s0 + o.w / 2;
  const rotY = horiz ? 0 : Math.PI / 2;

  if (o.type === "window") {
    const h = Math.min(head, cap) - sill;
    if (h <= 0) return null;
    return (
      <group position={W(cx, cy, 0)} rotation={[0, rotY, 0]}>
        <mesh position={[0, sill + h / 2, 0]}>
          <boxGeometry args={[o.w, h, 0.02]} />
          <meshPhysicalMaterial color={palette.glass} transparent opacity={0.25} roughness={0.05} depthWrite={false} />
        </mesh>
        {/* slim black frame */}
        {[
          [o.w, 0.04, 0, sill + 0.02],
          [o.w, 0.04, 0, sill + h - 0.02],
          [0.04, h, -o.w / 2 + 0.02, sill + h / 2],
          [0.04, h, o.w / 2 - 0.02, sill + h / 2],
          [0.03, h, 0, sill + h / 2],
        ].map(([w, hh, x, y], i) => (
          <mesh key={i} position={[x, y, 0]}>
            <boxGeometry args={[w, hh, thick * 0.6]} />
            <meshStandardMaterial color={palette.metalBlack} metalness={0.4} roughness={0.5} />
          </mesh>
        ))}
      </group>
    );
  }

  if (o.type === "shutter") {
    const h = Math.min(head, cap);
    const isLift = o.id === "lift-door";
    const n = isLift ? 2 : 4;
    const pw = o.w / n;
    return (
      <group position={W(cx, cy, 0)} rotation={[0, rotY, 0]}>
        {Array.from({ length: n }, (_, i) => {
          const x = -o.w / 2 + pw * (i + 0.5);
          const hallSide = horiz ? 1 : -1; // hall is south of the storage front (−plan y → +world z)
          return (
            <group key={i} position={[x, 0, 0]}>
              <mesh position={[0, h / 2, 0]} castShadow>
                <boxGeometry args={[pw - 0.01, h, 0.025]} />
                <meshStandardMaterial color={isLift ? "#9EA3A8" : palette.laminate} metalness={isLift ? 0.6 : 0} roughness={isLift ? 0.35 : 0.85} />
              </mesh>
              {!isLift && (
                <mesh position={[(i % 2 ? -1 : 1) * (pw / 2 - 0.05), 1.1, hallSide * 0.02]}>
                  <boxGeometry args={[0.012, 0.6, 0.015]} />
                  <meshStandardMaterial color={palette.metalBlack} metalness={0.6} roughness={0.4} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    );
  }

  // Doors — leaves shown open 90° along their swing (matches 2D arcs); entry shown closed
  const swing = o.swing ?? { hinge: "start" as const, dir: 1 as const };
  const h = Math.min(head, cap);
  const glazed = o.type === "doubleDoor";
  const color = o.id === "entry" ? "#CDB896" : o.id === "kitchen-balcony" ? palette.laminate : glazed ? palette.metalBlack : palette.laminate;
  const leaves =
    o.type === "doubleDoor"
      ? [
          { at: -o.w / 2, len: o.w / 2 },
          { at: o.w / 2, len: o.w / 2 },
        ]
      : [{ at: swing.hinge === "start" ? -o.w / 2 : o.w / 2, len: o.w }];
  const face = (swing.dir * thick) / 2;
  // local +z of the group maps to world: horiz → −plan y ; vertical (rotY=90°) → +plan x... handle sign:
  const zSign = horiz ? -1 : 1;
  const closed = o.id === "entry";
  return (
    <group position={W(cx, cy, 0)} rotation={[0, rotY, 0]}>
      {leaves.map((l, i) => {
        const along = l.at < 0 ? 1 : -1; // leaf extends from hinge towards the other jamb when closed
        if (closed) {
          return (
            <mesh key={i} position={[0, h / 2, 0]} castShadow>
              <boxGeometry args={[o.w, h, 0.04]} />
              <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
          );
        }
        const z = zSign * (face + swing.dir * (l.len / 2));
        return (
          <group key={i}>
            <mesh position={[l.at + along * 0.02, h / 2, z]} castShadow>
              <boxGeometry args={[0.035, h, l.len]} />
              {glazed ? (
                <meshPhysicalMaterial color={palette.glass} transparent opacity={0.3} roughness={0.05} depthWrite={false} />
              ) : (
                <meshStandardMaterial color={color} roughness={0.7} />
              )}
            </mesh>
            {glazed && (
              <mesh position={[l.at + along * 0.02, h / 2, z]}>
                <boxGeometry args={[0.04, h, 0.04]} />
                <meshStandardMaterial color={palette.metalBlack} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Stair() {
  const s = stairContext;
  const landing = 1.0;
  const n = 10;
  const run = (s.w - landing) / n;
  const rise = CEILING_M / 2 / n;
  const half = s.h / 2;
  const steps: JSX.Element[] = [];
  for (let i = 0; i < n; i++) {
    // south flight rises westward to the landing; north flight rises eastward
    const xs = s.x + s.w - (i + 1) * run;
    steps.push(
      <mesh key={`a${i}`} position={W(xs + run / 2, s.y + half / 2, ((i + 1) * rise) / 2)} castShadow receiveShadow>
        <boxGeometry args={[run, (i + 1) * rise, half]} />
        <meshStandardMaterial color="#CFCBC3" roughness={0.9} />
      </mesh>,
    );
  }
  return (
    <group>
      {steps}
      <mesh position={W(s.x + landing / 2, s.y + s.h / 2, CEILING_M / 4)} receiveShadow>
        <boxGeometry args={[landing, CEILING_M / 2, s.h]} />
        <meshStandardMaterial color="#CFCBC3" roughness={0.9} />
      </mesh>
    </group>
  );
}

function CameraRig({ id }: { id: CameraId }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  const presets = useMemo(cameraPresets, []);
  useEffect(() => {
    const p = presets[id] ?? presets.overview;
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

function ReadyFlag() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 20) (window as unknown as { __sceneReady?: boolean }).__sceneReady = true;
  });
  return null;
}

function Lights() {
  const b = planBounds();
  const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const sb = roomById.kitchenBalcony;
  const lb = roomById.livingBalcony;
  const roomLights: RoomId[] = ["living", "kitchen", "master", "kids", "foyer", "masterBath", "guestBath", "storage"];
  return (
    <>
      <ambientLight intensity={0.35} color="#FFF6EA" />
      <hemisphereLight args={["#FFFFFF", "#D9D2C5", 0.75]} />
      {/* South sun (afternoon, from SW) — strongest, casts shadows */}
      <directionalLight
        position={W(c.x - 6, c.y - 14, 14)}
        intensity={2.2}
        color="#FFF1DC"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0005}
      >
        <object3D attach="target" position={W(c.x, c.y, 0)} />
      </directionalLight>
      {/* Cool north skylight through the living balcony */}
      <directionalLight position={W(c.x + 2, c.y + 14, 10)} intensity={0.7} color="#E8F0FF" />
      {/* Daylight spill at the balcony openings */}
      <pointLight position={W(sb.x + sb.w / 2, sb.y + sb.h + 0.8, 2.2)} intensity={6} distance={7} color="#FFE7C7" />
      <pointLight position={W(lb.x + lb.w / 2, lb.y - 0.9, 2.2)} intensity={5} distance={7} color="#EEF3FF" />
      {/* LED ceiling lights (false-ceiling budget line) */}
      {roomLights.map((id) => {
        const r = roomById[id];
        return <pointLight key={id} position={W(r.x + r.w / 2, r.y + r.h / 2, CEILING_M - 0.3)} intensity={r.w * r.h > 5 ? 4 : 1.6} distance={6} color="#FFF4E5" />;
      })}
    </>
  );
}

/** Ceilings for eye-level modes; hidden whenever the camera is above them (tour drone intro). */
function Ceilings() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.y < CEILING_M - 0.01;
  });
  return (
    <group ref={ref}>
      {rooms
        .filter((r) => r.id !== "lift")
        .map((r) => (
          <mesh key={r.id} position={W(r.x + r.w / 2, r.y + r.h / 2, CEILING_M)} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[r.w + 0.2, r.h + 0.2]} />
            <meshStandardMaterial color="#FBFAF7" roughness={0.95} />
          </mesh>
        ))}
    </group>
  );
}

export type Scene3DProps = {
  camera: CameraId;
  mode?: ImmersiveMode;
  wallMode: "auto" | "full" | "cut";
  highlight?: Set<string>;
  showFurniture?: boolean;
};

export function Scene3D({ camera, mode = "orbit", wallMode, highlight, showFurniture = true }: Scene3DProps) {
  const immersiveMode = mode !== "orbit";
  const cut = !immersiveMode && (wallMode === "cut" || (wallMode === "auto" && camera === "overview"));
  const cap = cut ? 1.2 : CEILING_M;
  const b = planBounds();
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 10, 10], fov: 50 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <color attach="background" args={["#EEF1F3"]} />
      <Lights />
      <group>
        <mesh position={W(b.x + b.w / 2, b.y + b.h / 2, -0.06)} receiveShadow>
          <boxGeometry args={[b.w, 0.1, b.h]} />
          <meshStandardMaterial color="#D8D5CF" />
        </mesh>
        <Floors />
        <Walls cap={cap} />
        <Stair />
        {immersiveMode && <Ceilings />}
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
      <RecorderBridge />
      <ReadyFlag />
    </Canvas>
  );
}
