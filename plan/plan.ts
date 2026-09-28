/**
 * Single source of geometry for 2D (SVG) and 3D (R3F).
 * Units: meters. Origin: SW corner of the master bedroom clear area
 * (inside face of the exterior walls), +X = east, +Y = north.
 *
 * Kitchen balcony faces SOUTH (user-locked). Living balcony is NORTH.
 * Placement refined against docs/floor-plan-source.jpg:
 *   - west stack (south→north): master → 8'×4' bath → kids → shared stair
 *   - middle strip: guest bath (south), hall, ex-basin niche = storage, lift
 *   - east wing: kitchen (south) open to living (north)
 *   - entry from the common lobby (north of lift) into living's NW corner
 * Room sizes and roles below are locked; rooms are clear (inside-face) sizes,
 * walls sit outside the room rectangles.
 */

export const FT = 0.3048;
export const ft = (feet: number) => feet * FT;
export const ftIn = (feet: number, inches = 0) => (feet + inches / 12) * FT;

/** Default ceiling height — Indian residential */
export const CEILING_M = ft(10); // 3.048 m

export const WALL = {
  exterior: 0.2,
  interior: 0.1,
  /** RCC lift shaft walls (thicker; acoustic buffer) */
  shaft: 0.15,
} as const;

export type Rect = { x: number; y: number; w: number; h: number };
export type RoomId =
  | "living"
  | "kitchen"
  | "master"
  | "kids"
  | "masterBath"
  | "guestBath"
  | "storage"
  | "lift"
  | "livingBalcony"
  | "kitchenBalcony"
  | "foyer";

export type Room = Rect & {
  id: RoomId;
  label: string;
  role: string;
  facing?: "north" | "south" | "east" | "west";
};

export type Opening = {
  id: string;
  type: "door" | "doubleDoor" | "window" | "shutter";
  /**
   * rotationDeg 90 → opening in an E-W wall: starts at x, runs +x for `w`, wall line at y.
   * rotationDeg 0  → opening in a N-S wall: wall line at x, starts at y, runs +y for `w`.
   */
  x: number;
  y: number;
  w: number;
  h: number; // wall thickness hint (2D)
  rotationDeg: 0 | 90 | 180 | 270;
  fromRoom: RoomId;
  toRoom?: RoomId | "exterior" | "lobby";
  /** Door leaf: hinge at start/end of the run; swings toward +axis (1) or -axis (-1). */
  swing?: { hinge: "start" | "end"; dir: 1 | -1 };
  /** Height band in 3D (m from floor). Defaults per type in openingBand(). */
  sill?: number;
  head?: number;
  /** Supplied by builder — not an interiors budget item. */
  builder?: boolean;
};

export type Facing = "N" | "S" | "E" | "W";

export type Furniture = {
  id: string;
  room: RoomId;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotationDeg?: number;
  /** Which way the front of the piece faces (for 3D orientation). */
  faces?: Facing;
  /** Curtains: fraction of the opening left clear (sheers gathered to the sides). */
  open?: number;
  note?: string;
};

export type Wall = Rect & {
  id: string;
  kind: "exterior" | "interior" | "shaft" | "parapet" | "context";
  /** 3D height in m (default CEILING_M) */
  height?: number;
};

// ---------------------------------------------------------------------------
// Locked clear sizes (from architectural plan)
// ---------------------------------------------------------------------------
const MASTER_W = ftIn(12, 2); // 3.708 m  (E-W)
const MASTER_D = ftIn(10, 6); // 3.200 m  (N-S)
const KIDS_W = ftIn(12, 4); // 3.759 m
const KIDS_D = ftIn(10, 6); // 3.200 m
const LIVING_W = ft(14); // 4.267 m
const LIVING_D = ftIn(16, 3); // 4.953 m
const KIT_W = ft(14); // 4.267 m
const KIT_D = ftIn(11, 6); // 3.505 m
const MBATH_W = ft(8); // 2.438 m
const MBATH_D = ft(4); // 1.219 m  (strip between bedrooms)
const GBATH_W = ft(4); // 1.219 m
const GBATH_D = ft(7); // 2.134 m
const LIFT_W = ft(5); // 1.524 m
const LIFT_D = ft(6); // 1.829 m
const BAL_N = ftIn(4, 6); // living balcony depth
const BAL_S = ft(4); // kitchen balcony depth (south)
const STRIP_W = ft(6); // lift / storage strip between beds & living-kit (incl. shaft walls)
const STAIR_D = ft(7); // stair well depth (N-S) on plan

