import { Suspense, useContext, useMemo, type ReactNode } from "react";
import { RoundedBox, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CEILING_M, type Furniture } from "../plan/plan";
import type { MaterialId } from "../plan/materials";
import { HighlightContext, Mat, QualityContext, getMaterial } from "./materials3d";

/**
 * Detailed furniture, built to the plan.ts footprints. Each piece is modelled in a local frame:
 *   x = across the front (length L), z = depth D with the FRONT at +z, y = up.
 * The group is rotated so the front faces `f.faces`. Plan (x, y) → world (x, -y).
 * Materials come from the PBR library (plan/materials.ts → components/materials3d.tsx).
 */

type V3 = [number, number, number];

/** Box with a library material; u/v default to the box's top-face size for texture scale. */
function B({ s, p, m, r, u, v, shadow = true }: { s: V3; p: V3; m: MaterialId; r?: V3; u?: number; v?: number; shadow?: boolean }) {
  return (
    <mesh position={p} rotation={r} castShadow={shadow} receiveShadow>
      <boxGeometry args={s} />
      <Mat id={m} u={u ?? s[0]} v={v ?? Math.max(s[1], s[2])} />
    </mesh>
  );
}

/** Rounded box (soft furniture / rounded corners). */
function RB({ s, p, m, rad, r, u, v }: { s: V3; p: V3; m: MaterialId; rad: number; r?: V3; u?: number; v?: number }) {
  return (
    <RoundedBox args={s} radius={Math.min(rad, Math.min(...s) / 2 - 1e-4)} smoothness={4} position={p} rotation={r} castShadow receiveShadow>
      <Mat id={m} u={u ?? s[0]} v={v ?? Math.max(s[1], s[2])} />
    </RoundedBox>
  );
}

function Cyl({ rt, rb, h, p, m, r, seg = 20, shadow = true }: { rt: number; rb: number; h: number; p: V3; m: MaterialId; r?: V3; seg?: number; shadow?: boolean }) {
  return (
    <mesh position={p} rotation={r} castShadow={shadow} receiveShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
      <Mat id={m} u={rt * 6} v={h} />
    </mesh>
  );
}

/** Thin black profile handle. */
function Handle({ x, y, z, len, vertical = false }: { x: number; y: number; z: number; len: number; vertical?: boolean }) {
  return <B s={vertical ? [0.012, len, 0.02] : [len, 0.012, 0.02]} p={[x, y, z]} m="metalBlack" shadow={false} />;
}

/** Tapered oak / black legs at the four corners. */
type LegsProps = { L: number; D: number; h: number; inset?: number; rt?: number; rb?: number; m?: MaterialId; splay?: number };
function Legs({ L, D, h, inset = 0.05, rt = 0.02, rb = 0.012, m = "laminateOak", splay = 0 }: LegsProps) {
  return (
    <>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Cyl key={`${sx}${sz}`} rt={rt} rb={rb} h={h} p={[sx * (L / 2 - inset), h / 2, sz * (D / 2 - inset)]} r={[sz * splay, 0, -sx * splay]} m={m} seg={12} />
        )),
      )}
    </>
  );
}

/** Row of cabinet shutters with 3 mm gaps and profile handles. */
type ShuttersProps = { L: number; y0: number; h: number; z: number; n: number; m?: MaterialId; handle?: "top" | "bottom" | "side" | "none"; x0?: number };
function Shutters({ L, y0, h, z, n, m = "laminateWhite", handle = "top", x0 = -L / 2 }: ShuttersProps) {
  const pw = L / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const cx = x0 + pw * (i + 0.5);
        return (
          <group key={i}>
            <B s={[pw - 0.003, h - 0.003, 0.018]} p={[cx, y0 + h / 2, z + 0.009]} m={m} u={pw} v={h} />
            {handle === "top" && <Handle x={cx} y={y0 + h - 0.03} z={z + 0.025} len={Math.min(0.3, pw * 0.6)} />}
            {handle === "bottom" && <Handle x={cx} y={y0 + 0.03} z={z + 0.025} len={Math.min(0.3, pw * 0.6)} />}
            {handle === "side" && <Handle x={cx + (i % 2 ? -1 : 1) * (pw / 2 - 0.04)} y={y0 + Math.min(1.1, h / 2)} z={z + 0.025} len={Math.min(0.45, h * 0.3)} vertical />}
          </group>
        );
      })}
    </>
  );
}

