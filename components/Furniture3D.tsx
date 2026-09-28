import { createContext, useContext, type ReactNode } from "react";
import { RoundedBox } from "@react-three/drei";
import { CEILING_M, type Furniture } from "../plan/plan";
import { palette } from "../plan/materials";

/**
 * Box-modelled furniture proxies. Each piece is built in a local frame:
 *   x = across the front (length L), z = depth D with the FRONT at +z, y = up.
 * The group is rotated so the front faces `f.faces`. Plan (x, y) → world (x, -y).
 */

const Highlight = createContext(false);

type MatProps = { color: string; roughness?: number; metalness?: number; opacity?: number };
function Mat({ color, roughness = 0.7, metalness = 0, opacity }: MatProps) {
  const hl = useContext(Highlight);
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
      emissive={hl ? "#E0892B" : "#000000"}
      emissiveIntensity={hl ? 0.45 : 0}
      depthWrite={opacity === undefined || opacity > 0.9}
    />
  );
}

type BoxProps = { size: [number, number, number]; pos: [number, number, number]; children: ReactNode; shadow?: boolean };
function Box({ size, pos, children, shadow = true }: BoxProps) {
  return (
    <mesh position={pos} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
      {children}
    </mesh>
  );
}

const C = {
  white: palette.laminate,
  oak: palette.laminateOak,
  granite: palette.granite,
  vein: palette.graniteVein,
  black: palette.metalBlack,
  nickel: palette.metal,
  fabric: palette.fabric,
  fabricDark: "#B7AC9E",
  linen: "#FBFAF6",
  duvet: "#DDD5C8",
  porcelain: "#FAFAFA",
  steel: "#C3C7CC",
};

function Handle({ x, y, z, len = 0.18, vertical = true }: { x: number; y: number; z: number; len?: number; vertical?: boolean }) {
  return (
    <Box size={vertical ? [0.012, len, 0.015] : [len, 0.012, 0.015]} pos={[x, y, z]} shadow={false}>
      <Mat color={C.black} roughness={0.4} metalness={0.6} />
    </Box>
  );
}