const I = WALL.interior;
const E = WALL.exterior;
const S = WALL.shaft;

// ---------------------------------------------------------------------------
// Placement (matches plan topology)
// ---------------------------------------------------------------------------
const master: Room = {
  id: "master",
  label: "Master Bedroom",
  role: "Master bedroom (parents)",
  x: 0,
  y: 0,
  w: MASTER_W,
  h: MASTER_D,
};

const masterBath: Room = {
  id: "masterBath",
  label: "Master Bath",
  role: "Master ensuite (between bedrooms, door from master)",
  // West-aligned between the bedrooms (as on plan); hall sits east of it
  x: 0,
  y: MASTER_D + I,
  w: MBATH_W,
  h: MBATH_D,
};

const kids: Room = {
  id: "kids",
  label: "Kids Bedroom",
  role: "Kids room — 1 child",
  x: 0,
  y: masterBath.y + MBATH_D + I,
  w: KIDS_W,
  h: KIDS_D,
};

/** West face of the lift / storage strip */
const stripX = KIDS_W + I;
/** Open living–kitchen wing starts east of strip */
const wingX = stripX + STRIP_W;
/** Living / kitchen junction lines up with the kids-room south wall */
const junctionY = kids.y - I;

const kitchen: Room = {
  id: "kitchen",
  label: "Kitchen",
  role: "Open kitchen (L-shaped)",
  x: wingX,
  y: junctionY - KIT_D,
  w: KIT_W,
  h: KIT_D,
};

const living: Room = {
  id: "living",
  label: "Living",
  role: "Living / lounge (open to kitchen)",
  x: wingX,
  y: junctionY,
  w: LIVING_W,
  h: LIVING_D,
};

const lift: Room = {
  id: "lift",
  label: "Lift",
  role: "Existing lift core — do not redesign",
  x: stripX + S,
  y: kids.y + KIDS_D - LIFT_D, // north face flush with kids north wall (plan)
  w: LIFT_W,
  h: LIFT_D,
};

const storage: Room = {
  id: "storage",
  label: "Storage",
  role: "Storage room (ex wash-basin niche) — full-height shutters",
  x: lift.x,
  y: kids.y,
  w: LIFT_W,
  h: lift.y - S - kids.y,
};

const foyer: Room = {
  id: "foyer",
  label: "Foyer / Hall",
  role: "Internal circulation: bedrooms, ensuite, guest bath, storage → living/kitchen",
  x: MBATH_W + I,
  y: masterBath.y,
  w: wingX - (MBATH_W + I),
  h: MBATH_D,
};

const guestBath: Room = {
  id: "guestBath",
  label: "Guest Washroom",
  role: "Guest washroom (near kitchen)",
  x: wingX - I - GBATH_W,
  y: kitchen.y,
  w: GBATH_W,
  h: GBATH_D,
};

const kitchenBalcony: Room = {
  id: "kitchenBalcony",
  label: "Kitchen Balcony",
  role: "South-facing service balcony (shade + wash zone)",
  facing: "south",
  x: wingX,
  y: kitchen.y - E - BAL_S,
  w: KIT_W,
  h: BAL_S,
};

const livingBalcony: Room = {
  id: "livingBalcony",
  label: "Living Balcony",
  role: "Living balcony",
  facing: "north",
  x: wingX,
  y: living.y + LIVING_D + E,
  w: LIVING_W,
  h: BAL_N,
};

/** Context only — shared stair, not private fit-out */
export const stairContext: Rect & { label: string } = {
  label: "Staircase (shared)",
  x: 0,
  y: kids.y + KIDS_D + E,
  w: KIDS_W,
  h: STAIR_D,
};

/** Context only — common lobby between stair, lift and the flat entry */
export const lobbyContext: Rect & { label: string } = {
  label: "Common lobby",
  x: stripX,
  y: lift.y + LIFT_D + S,
  w: STRIP_W - S,
  h: stairContext.y + STAIR_D - (lift.y + LIFT_D + S),
};

