import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  CEILING_M,
  contextAreas,
  lobbyContext,
  openingBand,
  planBounds,
  roomById,
  rooms,
  stairContext,
  walls,
  type Opening,
} from "../plan/plan";
import { roomFloorMaterial, type MaterialId } from "../plan/materials";
import { hostWall, wallBoxes } from "../plan/geometry";
import { SKIRTING_H, ceilingTrays, downlights, skirtingRuns } from "../plan/details";
import { Mat } from "./materials3d";

type V3 = [number, number, number];
/** Plan (x, y, height) → world */
export const W = (x: number, y: number, h = 0): V3 => [x, h, -y];

/** Axis-aligned plan box → mesh (plan x/y footprint, z0..z1 height). */
function PBox({ x, y, w, h, z0, z1, m, shadow = true, u, v }: { x: number; y: number; w: number; h: number; z0: number; z1: number; m: MaterialId; shadow?: boolean; u?: number; v?: number }) {
  return (
    <mesh position={W(x + w / 2, y + h / 2, (z0 + z1) / 2)} castShadow={shadow} receiveShadow>
      <boxGeometry args={[w, z1 - z0, h]} />
      <Mat id={m} u={u ?? Math.max(w, h)} v={v ?? z1 - z0} />
    </mesh>
  );
}

/** Plane whose UVs are in metres (u = x, v = y), anchored to the room's SW corner. */
function meterPlane(w: number, h: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  return g;
}

// ---------------------------------------------------------------------------
export function Floors() {
  return (
    <group>
      {rooms.map((r) => {
        const key = roomFloorMaterial[r.id];
        const m: MaterialId = r.id === "lift" ? "liftSteel" : key === "floorWet" ? "floorWet" : "floorDry";
        return (
          <mesh key={r.id} geometry={meterPlane(r.w, r.h)} position={W(r.x + r.w / 2, r.y + r.h / 2, 0.001)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            {/* UVs are in metres, so the texture repeat is uniform and the 45° tile turn stays square */}
            <Mat id={m} u={1} v={1} />
          </mesh>
        );
      })}
      {contextAreas.map((c) => (
        <mesh key={c.label} position={W(c.x + c.w / 2, c.y + c.h / 2, 0.0)} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[c.w, c.h]} />
          <Mat id={c === lobbyContext ? "context" : "context"} u={c.w} v={c.h} />
        </mesh>
      ))}
    </group>
  );
}

export function Walls({ cap }: { cap: number }) {
  const boxes = useMemo(() => walls.flatMap(wallBoxes), []);
  return (
    <group>
      {boxes.map((b, i) => {
        const z1 = Math.min(b.z1, cap);
        if (z1 - b.z0 < 1e-3) return null;
        const m: MaterialId = b.wall.kind === "context" ? "context" : b.wall.kind === "shaft" ? "wallShaft" : b.wall.kind === "parapet" ? "parapet" : "wall";
        return <PBox key={i} x={b.x} y={b.y} w={b.w} h={b.h} z0={b.z0} z1={z1} m={m} />;
      })}
      {/* black MS top rail on balcony parapets */}
      {walls
        .filter((w) => w.kind === "parapet")
        .map((w) => (
          <PBox key={`rail-${w.id}`} x={w.x - 0.005} y={w.y - 0.005} w={w.w + 0.01} h={w.h + 0.01} z0={(w.height ?? 1) - 0.001} z1={(w.height ?? 1) + 0.04} m="metalBlack" />
        ))}
    </group>
  );
}