/** Pleated fabric panel (curtains) — sine-displaced plane in local x-y at z=0. */
function Pleat({ w, h, amp, pitch, m, p }: { w: number; h: number; amp: number; pitch: number; m: MaterialId; p: V3 }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(w, h, Math.max(8, Math.round((w / pitch) * 8)), 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, amp * Math.sin((pos.getX(i) / pitch) * Math.PI * 2));
    g.computeVertexNormals();
    return g;
  }, [w, h, amp, pitch]);
  return (
    <mesh geometry={geo} position={p} castShadow receiveShadow>
      <Mat id={m} u={w} v={h} />
    </mesh>
  );
}

/** Poly Haven CC0 light-oak side table (glTF), fitted to the footprint. */
function SideTableModel({ L, D, H }: { L: number; D: number; H: number }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/side_table_01/side_table_01.gltf`);
  const quality = useContext(QualityContext);
  const obj = useMemo(() => {
    // keep the model's geometry, re-skin in the project's light-oak laminate so it matches the palette
    const oak = getMaterial("laminateOak", L, D, quality);
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    c.position.set(-center.x, -box.min.y, -center.z);
    const g = new THREE.Group();
    g.add(c);
    g.scale.set(L / size.x, H / size.y, D / size.z);
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        (o as THREE.Mesh).material = oak;
        o.castShadow = o.receiveShadow = true;
      }
    });
    return g;
  }, [scene, L, D, H, quality]);
  return <primitive object={obj} />;
}

function ProceduralSideTable({ L, D }: { L: number; D: number }) {
  return (
    <>
      <RB s={[L, 0.025, D]} p={[0, 0.49, 0]} m="laminateOak" rad={0.008} />
      <RB s={[L - 0.04, 0.16, D - 0.04]} p={[0, 0.38, 0]} m="laminateOak" rad={0.006} />
      <Handle x={0} y={0.38} z={D / 2 - 0.01} len={0.12} />
      <B s={[L - 0.04, 0.02, D - 0.04]} p={[0, 0.12, 0]} m="laminateOak" />
      <Legs L={L} D={D} h={0.48} inset={0.03} rt={0.014} rb={0.014} />
    </>
  );
}

function Sofa({ L, D, seats, pillows }: { L: number; D: number; seats: number; pillows: number }) {
  const legH = 0.13;
  const arm = seats > 1 ? 0.17 : 0.13;
  const baseH = 0.2;
  const seatTop = legH + baseH;
  const cw = (L - 2 * arm) / seats;
  const back = -D / 2;
  return (
    <>
      <Legs L={L - 0.08} D={D - 0.1} h={legH} rt={0.022} rb={0.012} splay={0.05} />
      <RB s={[L, baseH, D]} p={[0, legH + baseH / 2, 0]} m="fabric" rad={0.03} />
      <RB s={[L, 0.44, 0.17]} p={[0, seatTop + 0.2, back + 0.085]} m="fabric" rad={0.05} />
      {[-1, 1].map((sx) => (
        <RB key={sx} s={[arm, 0.36, D]} p={[sx * (L / 2 - arm / 2), legH + 0.18 + 0.02, 0]} m="fabric" rad={0.07} />
      ))}
      {Array.from({ length: seats }, (_, i) => {
        const x = -L / 2 + arm + cw * (i + 0.5);
        return (
          <group key={i}>
            {/* seat cushion, slightly crowned */}
            <RB s={[cw - 0.012, 0.15, D - 0.26]} p={[x, seatTop + 0.07, 0.07]} m="fabric" rad={0.065} />
            {/* reclined back cushion */}
            <RB s={[cw - 0.02, 0.46, 0.19]} p={[x, seatTop + 0.3, back + 0.26]} r={[-0.2, 0, 0]} m="fabric" rad={0.085} />
          </group>
        );
      })}
      {Array.from({ length: pillows }, (_, i) => {
        const sx = i === 0 ? -1 : 1;
        return <RB key={i} s={[0.42, 0.4, 0.12]} p={[sx * (L / 2 - arm - 0.26), seatTop + 0.33, back + 0.36]} r={[-0.3, sx * 0.25, sx * -0.12]} m="fabricSand" rad={0.06} />;
      })}
    </>
  );
}

function Bed({ L, D, queen }: { L: number; D: number; queen: boolean }) {
  const back = -D / 2;
  const front = D / 2;
  const baseTop = 0.3;
  const mattH = queen ? 0.22 : 0.18;
  const top = baseTop + mattH;
  const pillows = queen ? 2 : 1;
  const pw = (L - 0.2 - (pillows - 1) * 0.06) / pillows;
  const hbH = queen ? 1.1 : 0.85;
  const channels = queen ? 7 : 1;
  return (
    <>
      {/* recessed black plinth → floating base */}
      <B s={[L - 0.12, 0.08, D - 0.12]} p={[0, 0.04, 0]} m="metalBlack" />
      <RB s={[L, baseTop - 0.08, D]} p={[0, 0.08 + (baseTop - 0.08) / 2, 0]} m={queen ? "fabricSand" : "laminateOak"} rad={queen ? 0.03 : 0.05} />
      {/* headboard: channel-tufted upholstery (queen) / rounded oak (single) */}
      {queen ? (
        Array.from({ length: channels }, (_, i) => {
          const w = (L + 0.12) / channels;
          return <RB key={i} s={[w - 0.008, hbH, 0.1]} p={[-(L + 0.12) / 2 + w * (i + 0.5), hbH / 2 + 0.05, back - 0.02]} m="fabricSand" rad={0.045} />;
        })
      ) : (
        <RB s={[L + 0.04, hbH, 0.05]} p={[0, hbH / 2 + 0.05, back - 0.01]} m="laminateOak" rad={0.1} />
      )}
      {/* mattress */}
      <RB s={[L - 0.04, mattH, D - 0.1]} p={[0, baseTop + mattH / 2, 0.03]} m="linen" rad={0.06} />
      {/* duvet: top, fold-over, drape over sides + foot */}
      <RB s={[L + 0.03, 0.06, D * 0.68]} p={[0, top + 0.02, front - D * 0.34 - 0.03]} m="duvet" rad={0.03} />
      <RB s={[L + 0.035, 0.07, 0.26]} p={[0, top + 0.035, front - D * 0.68 - 0.02]} m="linen" rad={0.035} />
      {[-1, 1].map((sx) => (
        <B key={sx} s={[0.018, 0.26, D * 0.68]} p={[sx * (L / 2 + 0.018), top - 0.1, front - D * 0.34 - 0.03]} m="duvet" />
      ))}
      <B s={[L + 0.05, 0.26, 0.018]} p={[0, top - 0.1, front - 0.02]} m="duvet" />
      {/* throw runner across the foot */}
      <RB s={[L + 0.06, 0.03, 0.42]} p={[0, top + 0.06, front - 0.3]} m="fabric" rad={0.012} />
      {/* pillows leaning on the headboard + accent cushions */}
      {Array.from({ length: pillows }, (_, i) => (
        <RB key={i} s={[pw, 0.12, 0.45]} p={[-L / 2 + 0.1 + pw / 2 + i * (pw + 0.06), top + 0.09, back + 0.3]} r={[0.28, 0, 0]} m="linen" rad={0.045} />
      ))}
      {Array.from({ length: queen ? 2 : 1 }, (_, i) => (
        <RB key={`c${i}`} s={[0.4, 0.34, 0.12]} p={[(queen ? (i ? 0.26 : -0.26) : 0) , top + 0.2, back + 0.52]} r={[-0.25, queen ? (i ? -0.12 : 0.12) : 0, 0]} m={queen ? "fabric" : "fabricSand"} rad={0.06} />
      ))}
    </>
  );
}

function Wardrobe({ L, D, kids }: { L: number; D: number; kids: boolean }) {
  const H = 2.4;
  const plinth = 0.08;
  const loftY = 2.0;
  const openShelf = kids ? 0.6 : 0;
  const shutL = L - openShelf;
  const n = Math.max(2, Math.round(shutL / 0.5));
  const front = D / 2;
  const x0 = -L / 2;
  return (
    <>
      <B s={[shutL, plinth, D - 0.06]} p={[x0 + shutL / 2, plinth / 2, -0.03]} m="skirting" />
      <B s={[shutL, H - plinth, D - 0.02]} p={[x0 + shutL / 2, plinth + (H - plinth) / 2, -0.01]} m="laminateWhite" />
      <Shutters L={shutL} x0={x0} y0={plinth} h={loftY - plinth} z={front - 0.02} n={n} handle="side" />
      <Shutters L={shutL} x0={x0} y0={loftY} h={H - loftY} z={front - 0.02} n={n} handle="bottom" />
      {openShelf > 0 && (
        <group position={[L / 2 - openShelf / 2, 0, 0]}>
          <B s={[openShelf, H, 0.018]} p={[0, H / 2, -D / 2 + 0.009]} m="laminateOak" u={openShelf} v={H} />
          {[0.02, 0.45, 0.9, 1.35, 1.8, 2.38].map((y) => (
            <B key={y} s={[openShelf - 0.02, 0.018, D - 0.02]} p={[0, y, 0]} m="laminateOak" />
          ))}
          <B s={[0.018, H, D]} p={[openShelf / 2 - 0.009, H / 2, 0]} m="laminateWhite" />
          {/* book / toy bins (fabric boxes) */}
          {[0.47, 0.92, 1.37].map((y, i) => (
            <RB key={y} s={[openShelf * 0.42, 0.26, D * 0.62]} p={[(i % 2 ? 0.1 : -0.1), y + 0.14, 0]} m={i === 1 ? "fabric" : "fabricSand"} rad={0.02} />
          ))}
        </group>
      )}
    </>
  );
}

function Piece({ f }: { f: Furniture }) {
  const faces = f.faces ?? "S";
  const alongX = faces === "N" || faces === "S";
  const L = alongX ? f.w : f.h;
  const D = alongX ? f.h : f.w;
  const front = D / 2;
  const back = -D / 2;

  switch (f.kind) {
    case "sofa3":
      return <Sofa L={L} D={D} seats={3} pillows={2} />;
    case "loungeChair":
      return <Sofa L={L} D={D} seats={1} pillows={0} />;
    case "coffeeTable":
      return (
        <>
          <RB s={[L, 0.035, D]} p={[0, 0.405, 0]} m="laminateOak" rad={0.012} />
          <B s={[L - 0.08, 0.018, D - 0.08]} p={[0, 0.13, 0]} m="laminateOak" />
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => <B key={`${sx}${sz}`} s={[0.02, 0.385, 0.02]} p={[sx * (L / 2 - 0.04), 0.1925, sz * (D / 2 - 0.04)]} m="metalBlack" />),
          )}
          {[-1, 1].map((sz) => (
            <B key={sz} s={[L - 0.08, 0.02, 0.02]} p={[0, 0.37, sz * (D / 2 - 0.04)]} m="metalBlack" />
          ))}
        </>
      );
    case "tvUnit":
      return (
        <>
          {/* wall-hung unit with push drawers, oak top, floating shelf above */}
          <B s={[L, 0.34, D - 0.02]} p={[0, 0.22 + 0.17, -0.01]} m="laminateWhite" />
          <Shutters L={L} y0={0.22} h={0.34} z={front - 0.02} n={3} handle="top" />
          <B s={[L + 0.02, 0.025, D]} p={[0, 0.5725, 0]} m="laminateOak" />
          <B s={[L * 0.8, 0.03, 0.24]} p={[0, 1.55, back + 0.12]} m="laminateOak" />
          <B s={[L * 0.8, 0.008, 0.01]} p={[0, 1.53, back + 0.2]} m="ledWarm" shadow={false} />
        </>
      );
    case "counter": {
      const n = Math.max(1, Math.round(L / 0.55));
      return (
        <>
          <B s={[L, 0.1, D - 0.1]} p={[0, 0.05, -0.05]} m="skirting" />
          <B s={[L, 0.74, D - 0.05]} p={[0, 0.1 + 0.37, -0.025]} m="laminateWhite" />
          <Shutters L={L} y0={0.1} h={0.74} z={front - 0.04} n={n} handle="top" />
          {/* 40 mm granite top with straight edge + 600 mm splash */}
          <B s={[L, 0.04, D]} p={[0, 0.88, 0]} m="granite" u={L} v={D} />
          <B s={[L, 0.6, 0.015]} p={[0, 0.9 + 0.3, back + 0.0075]} m="granite" u={L} v={0.6} />
        </>
      );
    }
    case "wallUnit": {
      const n = Math.max(1, Math.round(L / 0.45));
      return (
        <>
          <B s={[L, 0.7, D - 0.02]} p={[0, 1.5 + 0.35, -0.01]} m="laminateWhite" />
          <Shutters L={L} y0={1.5} h={0.7} z={front - 0.02} n={n} m="laminateOak" handle="bottom" />
          <B s={[L - 0.04, 0.008, 0.012]} p={[0, 1.495, front - 0.06]} m="ledWarm" shadow={false} />
        </>
      );
    }
    case "hob":
      return (
        <>
          <B s={[L, 0.008, D]} p={[0, 0.904, 0]} m="blackGlass" shadow={false} />
          {[-L / 3, 0, L / 3].map((x, i) => (
            <group key={x} position={[x, 0.908, -0.02]}>
              <Cyl rt={0.055 - (i === 1 ? 0 : 0.012)} rb={0.06 - (i === 1 ? 0 : 0.012)} h={0.018} p={[0, 0.009, 0]} m="metalBlack" />
              <Cyl rt={0.03} rb={0.03} h={0.012} p={[0, 0.024, 0]} m="blackGlass" />
              {/* cast-iron pan support */}
              <B s={[0.2, 0.012, 0.012]} p={[0, 0.03, 0]} m="metalBlack" />
              <B s={[0.012, 0.012, 0.2]} p={[0, 0.03, 0]} m="metalBlack" />
            </group>
          ))}
          {[-L / 3, 0, L / 3].map((x) => (
            <Cyl key={`k${x}`} rt={0.018} rb={0.018} h={0.02} p={[x, 0.918, front - 0.04]} m="brushedNickel" />
          ))}
        </>
      );
    case "sink": {
      const bw = L * 0.52;
      const bx = -L / 2 + 0.04 + bw / 2;
      const bd = D - 0.1;
      return (
        <>
          {/* stainless top with a recessed bowl + drainer grooves */}
          <B s={[L - bw - 0.08, 0.006, D - 0.02]} p={[bx + bw / 2 + (L - bw - 0.08) / 2 + 0.0, 0.903, 0]} m="brushedNickel" shadow={false} />
          {[0, 1, 2, 3, 4].map((i) => (
            <B key={i} s={[L - bw - 0.14, 0.002, 0.006]} p={[bx + bw / 2 + (L - bw - 0.08) / 2, 0.907, -bd / 2 + 0.06 + i * ((bd - 0.12) / 4)]} m="metalBlack" shadow={false} />
          ))}
          <B s={[bw, 0.006, 0.04]} p={[bx, 0.903, front - 0.02]} m="brushedNickel" shadow={false} />
          <B s={[bw, 0.006, 0.04]} p={[bx, 0.903, back + 0.02]} m="brushedNickel" shadow={false} />
          <B s={[0.04, 0.006, D]} p={[-L / 2 + 0.02, 0.903, 0]} m="brushedNickel" shadow={false} />
          {/* bowl: inset steel (flush-mounted look) with drain */}
          <B s={[bw, 0.004, bd]} p={[bx, 0.9035, 0]} m="applianceSteel" shadow={false} />
          <Cyl rt={0.035} rb={0.035} h={0.003} p={[bx, 0.906, 0]} m="metalBlack" shadow={false} />
          {/* black gooseneck mixer */}
          <Cyl rt={0.014} rb={0.018} h={0.3} p={[bx, 1.05, back + 0.03]} m="metalBlack" />
          <mesh position={[bx, 1.2, back + 0.1]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <torusGeometry args={[0.07, 0.012, 10, 24, Math.PI]} />
            <Mat id="metalBlack" />
          </mesh>
        </>
      );
    }
    case "chimney":
      return (
        <>
          {/* T-hood: black-glass visor, steel body, duct cover to ceiling */}
          <B s={[L * 0.98, 0.06, D]} p={[0, 1.66, 0]} m="blackGlass" />
          <B s={[L * 0.98, 0.08, D * 0.9]} p={[0, 1.73, -0.02]} m="applianceSteel" />
          <B s={[0.26, CEILING_M - 1.77, 0.24]} p={[0, 1.77 + (CEILING_M - 1.77) / 2, back + 0.12]} m="applianceSteel" />
          {[-0.12, 0, 0.12].map((x) => (
            <B key={x} s={[0.012, 0.004, 0.012]} p={[x, 1.628, front - 0.04]} m="ledWarm" shadow={false} />
          ))}
        </>
      );
    case "fridge":
      return (
        <>
          <RB s={[L - 0.02, 1.8, D - 0.05]} p={[0, 0.9, -0.01]} m="applianceSteel" rad={0.02} />
          <B s={[L - 0.04, 0.004, 0.004]} p={[0, 1.22, front - 0.035]} m="metalBlack" shadow={false} />
          <Handle x={L / 2 - 0.08} y={1.5} z={front - 0.03} len={0.4} vertical />
          <Handle x={L / 2 - 0.08} y={0.85} z={front - 0.03} len={0.5} vertical />
          {/* housing: loft above + side panel, white laminate */}
          <B s={[L + 0.04, 0.5, D]} p={[0, 2.1 + 0.25, 0]} m="laminateWhite" />
          <Shutters L={L + 0.04} y0={2.1} h={0.5} z={front - 0.01} n={1} handle="bottom" />
        </>
      );
    case "queenBed":
      return <Bed L={L} D={D} queen />;
    case "singleBed":
      return <Bed L={L} D={D} queen={false} />;
    case "sideTable":
      return f.room === "master" ? (
        <Suspense fallback={<ProceduralSideTable L={L} D={D} />}>
          <SideTableModel L={L} D={D} H={0.5} />
        </Suspense>
      ) : (
        <ProceduralSideTable L={L} D={D} />
      );
    case "wardrobe":
      return <Wardrobe L={L} D={D} kids={f.id === "kids-wardrobe"} />;
    case "studyDesk":
      return (
        <>
          <RB s={[L, 0.03, D]} p={[0, 0.745, 0]} m="laminateOak" rad={0.03} />
          <B s={[0.42, 0.7, D - 0.06]} p={[L / 2 - 0.23, 0.35, -0.02]} m="laminateWhite" />
          <Shutters L={0.42} x0={L / 2 - 0.44} y0={0.02} h={0.34} z={front - 0.06} n={1} handle="top" />
          <Shutters L={0.42} x0={L / 2 - 0.44} y0={0.36} h={0.34} z={front - 0.06} n={1} handle="top" />
          <RB s={[0.025, 0.73, D - 0.06]} p={[-L / 2 + 0.03, 0.365, -0.02]} m="laminateWhite" rad={0.01} />
          <B s={[L - 0.5, 0.12, 0.018]} p={[-0.2, 0.66, back + 0.06]} m="laminateWhite" />
          <RB s={[L, 0.025, 0.24]} p={[0, 1.3, back + 0.12]} m="laminateOak" rad={0.01} />
          <B s={[L * 0.9, 0.006, 0.01]} p={[0, 1.285, back + 0.2]} m="ledWarm" shadow={false} />
        </>
      );
    case "chair":
      return (
        <>
          <RB s={[L, 0.045, D]} p={[0, 0.45, 0]} m="laminateWhite" rad={0.02} />
          <RB s={[L - 0.02, 0.26, 0.03]} p={[0, 0.72, back + 0.03]} r={[-0.12, 0, 0]} m="fabricSand" rad={0.013} />
          <Legs L={L} D={D} h={0.43} inset={0.05} rt={0.016} rb={0.011} splay={0.06} />
        </>
      );
    case "shelving":
    case "utilityRack": {
      const H = 2.2;
      const shelves = f.kind === "shelving" ? [0.05, 0.5, 0.95, 1.4, 1.85, 2.18] : [0.05, 2.18];
      return (
        <>
          <B s={[L, H, 0.018]} p={[0, H / 2, back + 0.009]} m="laminateWhite" u={L} v={H} />
          {shelves.map((y) => (
            <B key={y} s={[L, 0.018, D]} p={[0, y, 0]} m={f.kind === "shelving" ? "laminateOak" : "laminateWhite"} />
          ))}
          {f.kind === "shelving" &&
            [0.52, 0.97, 1.42].map((y, i) => (
              <RB key={y} s={[L * 0.7, 0.2, D * 0.8]} p={[0, y + 0.11, 0]} m={i === 1 ? "linen" : "duvet"} rad={0.04} />
            ))}
          {f.kind === "utilityRack" && (
            <>
              {[-0.3, 0, 0.3].map((x) => (
                <Cyl key={x} rt={0.012} rb={0.012} h={1.4} p={[x * (L / 1.2), 0.75, back + 0.08]} r={[0.05, 0, 0]} m={x === 0 ? "metalBlack" : "laminateOak"} seg={8} />
              ))}
              <Cyl rt={0.11} rb={0.12} h={0.4} p={[0.3 * (L / 1.2), 0.2, 0.05]} m="applianceSteel" />
            </>
          )}
        </>
      );
    }
    case "rollerShade": {
      const top = 2.95;
      const bottom = 1.55; // lowered against afternoon sun, sky band left above the parapet
      return (
        <>
          <B s={[L, 0.09, 0.09]} p={[0, top, 0]} m="applianceSteel" />
          <mesh position={[0, (top + bottom) / 2, 0]} castShadow receiveShadow>
            <planeGeometry args={[L - 0.05, top - bottom]} />
            <Mat id="shade" u={L} v={top - bottom} />
          </mesh>
          <B s={[L - 0.05, 0.03, 0.03]} p={[0, bottom, 0]} m="metalBlack" />
          {[-1, 1].map((sx) => (
            <B key={sx} s={[0.02, top - 0.9, 0.03]} p={[sx * (L / 2 - 0.02), (top + 0.9) / 2, 0]} m="metalBlack" />
          ))}
        </>
      );
    }
    case "curtain": {
      // full-width sheer + two light-blackout side panels, pleated, on a slim black rod
      const H = CEILING_M - 0.22;
      const side = Math.min(0.5, L * 0.18);
      return (
        <>
          <Cyl rt={0.012} rb={0.012} h={L} p={[0, H + 0.03, 0]} r={[0, 0, Math.PI / 2]} m="metalBlack" seg={8} />
          {f.open ? (
            // sheer gathered to both sides (denser pleats), centre left clear
            [-1, 1].map((sx) => {
              const sw = ((L - 0.04) * (1 - f.open!)) / 2;
              return <Pleat key={`s${sx}`} w={sw} h={H - 0.03} amp={0.028} pitch={0.08} m="sheer" p={[sx * (L / 2 - 0.02 - sw / 2), (H - 0.03) / 2 + 0.02, 0.02]} />;
            })
          ) : (
            <Pleat w={L - 0.04} h={H - 0.03} amp={0.018} pitch={0.11} m="sheer" p={[0, (H - 0.03) / 2 + 0.02, 0.02]} />
          )}
          {[-1, 1].map((sx) => (
            <Pleat key={sx} w={side} h={H - 0.03} amp={0.035} pitch={0.14} m="blackout" p={[sx * (L / 2 - side / 2), (H - 0.03) / 2 + 0.02, -0.03]} />
          ))}
        </>
      );
    }
    case "wc":
      return (
        <>
          <mesh position={[0, 0.2, front - D * 0.38]} scale={[0.85, 1, 1.15]} castShadow receiveShadow>
            <cylinderGeometry args={[0.18, 0.13, 0.4, 28]} />
            <Mat id="porcelain" />
          </mesh>
          <mesh position={[0, 0.405, front - D * 0.38]} scale={[0.85, 1, 1.15]} castShadow>
            <cylinderGeometry args={[0.185, 0.185, 0.02, 28]} />
            <Mat id="porcelain" />
          </mesh>
          <RB s={[L * 0.95, 0.38, 0.17]} p={[0, 0.6, back + 0.085]} m="porcelain" rad={0.04} />
          <Cyl rt={0.02} rb={0.02} h={0.01} p={[0, 0.795, back + 0.085]} m="brushedNickel" />
        </>
      );
    case "basin": {
      const vanity = f.room === "masterBath";
      return (
        <>
          {vanity ? (
            <>
              <B s={[L, 0.4, D - 0.02]} p={[0, 0.42, -0.01]} m="laminateOak" />
              <Handle x={0} y={0.58} z={front} len={0.2} />
              <B s={[L, 0.02, D]} p={[0, 0.63, 0]} m="granite" />
              <Cyl rt={0.17} rb={0.12} h={0.13} p={[0, 0.705, 0.02]} m="porcelain" seg={32} />
              <Cyl rt={0.14} rb={0.1} h={0.01} p={[0, 0.77, 0.02]} m="applianceSteel" seg={32} shadow={false} />
            </>
          ) : (
            <>
              <RB s={[L, 0.16, D]} p={[0, 0.8, 0]} m="porcelain" rad={0.05} />
              <RB s={[L * 0.7, 0.02, D * 0.6]} p={[0, 0.875, 0.02]} m="applianceSteel" rad={0.009} />
            </>
          )}
          <Cyl rt={0.012} rb={0.016} h={0.26} p={[0, (vanity ? 0.64 : 0.88) + 0.13, back + 0.04]} m="metalBlack" />
          {/* mirror with warm LED halo */}
          <B s={[L * 0.9 + 0.02, 0.72, 0.01]} p={[0, 1.45, back + 0.004]} m="ledWarm" shadow={false} />
          <B s={[L * 0.9, 0.7, 0.012]} p={[0, 1.45, back + 0.012]} m="mirror" shadow={false} />
        </>
      );
    }
    case "showerTray":
      return (
        <>
          <B s={[L, 0.012, D]} p={[0, 0.006, 0]} m="floorWet" shadow={false} />
          <B s={[Math.min(L, D) * 0.6, 0.004, 0.05]} p={[0, 0.014, 0]} m="brushedNickel" shadow={false} />
          {/* square rain head on a wall arm + mixer */}
          <B s={[0.25, 0.012, 0.25]} p={[0, 2.1, 0]} m="metalBlack" />
          <B s={[0.02, 0.02, D / 2]} p={[0, 2.14, -D / 4]} m="metalBlack" />
          <RB s={[0.16, 0.16, 0.03]} p={[0, 1.1, back + 0.015]} m="metalBlack" rad={0.01} />
        </>
      );
    case "showerGlass":
      return (
        <>
          <mesh position={[0, 1.02, 0]}>
            <boxGeometry args={[L, 2.0, D]} />
            <Mat id="glass" />
          </mesh>
          <B s={[L + 0.01, 0.02, D + 0.01]} p={[0, 2.03, 0]} m="metalBlack" />
          <B s={[0.03, 2.0, 0.03]} p={[0, 1.02, back + 0.015]} m="metalBlack" />
        </>
      );
    case "washZone":
      return (
        <>
          <RB s={[L, 0.85, D]} p={[0, 0.425, 0]} m="porcelain" rad={0.02} />
          <mesh position={[0, 0.45, front + 0.002]} rotation={[0, 0, 0]} castShadow>
            <torusGeometry args={[0.18, 0.025, 12, 32]} />
            <Mat id="applianceSteel" />
          </mesh>
          <mesh position={[0, 0.45, front + 0.004]}>
            <circleGeometry args={[0.16, 32]} />
            <Mat id="blackGlass" />
          </mesh>
          <B s={[L - 0.04, 0.08, 0.01]} p={[0, 0.78, front + 0.002]} m="blackGlass" shadow={false} />
          <Cyl rt={0.015} rb={0.015} h={0.09} p={[0.1, 1.05, back + 0.045]} r={[Math.PI / 2, 0, 0]} m="brushedNickel" seg={10} />
        </>
      );
    default:
      return <B s={[L, 0.6, D]} p={[0, 0.3, 0]} m="laminateWhite" />;
  }
}

const rotFor = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 } as const;

export function FurnitureMesh({ f, highlighted }: { f: Furniture; highlighted: boolean }): ReactNode {
  return (
    <HighlightContext.Provider value={highlighted}>
      <group position={[f.x + f.w / 2, 0, -(f.y + f.h / 2)]} rotation={[0, rotFor[f.faces ?? "S"], 0]} name={f.id}>
        <Piece f={f} />
      </group>
    </HighlightContext.Provider>
  );
}

useGLTF.preload(`${import.meta.env.BASE_URL}models/side_table_01/side_table_01.gltf`);