/** Plumbing duct between master and guest bath (no fit-out) */
export const ductContext: Rect & { label: string } = {
  label: "Duct",
  x: MASTER_W + I,
  y: kitchen.y,
  w: guestBath.x - I - (MASTER_W + I),
  h: GBATH_D,
};

export const contextAreas = [stairContext, lobbyContext, ductContext];

export const rooms: Room[] = [
  master,
  masterBath,
  kids,
  guestBath,
  storage,
  lift,
  foyer,
  kitchen,
  living,
  kitchenBalcony,
  livingBalcony,
];

export const roomById = Object.fromEntries(rooms.map((r) => [r.id, r])) as Record<
  RoomId,
  Room
>;

// ---------------------------------------------------------------------------
// Walls (axis-aligned rectangles, outside the clear room rects)
// ---------------------------------------------------------------------------
const east = wingX + KIT_W; // inside face of east exterior wall
const livingTop = living.y + LIVING_D;
const stairTop = stairContext.y + STAIR_D;
const PARAPET = 1.05;

export const walls: Wall[] = [
  // --- exterior shell
  { id: "ext-w", kind: "exterior", x: -E, y: -E, w: E, h: stairTop + 2 * E },
  { id: "ext-s-master", kind: "exterior", x: -E, y: -E, w: MASTER_W + 2 * E, h: E },
  { id: "ext-e-master", kind: "exterior", x: MASTER_W, y: -E, w: E, h: kitchen.y + E },
  { id: "ext-s-wing", kind: "exterior", x: MASTER_W, y: kitchen.y - E, w: east + E - MASTER_W, h: E },
  { id: "ext-e", kind: "exterior", x: east, y: kitchen.y - E, w: E, h: livingTop - kitchen.y + 2 * E },
  { id: "ext-n-living", kind: "exterior", x: wingX - S, y: livingTop, w: east + E - (wingX - S), h: E },
  // --- stair / lobby context (common areas)
  { id: "ctx-n-stair", kind: "context", x: -E, y: stairTop, w: wingX + E, h: E },
  { id: "kids-n", kind: "exterior", x: -E, y: kids.y + KIDS_D, w: lift.x + LIFT_W + E, h: E },
  // --- west stack
  { id: "master-n", kind: "interior", x: 0, y: MASTER_D, w: MASTER_W + I, h: I },
  { id: "mbath-e", kind: "interior", x: MBATH_W, y: masterBath.y, w: I, h: MBATH_D },
  { id: "kids-s", kind: "interior", x: 0, y: junctionY, w: storage.x, h: I },
  { id: "kids-e", kind: "shaft", x: KIDS_W, y: junctionY, w: lift.x - KIDS_W, h: kids.y + KIDS_D - junctionY },
  // --- middle strip
  { id: "master-e", kind: "interior", x: MASTER_W, y: kitchen.y, w: I, h: MASTER_D + I - kitchen.y },
  { id: "gbath-w", kind: "interior", x: guestBath.x - I, y: kitchen.y, w: I, h: foyer.y - kitchen.y },
  { id: "gbath-n", kind: "interior", x: MASTER_W, y: guestBath.y + GBATH_D, w: wingX - MASTER_W, h: foyer.y - (guestBath.y + GBATH_D) },
  { id: "gbath-e", kind: "interior", x: wingX - I, y: kitchen.y, w: I, h: foyer.y - kitchen.y },
  { id: "storage-front", kind: "interior", x: storage.x, y: junctionY, w: LIFT_W, h: I },
  { id: "lift-s", kind: "shaft", x: lift.x, y: lift.y - S, w: LIFT_W, h: S },
  { id: "living-w", kind: "shaft", x: lift.x + LIFT_W, y: junctionY, w: wingX - (lift.x + LIFT_W), h: stairTop + E - junctionY },
  // --- balconies (parapets)
  { id: "bal-n-w", kind: "parapet", height: PARAPET, x: wingX - I, y: livingTop + E, w: I, h: BAL_N },
  { id: "bal-n-n", kind: "parapet", height: PARAPET, x: wingX - I, y: livingTop + E + BAL_N, w: KIT_W + I + E, h: I },
  { id: "bal-n-e", kind: "parapet", height: PARAPET, x: east, y: livingTop + E, w: E, h: BAL_N },
  { id: "bal-s-w", kind: "parapet", height: PARAPET, x: wingX - I, y: kitchenBalcony.y, w: I, h: BAL_S },
  { id: "bal-s-s", kind: "parapet", height: PARAPET, x: wingX - I, y: kitchenBalcony.y - I, w: KIT_W + I + E, h: I },
  { id: "bal-s-e", kind: "parapet", height: PARAPET, x: east, y: kitchenBalcony.y, w: E, h: BAL_S },
];

