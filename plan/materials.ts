/**
 * Lighter-modern material tokens for 2D legend + 3D meshes.
 * Keep textures lightweight; prefer solid colors / simple maps.
 */

export const palette = {
  wall: "#F5F2EB", // warm off-white
  wallAccent: "#E8E4DC",
  floorDry: "#D9D2C5", // warm beige / light grey vitrified
  floorWet: "#CFC8BC", // anti-skid slightly darker
  laminate: "#F7F5F0", // matte white / light oak stand-in
  laminateOak: "#E6D3B3",
  granite: "#F2F0EA", // pale artificial granite
  graniteVein: "#D8D4CC",
  metal: "#8A8F98", // brushed nickel
  metalBlack: "#2A2A2A",
  fabric: "#C9C0B4", // greige performance fabric
  glass: "#B8D4E3",
  liftCore: "#4A4A4A",
  balconyShade: "#A8B0B8",
} as const;

export const finishes = {
  walls: {
    name: "Warm off-white emulsion",
    code: palette.wall,
    areas: ["living", "kitchen", "master", "kids", "foyer"],
  },
  floorDry: {
    name: "Light vitrified tile 600–800 mm",
    code: palette.floorDry,
    areas: ["living", "master", "kids", "foyer"],
  },
  floorWet: {
    name: "Light anti-skid tile",
    code: palette.floorWet,
    areas: ["kitchen", "masterBath", "guestBath", "kitchenBalcony", "livingBalcony"],
  },
  kitchenCounter: {
    name: "Artificial granite ~₹110/sqft — pale white/beige",
    code: palette.granite,
    areas: ["kitchen"],
  },
  carcass: {
    name: "Matte white / light oak laminate",
    code: palette.laminate,
    areas: ["kitchen", "master", "kids", "storage"],
  },
  handles: {
    name: "Thin black or brushed nickel",
    code: palette.metalBlack,
    areas: ["kitchen", "master", "kids", "storage"],
  },
  softFurnishings: {
    name: "Performance fabric — greige / sand",
    code: palette.fabric,
    areas: ["living"],
  },
} as const;

export const roomFloorMaterial: Record<string, keyof typeof palette> = {
  living: "floorDry",
  kitchen: "floorWet",
  master: "floorDry",
  kids: "floorDry",
  masterBath: "floorWet",
  guestBath: "floorWet",
  storage: "floorDry",
  foyer: "floorDry",
  livingBalcony: "floorWet",
  kitchenBalcony: "floorWet",
  lift: "liftCore",
};

// ---------------------------------------------------------------------------
// PBR material library (3D realism layer). Pure data — built into three.js
// materials by components/materials3d.tsx. Texture folders live in public/textures/
// (CC0, see docs/ASSET_CREDITS.md); albedo maps are pre-recoloured to the palette,
// so `color` stays white-ish where an albedo map is used.
// ---------------------------------------------------------------------------
export type MaterialSpec = {
  label: string;
  color: string;
  roughness: number;
  metalness?: number;
  /** public/textures/<dir>/{albedo,normal,rough}.jpg */
  tex?: { dir: string; albedo?: boolean; normal?: boolean; rough?: boolean };
  /** real-world size (m) covered by one texture repeat */
  tileM?: number;
  /** texture rotation (rad) — e.g. the diagonal-laid tile scan turned square */
  rotation?: number;
  normalScale?: number;
  /** physical glass / sheer fabric */
  glass?: { transmission: number; thickness: number; ior: number; opacityFallback: number };
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  /** scales environment (HDRI) reflections — e.g. keep black glass from mirroring the room */
  envMapIntensity?: number;
  doubleSide?: boolean;
};