export function Skirting() {
  const runs = useMemo(skirtingRuns, []);
  return (
    <group>
      {runs.map((r, i) => (
        <PBox key={i} x={r.x} y={r.y} w={r.w} h={r.h} z0={0} z1={SKIRTING_H} m="skirting" shadow={false} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
/** Doors (frames, architraves, solid leaves with lever handles), windows (frames, glass, granite sills), shutters. */
export function OpeningMesh({ o, cap }: { o: Opening; cap: number }) {
  const wall = hostWall(o, walls);
  if (!wall) return null;
  const horiz = o.rotationDeg === 90 || o.rotationDeg === 270;
  const { sill, head } = openingBand(o);
  const thick = horiz ? wall.h : wall.w;
  const mid = horiz ? wall.y + wall.h / 2 : wall.x + wall.w / 2;
  const s0 = horiz ? o.x : o.y;
  const cx = horiz ? s0 + o.w / 2 : mid;
  const cy = horiz ? mid : s0 + o.w / 2;
  const rotY = horiz ? 0 : Math.PI / 2;
  const capH = (z: number) => Math.min(z, cap);

  // local frame: x along the wall, z across (thickness), y up
  if (o.type === "window") {
    const h = capH(head) - sill;
    if (h <= 0) return null;
    const fr = 0.045;
    return (
      <group position={W(cx, cy, 0)} rotation={[0, rotY, 0]}>
        <mesh position={[0, sill + h / 2, 0]}>
          <boxGeometry args={[o.w - 0.04, h - 0.04, 0.012]} />
          <Mat id="windowGlass" />
        </mesh>
        {(
          [
            [o.w, fr, 0, sill + fr / 2],
            [o.w, fr, 0, sill + h - fr / 2],
            [fr, h, -o.w / 2 + fr / 2, sill + h / 2],
            [fr, h, o.w / 2 - fr / 2, sill + h / 2],
            [0.035, h, 0, sill + h / 2],
          ] as const
        ).map(([w, hh, x, y], i) => (
          <mesh key={i} position={[x, y, 0]} castShadow>
            <boxGeometry args={[w, hh, thick * 0.55]} />
            <Mat id="metalBlack" />
          </mesh>
        ))}
        {/* 20 mm granite sill, projecting on both faces */}
        {sill > 0.5 && (
          <mesh position={[0, sill - 0.01, 0]} castShadow receiveShadow>
            <boxGeometry args={[o.w + 0.1, 0.02, thick + 0.08]} />
            <Mat id="granite" u={o.w} v={thick} />
          </mesh>
        )}
      </group>
    );
  }

  if (o.type === "shutter") {
    const h = capH(head);
    const isLift = o.id === "lift-door";
    const n = isLift ? 2 : 4;
    const pw = o.w / n;
    const face = horiz ? 1 : -1; // hall side of the storage front (−plan y → +world z)
    return (
      <group position={W(cx, cy, 0)} rotation={[0, rotY, 0]}>
        {Array.from({ length: n }, (_, i) => {
          const x = -o.w / 2 + pw * (i + 0.5);
          return (
            <group key={i} position={[x, 0, 0]}>
              <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[pw - 0.004, h, 0.02]} />
                <Mat id={isLift ? "liftSteel" : "laminateWhite"} u={pw} v={h} />
              </mesh>
              {!isLift &&
                // louvre grooves on the storage shutters (ventilated linen / broom store)
                Array.from({ length: 14 }, (_, k) => (
                  <mesh key={k} position={[0, 0.25 + k * 0.13, face * 0.0105]}>
                    <boxGeometry args={[pw - 0.08, 0.006, 0.002]} />
                    <Mat id="skirting" />
                  </mesh>
                ))}
              {!isLift && (
                <mesh position={[(i % 2 ? -1 : 1) * (pw / 2 - 0.04), 1.1, face * 0.02]}>
                  <boxGeometry args={[0.012, 0.45, 0.018]} />
                  <Mat id="metalBlack" />
                </mesh>
              )}
            </group>
          );
        })}
        {!isLift && (
          <mesh position={[0, h + (Math.min(CEILING_M, cap) - h) / 2, 0]}>
            <boxGeometry args={[o.w + 0.1, Math.max(0.001, Math.min(CEILING_M, cap) - h), thick]} />
            <Mat id="laminateWhite" />
          </mesh>
        )}
      </group>
    );
  }

  // ---- doors
  const swing = o.swing ?? { hinge: "start" as const, dir: 1 as const };
  const h = capH(head);
  const glazed = o.type === "doubleDoor";
  const zSign = horiz ? -1 : 1; // local +z → plan across direction
  const face = (swing.dir * thick) / 2;
  const closed = o.id === "entry";
  const leaves =
    o.type === "doubleDoor"
      ? [
          { at: -o.w / 2, len: o.w / 2 },
          { at: o.w / 2, len: o.w / 2 },
        ]
      : [{ at: swing.hinge === "start" ? -o.w / 2 : o.w / 2, len: o.w }];
  const frameW = 0.04;
  const arch = 0.065;
  const leafT = 0.036;
  return (
    <group position={W(cx, cy, 0)} rotation={[0, rotY, 0]}>
      {/* frame (jambs + head) and architraves on both faces */}
      {h > 0.3 && (
        <>
          {[-1, 1].map((sx) => (
            <mesh key={`j${sx}`} position={[sx * (o.w / 2 - frameW / 2), h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[frameW, h, thick + 0.004]} />
              <Mat id={glazed ? "metalBlack" : "doorFrame"} u={frameW} v={h} />
            </mesh>
          ))}
          {head <= cap && (
            <mesh position={[0, h - frameW / 2, 0]}>
              <boxGeometry args={[o.w, frameW, thick + 0.004]} />
              <Mat id={glazed ? "metalBlack" : "doorFrame"} u={o.w} v={frameW} />
            </mesh>
          )}
          {!glazed &&
            [-1, 1].flatMap((side) => [
              ...[-1, 1].map((sx) => (
                <mesh key={`a${side}${sx}`} position={[sx * (o.w / 2 + arch / 2 - 0.01), h / 2, side * (thick / 2 + 0.006)]} castShadow>
                  <boxGeometry args={[arch, h + (head <= cap ? arch : 0), 0.012]} />
                  <Mat id="doorFrame" u={arch} v={h} />
                </mesh>
              )),
              head <= cap ? (
                <mesh key={`at${side}`} position={[0, h + arch / 2 - 0.01, side * (thick / 2 + 0.006)]}>
                  <boxGeometry args={[o.w + 2 * arch - 0.02, arch, 0.012]} />
                  <Mat id="doorFrame" u={o.w} v={arch} />
                </mesh>
              ) : null,
            ])}
        </>
      )}
      {leaves.map((l, i) => {
        const along = l.at < 0 ? 1 : -1;
        const leafLen = l.len - frameW;
        if (closed) {
          return (
            <group key={i}>
              <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[o.w - 2 * frameW, h - frameW, 0.045]} />
                <Mat id="laminateOak" u={o.w} v={h} />
              </mesh>
              <mesh position={[o.w / 2 - 0.15, 1.05, 0.04]}>
                <boxGeometry args={[0.02, 0.35, 0.02]} />
                <Mat id="metalBlack" />
              </mesh>
            </group>
          );
        }
        // open 90° along the swing (matches the 2D arcs)
        const z = zSign * (face + swing.dir * (leafLen / 2 + 0.01));
        const tipZ = zSign * (face + swing.dir * (leafLen - 0.08));
        const x = l.at + along * (frameW + leafT / 2);
        return (
          <group key={i}>
            <mesh position={[x, (h - frameW) / 2, z]} castShadow receiveShadow>
              <boxGeometry args={[glazed ? 0.03 : leafT, h - frameW - 0.01, leafLen]} />
              <Mat id={glazed ? "windowGlass" : "doorLeaf"} u={leafLen} v={h} />
            </mesh>
            {glazed ? (
              [0.03, h - frameW - 0.04].map((y) => (
                <mesh key={y} position={[x, y, z]}>
                  <boxGeometry args={[0.045, 0.06, leafLen]} />
                  <Mat id="metalBlack" />
                </mesh>
              ))
            ) : (
              // lever handles on both faces near the free edge
              [-1, 1].map((sd) => (
                <group key={sd} position={[x + sd * (leafT / 2 + 0.03), 1.0, tipZ]}>
                  <mesh>
                    <boxGeometry args={[0.02, 0.06, 0.02]} />
                    <Mat id="metalBlack" />
                  </mesh>
                  <mesh position={[0, 0, -zSign * swing.dir * 0.06]}>
                    <boxGeometry args={[0.018, 0.018, 0.13]} />
                    <Mat id="metalBlack" />
                  </mesh>
                </group>
              ))
            )}
            {glazed && (
              [-1, 1].map((sx) => (
                <mesh key={sx} position={[x, (h - frameW) / 2, z + sx * (leafLen / 2 - 0.03)]}>
                  <boxGeometry args={[0.045, h - frameW, 0.06]} />
                  <Mat id="metalBlack" />
                </mesh>
              ))
            )}
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
export function Stair() {
  const s = stairContext;
  const landing = 1.0;
  const n = 10;
  const run = (s.w - landing) / n;
  const rise = CEILING_M / 2 / n;
  const half = s.h / 2;
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const xs = s.x + s.w - (i + 1) * run;
        return <PBox key={i} x={xs} y={s.y} w={run} h={half} z0={0} z1={(i + 1) * rise} m="context" u={run} v={half} />;
      })}
      <PBox x={s.x} y={s.y} w={landing} h={s.h} z0={0} z1={CEILING_M / 2} m="context" />
    </group>
  );
}

// ---------------------------------------------------------------------------
/** Ceilings + false-ceiling trays with LED cove + downlights; hidden when the camera is above them. */
export function Ceilings() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.y < CEILING_M - 0.01;
  });
  const lights = useMemo(downlights, []);
  return (
    <group ref={ref}>
      {rooms
        .filter((r) => r.id !== "lift")
        .map((r) => (
          <mesh key={r.id} position={W(r.x + r.w / 2, r.y + r.h / 2, CEILING_M)} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[r.w + 0.2, r.h + 0.2]} />
            <Mat id="ceiling" />
          </mesh>
        ))}
      {ceilingTrays.map((t) => {
        const r = roomById[t.room];
        const z0 = CEILING_M - t.drop;
        const b = t.band;
        const band = [
          { x: r.x, y: r.y, w: r.w, h: b },
          { x: r.x, y: r.y + r.h - b, w: r.w, h: b },
          { x: r.x, y: r.y + b, w: b, h: r.h - 2 * b },
          { x: r.x + r.w - b, y: r.y + b, w: b, h: r.h - 2 * b },
        ];
        // cove LED strip on top of the inner lip, facing up (glows onto the raised centre)
        const cove = [
          { x: r.x + b - 0.02, y: r.y + b - 0.02, w: r.w - 2 * b + 0.04, h: 0.02 },
          { x: r.x + b - 0.02, y: r.y + r.h - b, w: r.w - 2 * b + 0.04, h: 0.02 },
          { x: r.x + b - 0.02, y: r.y + b, w: 0.02, h: r.h - 2 * b },
          { x: r.x + r.w - b, y: r.y + b, w: 0.02, h: r.h - 2 * b },
        ];
        return (
          <group key={t.room}>
            {band.map((p, i) => (
              <PBox key={i} {...p} z0={z0} z1={CEILING_M} m="ceiling" shadow={false} />
            ))}
            {cove.map((p, i) => (
              <PBox key={`c${i}`} {...p} z0={z0 + 0.06} z1={z0 + 0.075} m="ledWarm" shadow={false} />
            ))}
          </group>
        );
      })}
      {lights.map((d, i) => (
        <group key={i} position={W(d.x, d.y, d.h - 0.004)}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.055, 24]} />
            <Mat id="ledWarm" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <ringGeometry args={[0.055, 0.068, 24]} />
            <Mat id="brushedNickel" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Invisible slab that only casts shadows, so sun enters through windows/doors (full-height walls only). */
export function RoofOccluder() {
  const b = planBounds();
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), []);
  return (
    <mesh position={W(b.x + b.w / 2, b.y + b.h / 2, CEILING_M + 0.02)} castShadow material={mat}>
      <boxGeometry args={[b.w + 0.6, 0.04, b.h + 0.6]} />
    </mesh>
  );
}