// ---------------------------------------------------------------------------
// Openings
// ---------------------------------------------------------------------------
export const openings: Opening[] = [
  {
    id: "entry",
    type: "door",
    x: wingX,
    y: livingTop - ft(3.6),
    w: ft(3.25),
    h: S,
    rotationDeg: 0,
    fromRoom: "living",
    toRoom: "lobby",
    swing: { hinge: "end", dir: 1 },
    builder: true,
  },
  {
    id: "master-door",
    type: "door",
    x: MASTER_W - 0.05 - ft(3),
    y: MASTER_D,
    w: ft(3),
    h: I,
    rotationDeg: 90,
    fromRoom: "foyer",
    toRoom: "master",
    swing: { hinge: "end", dir: -1 },
  },
  {
    id: "master-ensuite",
    type: "door",
    x: 0.1,
    y: MASTER_D,
    w: ftIn(2, 6),
    h: I,
    rotationDeg: 90,
    fromRoom: "master",
    toRoom: "masterBath",
    swing: { hinge: "start", dir: 1 },
  },
  {
    id: "kids-door",
    type: "door",
    x: KIDS_W - 0.05 - ft(3),
    y: junctionY,
    w: ft(3),
    h: I,
    rotationDeg: 90,
    fromRoom: "foyer",
    toRoom: "kids",
    swing: { hinge: "end", dir: 1 },
  },
  {
    id: "guest-bath-door",
    type: "door",
    x: guestBath.x + 0.2,
    y: guestBath.y + GBATH_D,
    w: ftIn(2, 6),
    h: I,
    rotationDeg: 90,
    fromRoom: "foyer",
    toRoom: "guestBath",
    swing: { hinge: "start", dir: -1 },
  },
  {
    id: "storage-door",
    type: "shutter",
    x: storage.x + 0.05,
    y: junctionY,
    w: LIFT_W - 0.1,
    h: I,
    rotationDeg: 90,
    fromRoom: "foyer",
    toRoom: "storage",
    head: 2.4,
  },
  {
    id: "living-balcony",
    type: "doubleDoor",
    x: living.x + LIVING_W / 2 - ft(3),
    y: livingTop,
    w: ft(6),
    h: E,
    rotationDeg: 90,
    fromRoom: "living",
    toRoom: "livingBalcony",
    swing: { hinge: "start", dir: 1 },
    builder: true,
  },
  {
    id: "kitchen-balcony",
    type: "door",
    x: kitchen.x + ftIn(3, 9),
    y: kitchen.y,
    w: ft(3),
    h: E,
    rotationDeg: 90,
    fromRoom: "kitchen",
    toRoom: "kitchenBalcony",
    swing: { hinge: "start", dir: -1 },
  },
  {
    id: "lift-door",
    type: "shutter",
    x: lift.x + 0.3,
    y: lift.y + LIFT_D,
    w: LIFT_W - 0.6,
    h: E,
    rotationDeg: 90,
    fromRoom: "lift",
    toRoom: "lobby",
    builder: true,
  },
  // Windows — west beds, east living/kitchen, south kitchen/guest bath
  {
    id: "win-master-w",
    type: "window",
    x: 0,
    y: 0.7,
    w: ft(5),
    h: E,
    rotationDeg: 0,
    fromRoom: "master",
    toRoom: "exterior",
    builder: true,
  },
  {
    id: "win-mbath-w",
    type: "window",
    x: 0,
    y: masterBath.y + 0.35,
    w: 0.6,
    h: E,
    rotationDeg: 0,
    fromRoom: "masterBath",
    toRoom: "exterior",
    sill: 1.6,
    builder: true,
  },
  {
    id: "win-kids-w",
    type: "window",
    x: 0,
    y: kids.y + KIDS_D / 2 - ft(2.5),
    w: ft(5),
    h: E,
    rotationDeg: 0,
    fromRoom: "kids",
    toRoom: "exterior",
    builder: true,
  },
  {
    id: "win-living-e",
    type: "window",
    x: east,
    y: living.y + 1.6,
    w: ft(6),
    h: E,
    rotationDeg: 0,
    fromRoom: "living",
    toRoom: "exterior",
    builder: true,
  },
  {
    id: "win-kitchen-e",
    type: "window",
    x: east,
    y: kitchen.y + 0.85,
    w: 0.9,
    h: E,
    rotationDeg: 0,
    fromRoom: "kitchen",
    toRoom: "exterior",
    sill: 1.05,
    builder: true,
  },
  {
    id: "win-kitchen-s",
    type: "window",
    x: kitchen.x + ft(10),
    y: kitchen.y,
    w: 0.9,
    h: E,
    rotationDeg: 90,
    fromRoom: "kitchen",
    toRoom: "exterior",
    sill: 1.05,
    builder: true,
  },
  {
    id: "win-gbath-s",
    type: "window",
    x: guestBath.x + 0.3,
    y: kitchen.y,
    w: 0.6,
    h: E,
    rotationDeg: 90,
    fromRoom: "guestBath",
    toRoom: "exterior",
    sill: 1.6,
    builder: true,
  },
];

