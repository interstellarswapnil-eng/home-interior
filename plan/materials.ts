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