export const materialLibrary = {
  wall: { label: "Warm off-white emulsion (matte)", color: palette.wall, roughness: 0.92, tex: { dir: "wall", normal: true }, tileM: 2.0, normalScale: 0.12 },
  wallShaft: { label: "Lift-shaft wall (same emulsion, acoustic buffer)", color: palette.wallAccent, roughness: 0.92, tex: { dir: "wall", normal: true }, tileM: 2.0, normalScale: 0.12 },
  ceiling: { label: "Gypsum false ceiling, white", color: "#FBFAF7", roughness: 0.95 },
  floorDry: {
    label: "Vitrified tile 600×600, warm beige, polished-matte",
    color: "#FFFFFF",
    roughness: 0.32,
    tex: { dir: "floor-dry", albedo: true, normal: true, rough: true },
    tileM: 2.546, // scan is laid diagonally; 45° turn + this repeat = 600 mm square tiles
    rotation: Math.PI / 4,
    normalScale: 0.5,
  },
  floorWet: { label: "Anti-skid tile 300×300, light", color: "#FFFFFF", roughness: 0.8, tex: { dir: "floor-wet", albedo: true, normal: true, rough: true }, tileM: 1.8, normalScale: 0.8 },
  granite: { label: "Artificial granite ~₹110/sqft — pale, faint vein, light polish", color: "#FFFFFF", roughness: 0.3, tex: { dir: "granite", albedo: true }, tileM: 1.0 },
  laminateWhite: { label: "Matte white laminate (1 mm, 18 mm board)", color: palette.laminate, roughness: 0.72 },
  laminateOak: { label: "Light oak laminate", color: "#FFFFFF", roughness: 0.62, tex: { dir: "oak", albedo: true, normal: true, rough: true }, tileM: 1.0, normalScale: 0.25 },
  fabric: { label: "Performance fabric — greige", color: "#FFFFFF", roughness: 0.95, tex: { dir: "fabric", albedo: true, normal: true, rough: true }, tileM: 0.27, normalScale: 0.6 },
  fabricSand: { label: "Performance fabric — sand (headboard / cushions)", color: "#E9E1D4", roughness: 0.95, tex: { dir: "fabric", normal: true, rough: true }, tileM: 0.27, normalScale: 0.6 },
  linen: { label: "Cotton bed linen, white", color: "#FAF9F6", roughness: 0.97, tex: { dir: "fabric", normal: true }, tileM: 0.27, normalScale: 0.35 },
  duvet: { label: "Duvet cover, oat", color: "#E4DCCF", roughness: 0.97, tex: { dir: "fabric", normal: true }, tileM: 0.27, normalScale: 0.5 },
  sheer: { label: "Sheer curtain, ivory", color: "#F6F3EC", roughness: 1, tex: { dir: "fabric", normal: true }, tileM: 0.27, normalScale: 0.3, opacity: 0.42, doubleSide: true },
  blackout: { label: "Light blackout curtain, greige", color: "#D9D1C4", roughness: 1, tex: { dir: "fabric", normal: true }, tileM: 0.27, normalScale: 0.5, opacity: 0.97, doubleSide: true },
  glass: { label: "8 mm toughened clear glass (shower screen — true transmission in High)", color: "#EAF4F8", roughness: 0.04, glass: { transmission: 1, thickness: 0.008, ior: 1.5, opacityFallback: 0.22 } },
  windowGlass: { label: "Clear float glass (windows, balcony doors) — reflective, transparent", color: "#E4EEF2", roughness: 0.03, metalness: 0.1, opacity: 0.16, envMapIntensity: 1.4 },
  metalBlack: { label: "Matte black metal (handles, frames, legs)", color: palette.metalBlack, roughness: 0.45, metalness: 0.6 },
  brushedNickel: { label: "Brushed nickel / stainless", color: "#B9BDC2", roughness: 0.32, metalness: 1 },
  blackGlass: { label: "Black toughened glass (hob, chimney)", color: "#0B0B0C", roughness: 0.3, metalness: 0, envMapIntensity: 0.25 },
  porcelain: { label: "Vitreous china, white", color: "#FBFBFA", roughness: 0.12 },
  mirror: { label: "Mirror", color: "#F1F5F7", roughness: 0.03, metalness: 1, envMapIntensity: 1.6 },
  applianceSteel: { label: "Appliance steel", color: "#CDD1D5", roughness: 0.3, metalness: 0.85 },
  skirting: { label: "Skirting 90 mm, painted warm grey", color: "#DCD5C9", roughness: 0.55 },
  doorLeaf: { label: "Solid-core flush door, white laminate", color: "#F4F2EC", roughness: 0.6 },
  doorFrame: { label: "Door frame + architrave, light oak", color: "#FFFFFF", roughness: 0.6, tex: { dir: "oak", albedo: true, normal: true }, tileM: 1.0, normalScale: 0.2 },
  parapet: { label: "Balcony parapet, exterior emulsion", color: "#EDE8DF", roughness: 0.95, tex: { dir: "wall", normal: true }, tileM: 2.0, normalScale: 0.3 },
  shade: { label: "Exterior roller shade fabric (sun-screen, greige)", color: "#C9C0AE", roughness: 1, tex: { dir: "fabric", normal: true }, tileM: 0.27, normalScale: 0.9, opacity: 0.72, emissive: "#FFB060", emissiveIntensity: 0.12, doubleSide: true },
  liftSteel: { label: "Lift doors, hairline steel", color: "#A7ACB1", roughness: 0.35, metalness: 0.8 },
  context: { label: "Common area (stair / lobby)", color: "#CFCBC3", roughness: 0.9 },
  ledWarm: { label: "LED 3000 K (emissive)", color: "#FFF6E6", roughness: 0.5, emissive: "#FFE7C2", emissiveIntensity: 2.2 },
} satisfies Record<string, MaterialSpec>;

export type MaterialId = keyof typeof materialLibrary;