/** Vertical band (m from floor) an opening cuts out of its wall in 3D. */
export function openingBand(o: Opening): { sill: number; head: number } {
  const def =
    o.type === "window" ? { sill: 0.9, head: 2.1 } : o.type === "shutter" ? { sill: 0, head: 2.2 } : { sill: 0, head: 2.1 };
  return { sill: o.sill ?? def.sill, head: o.head ?? def.head };
}

// ---------------------------------------------------------------------------
// Furniture anchors (lighter modern, 1 kid, budget ~9L)
// ---------------------------------------------------------------------------
const kidsTop = kids.y + KIDS_D;
const liftFaceX = lift.x + LIFT_W + S; // = wingX
const sofaX = east - 0.18 - ft(3); // clear of the east-window curtain

export const furniture: Furniture[] = [
  // Living — TV on lift wall, sofa on east wall facing it, seating toward north balcony
  {
    id: "tv-unit",
    room: "living",
    kind: "tvUnit",
    x: liftFaceX + 0.05,
    y: living.y + 1.7,
    w: 0.45,
    h: ft(5),
    faces: "E",
    note: "Light laminate, against lift-side wall",
  },
  {
    id: "sofa-3",
    room: "living",
    kind: "sofa3",
    x: sofaX,
    y: living.y + 1.55,
    w: ft(3),
    h: ft(7),
    faces: "W",
    note: "3-seater, performance fabric",
  },
  {
    id: "coffee",
    room: "living",
    kind: "coffeeTable",
    x: sofaX - 0.4 - ft(2),
    y: living.y + 1.55 + ft(3.5) - ft(2),
    w: ft(2),
    h: ft(4),
    faces: "W",
  },
  {
    id: "chair-l",
    room: "living",
    kind: "loungeChair",
    x: sofaX - 0.35 - ft(2.5),
    y: living.y + 1.55 + ft(7) + 0.15,
    w: ft(2.5),
    h: ft(2.5),
    faces: "S",
  },
  {
    id: "chair-r",
    room: "living",
    kind: "loungeChair",
    x: sofaX - 0.35 - ft(2.5),
    y: living.y + 1.55 - 0.15 - ft(2.5),
    w: ft(2.5),
    h: ft(2.5),
    faces: "N",
  },
  {
    id: "living-curtain-n",
    room: "living",
    kind: "curtain",
    x: living.x + LIVING_W / 2 - ft(3) - 0.3,
    y: livingTop - 0.12,
    w: ft(6) + 0.6,
    h: 0.08,
    faces: "S",
    open: 0.55,
    note: "Sheer + light blackout (gathered at the balcony doors)",
  },
  {
    id: "living-curtain-e",
    room: "living",
    kind: "curtain",
    x: east - 0.12,
    y: living.y + 1.6 - 0.3,
    w: 0.08,
    h: ft(6) + 0.6,
    faces: "W",
  },

  // Kitchen — L on south + east walls; sink on south leg, hob on east leg
  {
    id: "kit-counter-s",
    room: "kitchen",
    kind: "counter",
    x: kitchen.x + ft(7),
    y: kitchen.y,
    w: KIT_W - ft(7),
    h: ft(2),
    faces: "N",
    note: "Artificial granite ~₹110/sqft, pale",
  },
  {
    id: "kit-counter-e",
    room: "kitchen",
    kind: "counter",
    x: east - ft(2),
    y: kitchen.y + ft(2),
    w: ft(2),
    h: ft(7),
    faces: "W",
    note: "L return — hob on this leg, sink on south leg",
  },
  {
    id: "sink",
    room: "kitchen",
    kind: "sink",
    x: kitchen.x + ft(10) + 0.05,
    y: kitchen.y + 0.08,
    w: 0.8,
    h: 0.45,
    faces: "N",
    note: "Single bowl + drainboard, under south window",
  },
  {
    id: "hob",
    room: "kitchen",
    kind: "hob",
    x: east - 0.53,
    y: kitchen.y + ft(6),
    w: 0.45,
    h: 0.75,
    faces: "W",
  },
  {
    id: "chimney",
    room: "kitchen",
    kind: "chimney",
    x: east - 0.5,
    y: kitchen.y + ft(6) - 0.025,
    w: 0.5,
    h: 0.8,
    faces: "W",
    note: "Auto-clean, tadka-capable (~1200 m³/h)",
  },
  {
    id: "kit-wall-s",
    room: "kitchen",
    kind: "wallUnit",
    x: kitchen.x + ft(7),
    y: kitchen.y,
    w: ft(3),
    h: 0.35,
    faces: "N",
    note: "Wall unit, light laminate",
  },
  {
    id: "fridge",
    room: "kitchen",
    kind: "fridge",
    x: wingX + 0.02,
    y: kitchen.y + ft(3.5),
    w: 0.7,
    h: 0.75,
    faces: "E",
    note: "Fridge pocket on plan — west kitchen wall (housing only)",
  },

  // Master — queen bed on south wall; wardrobe on marked north wall between doors
  {
    id: "master-bed",
    room: "master",
    kind: "queenBed",
    x: master.x + MASTER_W / 2 - ft(2.5),
    y: master.y + 0.05,
    w: ft(5),
    h: ftIn(6, 6),
    faces: "N",
  },
  {
    id: "master-st-l",
    room: "master",
    kind: "sideTable",
    x: master.x + MASTER_W / 2 - ft(2.5) - 0.1 - ft(1.3),
    y: master.y + 0.05,
    w: ft(1.3),
    h: ft(1.3),
    faces: "N",
  },
  {
    id: "master-st-r",
    room: "master",
    kind: "sideTable",
    x: master.x + MASTER_W / 2 + ft(2.5) + 0.1,
    y: master.y + 0.05,
    w: ft(1.3),
    h: ft(1.3),
    faces: "N",
  },
  {
    id: "master-wardrobe",
    room: "master",
    kind: "wardrobe",
    x: master.x + 0.95,
    y: master.y + MASTER_D - 0.6,
    w: 1.75,
    h: 0.6,
    faces: "S",
    note: "Full-wall light laminate on marked wall, between ensuite & room doors",
  },
  {
    id: "master-curtain",
    room: "master",
    kind: "curtain",
    x: 0.02,
    y: 0.7 - 0.3,
    w: 0.08,
    h: ft(5) + 0.6,
    faces: "E",
  },

  // Master ensuite 8'×4' — basin opposite door, WC, glass shower at east end
  {
    id: "mb-basin",
    room: "masterBath",
    kind: "basin",
    x: 0.15,
    y: masterBath.y + MBATH_D - 0.42,
    w: 0.5,
    h: 0.42,
    faces: "S",
  },
  {
    id: "mb-wc",
    room: "masterBath",
    kind: "wc",
    x: 1.0,
    y: masterBath.y + MBATH_D - 0.68,
    w: 0.4,
    h: 0.68,
    faces: "S",
  },
  {
    id: "mb-shower",
    room: "masterBath",
    kind: "showerTray",
    x: 1.55,
    y: masterBath.y,
    w: MBATH_W - 1.55,
    h: MBATH_D,
    note: "Walk-in shower, large-format light tiles",
  },
  {
    id: "mb-shower-glass",
    room: "masterBath",
    kind: "showerGlass",
    x: 1.52,
    y: masterBath.y + 0.35,
    w: 0.02,
    h: MBATH_D - 0.35,
    note: "8 mm toughened glass screen",
  },

  // Guest washroom 4'×7' — shower at south, WC + basin, anti-skid
  {
    id: "gb-shower",
    room: "guestBath",
    kind: "showerTray",
    x: guestBath.x,
    y: guestBath.y,
    w: GBATH_W,
    h: 0.8,
  },
  {
    id: "gb-wc",
    room: "guestBath",
    kind: "wc",
    x: guestBath.x,
    y: guestBath.y + 0.9,
    w: 0.68,
    h: 0.4,
    faces: "E",
  },
  {
    id: "gb-basin",
    room: "guestBath",
    kind: "basin",
    x: guestBath.x + GBATH_W - 0.42,
    y: guestBath.y + 1.2,
    w: 0.42,
    h: 0.45,
    faces: "W",
  },

  // Kids — single bed on north wall, study desk at west window, wardrobe on lift wall
  {
    id: "kids-bed",
    room: "kids",
    kind: "singleBed",
    x: kids.x + 1.3,
    y: kidsTop - 0.05 - ftIn(6, 6),
    w: ftIn(3, 6),
    h: ftIn(6, 6),
    faces: "S",
    note: "1 child — single bed, not bunk",
  },
  {
    id: "kids-desk",
    room: "kids",
    kind: "studyDesk",
    x: kids.x + 0.05,
    y: kids.y + KIDS_D / 2 - ftIn(1, 9),
    w: ft(2),
    h: ftIn(3, 6),
    faces: "E",
    note: "At window light; rounded corners",
  },
  {
    id: "kids-chair",
    room: "kids",
    kind: "chair",
    x: kids.x + 0.72,
    y: kids.y + KIDS_D / 2 - 0.23,
    w: 0.46,
    h: 0.46,
    faces: "W",
  },
  {
    id: "kids-wardrobe",
    room: "kids",
    kind: "wardrobe",
    x: kids.x + KIDS_W - 0.6,
    y: kids.y + 0.98,
    w: 0.6,
    h: kidsTop - 0.05 - (kids.y + 0.98),
    faces: "W",
    note: "Clothes + toy/book zones; buffer to lift",
  },
  {
    id: "kids-curtain",
    room: "kids",
    kind: "curtain",
    x: 0.02,
    y: kids.y + KIDS_D / 2 - ft(2.5) - 0.3,
    w: 0.08,
    h: ft(5) + 0.6,
    faces: "E",
  },

  // Storage (ex-basin niche) — broom/vacuum left, linen shelves right
  {
    id: "storage-shelves",
    room: "storage",
    kind: "shelving",
    x: storage.x + LIFT_W - 0.45,
    y: storage.y + 0.05,
    w: 0.4,
    h: storage.h - 0.1,
    faces: "W",
    note: "Linen shelves",
  },
  {
    id: "storage-utility",
    room: "storage",
    kind: "utilityRack",
    x: storage.x + 0.05,
    y: storage.y + 0.05,
    w: 0.3,
    h: storage.h - 0.1,
    faces: "E",
    note: "Broom / vacuum / mop hooks",
  },

  // South balcony — exterior shade + simple wash zone
  {
    id: "south-shade",
    room: "kitchenBalcony",
    kind: "rollerShade",
    x: kitchenBalcony.x + 0.1,
    y: kitchenBalcony.y + 0.02,
    w: KIT_W - 0.2,
    h: 0.08,
    faces: "N",
    note: "Exterior roller shade against south sun",
  },
  {
    id: "wash-zone",
    room: "kitchenBalcony",
    kind: "washZone",
    x: kitchenBalcony.x + KIT_W - 0.75,
    y: kitchenBalcony.y + BAL_S - 0.7,
    w: 0.65,
    h: 0.62,
    faces: "W",
    note: "Washing machine + tap point",
  },
];