function Legs({ L, D, h, inset = 0.04, r = 0.018, color = C.black }: { L: number; D: number; h: number; inset?: number; r?: number; color?: string }) {
  const xs = [-L / 2 + inset, L / 2 - inset];
  const zs = [-D / 2 + inset, D / 2 - inset];
  return (
    <>
      {xs.flatMap((x) =>
        zs.map((z) => (
          <mesh key={`${x}${z}`} position={[x, h / 2, z]} castShadow>
            <cylinderGeometry args={[r, r, h, 10]} />
            <Mat color={color} metalness={0.5} roughness={0.4} />
          </mesh>
        )),
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
    case "loungeChair": {
      const seatH = 0.42;
      const arm = f.kind === "sofa3" ? 0.16 : 0.12;
      const cushions = f.kind === "sofa3" ? 3 : 1;
      const cw = (L - 2 * arm) / cushions;
      return (
        <>
          <Box size={[L, 0.28, D - 0.02]} pos={[0, 0.08 + 0.14, 0]}>
            <Mat color={C.fabricDark} roughness={0.95} />
          </Box>
          {Array.from({ length: cushions }, (_, i) => (
            <RoundedBox key={i} args={[cw - 0.02, 0.14, D - 0.26]} radius={0.04} position={[-L / 2 + arm + cw * (i + 0.5), seatH + 0.0, 0.1]} castShadow>
              <Mat color={C.fabric} roughness={0.95} />
            </RoundedBox>
          ))}
          <RoundedBox args={[L, 0.46, 0.2]} radius={0.05} position={[0, seatH + 0.2, back + 0.1]} castShadow>
            <Mat color={C.fabric} roughness={0.95} />
          </RoundedBox>
          {[-1, 1].map((s) => (
            <RoundedBox key={s} args={[arm, 0.28, D]} radius={0.04} position={[s * (L / 2 - arm / 2), 0.08 + 0.28 + 0.1, 0]} castShadow>
              <Mat color={C.fabric} roughness={0.95} />
            </RoundedBox>
          ))}
          <Legs L={L} D={D} h={0.08} r={0.015} />
        </>
      );
    }
    case "coffeeTable":
      return (
        <>
          <RoundedBox args={[L, 0.04, D]} radius={0.015} position={[0, 0.4, 0]} castShadow>
            <Mat color={C.oak} roughness={0.6} />
          </RoundedBox>
          <Box size={[L - 0.1, 0.02, D - 0.1]} pos={[0, 0.14, 0]}>
            <Mat color={C.white} />
          </Box>
          <Legs L={L} D={D} h={0.38} inset={0.05} r={0.012} />
        </>
      );
    case "tvUnit":
      return (
        <>
          <Box size={[L, 0.42, D]} pos={[0, 0.06 + 0.21, 0]}>
            <Mat color={C.white} roughness={0.8} />
          </Box>
          <Box size={[L, 0.03, D + 0.01]} pos={[0, 0.49, 0]}>
            <Mat color={C.oak} />
          </Box>
          {[-0.25, 0.25].map((k) => (
            <Handle key={k} x={k * L} y={0.36} z={front + 0.01} len={0.2} vertical={false} />
          ))}
          <Box size={[L - 0.1, 0.03, 0.26]} pos={[0, 1.55, back + 0.13]}>
            <Mat color={C.oak} />
          </Box>
        </>
      );
    case "counter": {
      const doors = Math.max(1, Math.round(L / 0.5));
      return (
        <>
          <Box size={[L, 0.1, D - 0.08]} pos={[0, 0.05, -0.04]}>
            <Mat color={C.black} />
          </Box>
          <Box size={[L, 0.76, D - 0.03]} pos={[0, 0.1 + 0.38, -0.015]}>
            <Mat color={C.white} roughness={0.85} />
          </Box>
          {Array.from({ length: doors - 1 }, (_, i) => (
            <Box key={i} size={[0.004, 0.72, 0.004]} pos={[-L / 2 + (L / doors) * (i + 1), 0.48, front - 0.028]} shadow={false}>
              <Mat color="#CFCAC0" />
            </Box>
          ))}
          {Array.from({ length: doors }, (_, i) => (
            <Handle key={i} x={-L / 2 + (L / doors) * (i + 0.5)} y={0.8} z={front - 0.02} len={0.16} vertical={false} />
          ))}
          <Box size={[L, 0.04, D]} pos={[0, 0.88, 0]}>
            <Mat color={C.granite} roughness={0.25} />
          </Box>
          <Box size={[L, 0.6, 0.02]} pos={[0, 0.9 + 0.3, back + 0.01]}>
            <Mat color={C.vein} roughness={0.3} />
          </Box>
        </>
      );
    }
    case "wallUnit":
      return (
        <>
          <Box size={[L, 0.7, D]} pos={[0, 1.55 + 0.35, 0]}>
            <Mat color={C.oak} roughness={0.7} />
          </Box>
          <Handle x={0} y={1.6} z={front + 0.01} len={0.25} vertical={false} />
        </>
      );
    case "hob":
      return (
        <>
          <Box size={[L, 0.012, D]} pos={[0, 0.906, 0]} shadow={false}>
            <Mat color="#151515" roughness={0.15} metalness={0.3} />
          </Box>
          {[-L / 3, 0, L / 3].map((x) => (
            <mesh key={x} position={[x, 0.918, 0]}>
              <cylinderGeometry args={[0.07, 0.08, 0.02, 20]} />
              <Mat color="#3A3A3A" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
        </>
      );
    case "sink":
      return (
        <>
          <Box size={[L, 0.01, D]} pos={[0, 0.905, 0]} shadow={false}>
            <Mat color={C.steel} metalness={0.8} roughness={0.3} />
          </Box>
          <Box size={[L * 0.5, 0.012, D - 0.08]} pos={[-L * 0.2, 0.908, 0]} shadow={false}>
            <Mat color="#8E949A" metalness={0.8} roughness={0.35} />
          </Box>
          <mesh position={[-L * 0.2, 1.05, back + 0.04]}>
            <cylinderGeometry args={[0.015, 0.015, 0.28, 10]} />
            <Mat color={C.black} metalness={0.6} roughness={0.35} />
          </mesh>
        </>
      );
    case "chimney":
      return (
        <>
          <Box size={[L * 0.95, 0.1, D]} pos={[0, 1.65, 0]}>
            <Mat color={C.black} roughness={0.2} metalness={0.4} />
          </Box>
          <Box size={[0.26, CEILING_M - 1.7, 0.26]} pos={[0, 1.7 + (CEILING_M - 1.7) / 2, back + 0.13]}>
            <Mat color={C.nickel} roughness={0.35} metalness={0.7} />
          </Box>
        </>
      );
    case "fridge":
      return (
        <>
          <Box size={[L - 0.02, 1.8, D - 0.04]} pos={[0, 0.9, 0]}>
            <Mat color="#DADDE0" roughness={0.35} metalness={0.5} />
          </Box>
          <Box size={[L - 0.02, 0.006, 0.006]} pos={[0, 1.2, front - 0.018]} shadow={false}>
            <Mat color="#9CA0A5" />
          </Box>
          <Handle x={L / 2 - 0.08} y={1.45} z={front - 0.01} len={0.35} />
          <Handle x={L / 2 - 0.08} y={0.85} z={front - 0.01} len={0.3} />
          {/* housing / loft above fridge */}
          <Box size={[L + 0.04, 0.45, D]} pos={[0, 2.1 + 0.225, 0]}>
            <Mat color={C.white} roughness={0.85} />
          </Box>
        </>
      );
    case "queenBed":
    case "singleBed": {
      const pillows = f.kind === "queenBed" ? 2 : 1;
      const pw = (L - 0.2 - (pillows - 1) * 0.08) / pillows;
      return (
        <>
          <RoundedBox args={[L, 0.28, D]} radius={f.kind === "singleBed" ? 0.06 : 0.02} position={[0, 0.2, 0]} castShadow>
            <Mat color={C.oak} roughness={0.7} />
          </RoundedBox>
          <RoundedBox args={[L - 0.06, 0.2, D - 0.12]} radius={0.05} position={[0, 0.44, 0.03]} castShadow>
            <Mat color={C.linen} roughness={0.95} />
          </RoundedBox>
          <RoundedBox args={[L - 0.02, 0.06, D * 0.62]} radius={0.025} position={[0, 0.55, front - D * 0.31 - 0.02]} castShadow>
            <Mat color={C.duvet} roughness={0.95} />
          </RoundedBox>
          <RoundedBox args={[L, f.kind === "queenBed" ? 1.05 : 0.85, 0.08]} radius={0.03} position={[0, (f.kind === "queenBed" ? 1.05 : 0.85) / 2 + 0.06, back + 0.04]} castShadow>
            <Mat color={f.kind === "queenBed" ? C.fabric : C.oak} roughness={0.9} />
          </RoundedBox>
          {Array.from({ length: pillows }, (_, i) => (
            <RoundedBox key={i} args={[pw, 0.12, 0.38]} radius={0.05} position={[-L / 2 + 0.1 + pw / 2 + i * (pw + 0.08), 0.6, back + 0.3]} castShadow>
              <Mat color="#FFFFFF" roughness={0.95} />
            </RoundedBox>
          ))}
        </>
      );
    }
    case "sideTable":
      return (
        <>
          <RoundedBox args={[L, 0.5, D]} radius={0.02} position={[0, 0.25, 0]} castShadow>
            <Mat color={C.oak} />
          </RoundedBox>
          <Handle x={0} y={0.4} z={front + 0.005} len={0.12} vertical={false} />
        </>
      );
    case "wardrobe": {
      const H = 2.4;
      const openShelf = f.id === "kids-wardrobe" ? 0.6 : 0;
      const shutL = L - openShelf;
      const n = Math.max(2, Math.round(shutL / 0.5));
      const pw = shutL / n;
      return (
        <>
          <Box size={[shutL, H, D]} pos={[-L / 2 + shutL / 2, H / 2, 0]}>
            <Mat color={C.white} roughness={0.85} />
          </Box>
          {Array.from({ length: n - 1 }, (_, i) => (
            <Box key={i} size={[0.004, H - 0.04, 0.004]} pos={[-L / 2 + pw * (i + 1), H / 2, front + 0.001]} shadow={false}>
              <Mat color="#CFCAC0" />
            </Box>
          ))}
          <Box size={[shutL, 0.004, 0.004]} pos={[-L / 2 + shutL / 2, 2.0, front + 0.001]} shadow={false}>
            <Mat color="#CFCAC0" />
          </Box>
          {Array.from({ length: n }, (_, i) => (
            <Handle key={i} x={-L / 2 + pw * (i + 0.5) + (i % 2 ? -1 : 1) * (pw / 2 - 0.05)} y={1.1} z={front + 0.01} len={0.5} />
          ))}
          {openShelf > 0 && (
            <group position={[L / 2 - openShelf / 2, 0, 0]}>
              <Box size={[openShelf, H, 0.02]} pos={[0, H / 2, back + 0.01]}>
                <Mat color={C.oak} />
              </Box>
              {[0.02, 0.45, 0.9, 1.35, 1.8, 2.38].map((y) => (
                <Box key={y} size={[openShelf, 0.02, D]} pos={[0, y, 0]}>
                  <Mat color={C.oak} />
                </Box>
              ))}
              <Box size={[0.02, H, D]} pos={[openShelf / 2 - 0.01, H / 2, 0]}>
                <Mat color={C.white} />
              </Box>
              {/* books / toy bins */}
              {[0.46, 0.91, 1.36].map((y, i) => (
                <Box key={y} size={[openShelf * 0.6, 0.28, D * 0.5]} pos={[(i - 1) * 0.05, y + 0.15, back + D * 0.3]}>
                  <Mat color={["#9FB7C9", "#E3B98F", "#B9CFA6"][i]} />
                </Box>
              ))}
            </group>
          )}
        </>
      );
    }
    case "studyDesk":
      return (
        <>
          <RoundedBox args={[L, 0.035, D]} radius={0.015} position={[0, 0.74, 0]} castShadow>
            <Mat color={C.oak} roughness={0.6} />
          </RoundedBox>
          <Box size={[0.4, 0.72, D - 0.05]} pos={[L / 2 - 0.22, 0.36, -0.02]}>
            <Mat color={C.white} />
          </Box>
          <Handle x={L / 2 - 0.22} y={0.6} z={front - 0.04} len={0.14} vertical={false} />
          <Box size={[0.03, 0.72, D - 0.05]} pos={[-L / 2 + 0.02, 0.36, -0.02]}>
            <Mat color={C.white} />
          </Box>
          <Box size={[L, 0.025, 0.25]} pos={[0, 1.25, back + 0.125]}>
            <Mat color={C.oak} />
          </Box>
        </>
      );
    case "chair":
      return (
        <>
          <RoundedBox args={[L, 0.05, D]} radius={0.02} position={[0, 0.45, 0]} castShadow>
            <Mat color={C.white} />
          </RoundedBox>
          <RoundedBox args={[L, 0.35, 0.04]} radius={0.015} position={[0, 0.7, back + 0.02]} castShadow>
            <Mat color="#9FB7C9" />
          </RoundedBox>
          <Legs L={L} D={D} h={0.43} r={0.012} />
        </>
      );
    case "shelving":
    case "utilityRack": {
      const H = 2.2;
      const shelves = f.kind === "shelving" ? [0.05, 0.5, 0.95, 1.4, 1.85, 2.18] : [0.05, 2.18];
      return (
        <>
          <Box size={[L, H, 0.02]} pos={[0, H / 2, back + 0.01]}>
            <Mat color={C.white} />
          </Box>
          {shelves.map((y) => (
            <Box key={y} size={[L, 0.02, D]} pos={[0, y, 0]}>
              <Mat color={f.kind === "shelving" ? C.oak : C.white} />
            </Box>
          ))}
          {f.kind === "shelving" &&
            [0.52, 0.97, 1.42].map((y, i) => (
              <Box key={y} size={[L * 0.7, 0.2, D * 0.8]} pos={[0, y + 0.11, 0]}>
                <Mat color={["#EDE7DC", "#DDE4E8", "#E9DFD2"][i]} roughness={1} />
              </Box>
            ))}
          {f.kind === "utilityRack" && (
            <>
              {[-0.3, 0, 0.3].map((x) => (
                <mesh key={x} position={[x * (L / 1.2), 0.75, back + 0.08]} rotation={[0.05, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.012, 0.012, 1.4, 8]} />
                  <Mat color={x === 0 ? "#6F8FA8" : "#B89F7E"} />
                </mesh>
              ))}
              <mesh position={[0.3 * (L / 1.2), 0.2, 0.05]} castShadow>
                <cylinderGeometry args={[0.11, 0.12, 0.4, 16]} />
                <Mat color="#7A7F86" metalness={0.3} />
              </mesh>
            </>
          )}
        </>
      );
    }
    case "rollerShade": {
      const top = 2.95;
      const bottom = 1.25; // lowered for afternoon sun
      return (
        <>
          <mesh position={[0, top, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, L, 12]} />
            <Mat color="#8A9199" metalness={0.4} />
          </mesh>
          <Box size={[L - 0.05, top - bottom, 0.01]} pos={[0, (top + bottom) / 2, 0]}>
            <Mat color={palette.balconyShade} roughness={1} opacity={0.88} />
          </Box>
          <Box size={[L - 0.05, 0.03, 0.03]} pos={[0, bottom, 0]}>
            <Mat color="#6D747B" metalness={0.4} />
          </Box>
        </>
      );
    }
    case "curtain": {
      // two drawn-back panels at the ends so the opening stays visible
      const pw = Math.min(0.55, L * 0.22);
      const H = CEILING_M - 0.25;
      return (
        <>
          <mesh position={[0, H + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, L, 8]} />
            <Mat color={C.black} metalness={0.5} />
          </mesh>
          {[-1, 1].map((s) => (
            <Box key={s} size={[pw, H - 0.05, 0.05]} pos={[s * (L / 2 - pw / 2), (H - 0.05) / 2 + 0.03, 0]}>
              <Mat color="#EFEAE0" roughness={1} opacity={0.82} />
            </Box>
          ))}
        </>
      );
    }
    case "wc":
      return (
        <>
          <RoundedBox args={[L * 0.85, 0.4, D * 0.72]} radius={0.06} position={[0, 0.2, front - D * 0.36]} castShadow>
            <Mat color={C.porcelain} roughness={0.2} />
          </RoundedBox>
          <Box size={[L * 0.9, 0.36, 0.16]} pos={[0, 0.58, back + 0.08]}>
            <Mat color={C.porcelain} roughness={0.2} />
          </Box>
        </>
      );
    case "basin":
      return (
        <>
          <RoundedBox args={[L, 0.14, D]} radius={0.03} position={[0, 0.82, 0]} castShadow>
            <Mat color={C.porcelain} roughness={0.2} />
          </RoundedBox>
          {f.room === "masterBath" && (
            <Box size={[L, 0.45, D - 0.05]} pos={[0, 0.48, -0.02]}>
              <Mat color={C.oak} />
            </Box>
          )}
          <Box size={[L * 0.8, 0.6, 0.015]} pos={[0, 1.35, back + 0.01]} shadow={false}>
            <Mat color="#DCE8EE" roughness={0.05} metalness={0.9} />
          </Box>
        </>
      );
    case "showerTray":
      return (
        <>
          <Box size={[L, 0.02, D]} pos={[0, 0.01, 0]} shadow={false}>
            <Mat color="#C9CFD2" roughness={0.9} />
          </Box>
          <mesh position={[0, 2.0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.01, 20]} />
            <Mat color={C.black} metalness={0.6} />
          </mesh>
        </>
      );
    case "showerGlass":
      return (
        <>
          <Box size={[L, 2.0, D]} pos={[0, 1.02, 0]} shadow={false}>
            <meshPhysicalMaterial color={palette.glass} transparent opacity={0.28} roughness={0.05} metalness={0} depthWrite={false} />
          </Box>
          <Box size={[L + 0.01, 0.02, D + 0.01]} pos={[0, 2.02, 0]}>
            <Mat color={C.black} metalness={0.6} />
          </Box>
        </>
      );
    case "washZone":
      return (
        <>
          <Box size={[L, 0.85, D]} pos={[0, 0.425, 0]}>
            <Mat color="#F4F4F2" roughness={0.4} />
          </Box>
          <mesh position={[0, 0.5, front + 0.001]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.01, 24]} />
            <Mat color="#9AA3AA" metalness={0.4} roughness={0.2} />
          </mesh>
          <mesh position={[0.1, 1.05, back + 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
            <Mat color={C.nickel} metalness={0.8} />
          </mesh>
        </>
      );
    default:
      return (
        <Box size={[L, 0.6, D]} pos={[0, 0.3, 0]}>
          <Mat color="#ddd" />
        </Box>
      );
  }
}

const rotFor = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 } as const;

export function FurnitureMesh({ f, highlighted }: { f: Furniture; highlighted: boolean }) {
  return (
    <Highlight.Provider value={highlighted}>
      <group position={[f.x + f.w / 2, 0, -(f.y + f.h / 2)]} rotation={[0, rotFor[f.faces ?? "S"], 0]} name={f.id}>
        <Piece f={f} />
      </group>
    </Highlight.Provider>
  );
}