// ---------------------------------------------------------------------------
// Area helpers + assertions (run in app boot or vitest)
// ---------------------------------------------------------------------------
export function rectAreaM2(r: Rect): number {
  return r.w * r.h;
}

export function nearlyEqual(a: number, b: number, tol = 0.02): boolean {
  return Math.abs(a - b) / Math.max(b, 1e-6) <= tol;
}

/** Plan clear areas from locked ft dimensions (tolerance for placement only). */
export const expectedAreasM2: Partial<Record<RoomId, number>> = {
  living: ft(14) * ftIn(16, 3),
  kitchen: ft(14) * ftIn(11, 6),
  master: ftIn(12, 2) * ftIn(10, 6),
  kids: ftIn(12, 4) * ftIn(10, 6),
  masterBath: ft(8) * ft(4),
  guestBath: ft(4) * ft(7),
  lift: ft(5) * ft(6),
  livingBalcony: ft(14) * ftIn(4, 6),
  kitchenBalcony: ft(14) * ft(4),
};

export function assertPlanAreas(): { id: RoomId; ok: boolean; got: number; expected: number }[] {
  return (Object.keys(expectedAreasM2) as RoomId[]).map((id) => {
    const room = roomById[id];
    const got = rectAreaM2(room);
    const expected = expectedAreasM2[id]!;
    return { id, ok: nearlyEqual(got, expected, 0.02), got, expected };
  });
}

/** Locked plan dimensions as {w: E-W, h: N-S}; checked side-by-side (either orientation). */
export const expectedDimsM: Partial<Record<RoomId, { w: number; h: number; label: string }>> = {
  living: { w: ft(14), h: ftIn(16, 3), label: `14' × 16'3"` },
  kitchen: { w: ft(14), h: ftIn(11, 6), label: `14' × 11'6"` },
  kids: { w: ftIn(12, 4), h: ftIn(10, 6), label: `12'4" × 10'6"` },
  master: { w: ftIn(12, 2), h: ftIn(10, 6), label: `12'2" × 10'6"` },
  masterBath: { w: ft(8), h: ft(4), label: `8' × 4'` },
  guestBath: { w: ft(4), h: ft(7), label: `4' × 7'` },
  lift: { w: ft(5), h: ft(6), label: `5' × 6'` },
  livingBalcony: { w: ft(14), h: ftIn(4, 6), label: `4'6" deep` },
  kitchenBalcony: { w: ft(14), h: ft(4), label: `4' deep, south` },
};

export function assertPlanDims(): { id: RoomId; ok: boolean; label: string }[] {
  return (Object.keys(expectedDimsM) as RoomId[]).map((id) => {
    const r = roomById[id];
    const e = expectedDimsM[id]!;
    const ok = nearlyEqual(r.w, e.w, 0.02) && nearlyEqual(r.h, e.h, 0.02);
    return { id, ok, label: e.label };
  });
}

/** Rooms must not overlap each other (clear areas). */
export function assertNoOverlaps(): { a: RoomId; b: RoomId }[] {
  const bad: { a: RoomId; b: RoomId }[] = [];
  const eps = 1e-6;
  for (let i = 0; i < rooms.length; i++)
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      if (a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.y < b.y + b.h - eps && b.y < a.y + a.h - eps)
        bad.push({ a: a.id, b: b.id });
    }
  return bad;
}

/** Overall footprint bounds (incl. walls, balconies, stair context). */
export function planBounds(): Rect {
  const all: Rect[] = [...rooms, ...walls, ...contextAreas];
  const x0 = Math.min(...all.map((r) => r.x));
  const y0 = Math.min(...all.map((r) => r.y));
  const x1 = Math.max(...all.map((r) => r.x + r.w));
  const y1 = Math.max(...all.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export const meta = {
  project: "Ahilyanagar 2BHK — typical 1st to 3rd floor",
  style: "lighter modern",
  budgetInr: { min: 800_000, max: 1_000_000, target: 900_000 },
  household: "Family with 1 child",
  kitchenCounter: "Artificial granite ~₹110/sqft, pale",
  kitchenBalconyFacing: "south" as const,
  sourcePlan: "docs/floor-plan-source.jpg",
  notes: [
    "Upper bedroom = kids; lower = master.",
    "8'×4' bath between bedrooms attaches to master (door from master; hall door removed).",
    "4'×7' bath near kitchen = guest washroom.",
    "Wash-basin niche = storage room.",
    "Entry from common lobby (north of lift) into living NW corner, as on plan.",
  ],
};
