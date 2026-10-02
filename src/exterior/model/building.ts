/**
 * Building facts for the exterior (see docs/exterior/BUILDING_FACTS.md).
 * The floor plan itself is read from the interior module's plan/plan.ts (read-only).
 */
import { CEILING_M, planBounds, roomById, stairContext, WALL } from "../../../plan/plan";

export const LOCATION = { name: "Ahilyanagar", lat: 19.09, lon: 74.74 } as const;
/** Road side / front of the building (confirmed: south). */
export const FRONT: "S" = "S";

/** Ground (stilt) floor level above the road. [assumed] */
export const PLINTH = 0.45;
/** Plot paving level inside the compound (road = 0). [assumed] */
export const PAVING = 0.3;
/** Stilt (parking) floor-to-floor. [assumed] */
export const STILT_FTF = 3.0;
/** Depth of the band (beam + slab) between the stilt and the 1st floor. [render] */
export const STILT_BAND = 0.45;
/** Residential floor to floor: 10' clear ceiling (plan) + 150 mm slab. */
export const SLAB = 0.15;
export const FLOOR_FTF = CEILING_M + SLAB;
export const FLATS = 3;
export const PARAPET_H = 1.05;
/** Stair head room / lift machine room above the terrace. [assumed] */
export const HEADROOM_H = 3.0;
export const EXT_WALL = WALL.exterior;

/** Finished floor level of floor n (0 = stilt, 1..3 = flats, 4 = terrace). */
export const level = (n: number) => (n === 0 ? PLINTH : PLINTH + STILT_FTF + (n - 1) * FLOOR_FTF);
export const TERRACE = level(FLATS + 1);
export const TOP = TERRACE + HEADROOM_H;

// ---------------------------------------------------------------------------
// Footprint, derived from plan.ts (outer faces of the exterior walls)
// ---------------------------------------------------------------------------
const E = WALL.exterior;
const master = roomById.master;
const kitchen = roomById.kitchen;
const living = roomById.living;
const lift = roomById.lift;
const balS = roomById.kitchenBalcony;
const balN = roomById.livingBalcony;

export const X_W = -E; // west outer face
export const X_E = kitchen.x + kitchen.w + E; // east outer face
export const Y_S_MASTER = -E; // master south outer face
export const X_NOTCH_W = master.x + master.w + E; // east face of the master wall (notch west side)
export const Y_NOTCH = kitchen.y - E; // south outer face behind the notch / balcony
export const X_WING = balS.x - WALL.interior; // west edge of the balcony wing (balcony parapet)
export const Y_LIVING_N = living.y + living.h + E; // living north outer face
export const Y_STAIR_N = stairContext.y + stairContext.h + E; // stair / lobby north outer face
export const X_CORE_E = living.x; // east face of the stair / lobby / lift core
export const Y_TOWER_S = stairContext.y - E; // south face of the stair tower (kids north wall)
export const LIFT_BOX = { x: lift.x - WALL.shaft, y: lift.y - WALL.shaft, x1: X_CORE_E, y1: Y_TOWER_S };

/** Balcony slabs (outer edges incl. parapet). */
export const BALCONY = {
  S: { x: X_WING, y: balS.y - WALL.interior, x1: X_E, y1: Y_NOTCH },
  N: { x: X_WING, y: Y_LIVING_N, x1: X_E, y1: balN.y + balN.h + WALL.interior },
};

/** Building outline at flat level, without balconies (counter-clockwise, plan coords). */
export const OUTLINE: [number, number][] = [
  [X_W, Y_S_MASTER],
  [X_NOTCH_W, Y_S_MASTER],
  [X_NOTCH_W, Y_NOTCH],
  [X_E, Y_NOTCH],
  [X_E, Y_LIVING_N],
  [X_CORE_E, Y_LIVING_N],
  [X_CORE_E, Y_STAIR_N],
  [X_W, Y_STAIR_N],
];

/** Roof outline: the building plus the roofs over both balcony stacks. */
export const ROOF_OUTLINE: [number, number][] = [
  [X_W, Y_S_MASTER],
  [X_NOTCH_W, Y_S_MASTER],
  [X_NOTCH_W, Y_NOTCH],
  [X_WING, Y_NOTCH],
  [X_WING, BALCONY.S.y],
  [X_E, BALCONY.S.y],
  [X_E, BALCONY.N.y1],
  [X_WING, BALCONY.N.y1],
  [X_WING, Y_STAIR_N],
  [X_W, Y_STAIR_N],
];

/** Stair + lobby + lift core: enclosed at ground, rises above the terrace. */
export const CORE_OUTLINE: [number, number][] = [
  [X_W, Y_TOWER_S],
  [LIFT_BOX.x, Y_TOWER_S],
  [LIFT_BOX.x, LIFT_BOX.y],
  [X_CORE_E, LIFT_BOX.y],
  [X_CORE_E, Y_STAIR_N],
  [X_W, Y_STAIR_N],
];

// ---------------------------------------------------------------------------
// Plot: 2 gunthas, rectangle [assumed shape]
// ---------------------------------------------------------------------------
export const GUNTHA_M2 = 101.17;
export const PLOT_AREA = 2 * GUNTHA_M2;
export const PLOT_W = 13.0;
const SIDE_MARGIN = (PLOT_W - (X_E - X_W)) / 2;
const REAR_MARGIN = 1.4;
export const PLOT = (() => {
  const x0 = X_W - SIDE_MARGIN;
  const x1 = x0 + PLOT_W;
  const y1 = BALCONY.N.y1 + REAR_MARGIN;
  const y0 = y1 - PLOT_AREA / PLOT_W;
  return { x0, x1, y0, y1 };
})();

export const BOUNDS = (() => {
  const b = planBounds();
  return { ...b, z0: 0, z1: TOP };
})();

/** Building centre (plan) and a mid height — camera targets. */
export const CENTER = { x: (X_W + X_E) / 2, y: (BALCONY.S.y + BALCONY.N.y1) / 2, z: TERRACE / 2 };

/**
 * Roads: the main road on the south (front) and a side road on the west (the windows side), so the plot is a
 * corner plot. Each road is 7.5 m wide with a 2 m footpath along the plot. [side road: user, 2026-10-02; widths assumed]
 */
export const ROAD_W = 7.5;
export const FOOTPATH_W = 2.0;
export const SOUTH_FOOTPATH = { y0: PLOT.y0 - FOOTPATH_W, y1: PLOT.y0 };
export const SOUTH_ROAD = { y0: SOUTH_FOOTPATH.y0 - ROAD_W, y1: SOUTH_FOOTPATH.y0 };
export const WEST_FOOTPATH = { x0: PLOT.x0 - FOOTPATH_W, x1: PLOT.x0 };
export const WEST_ROAD = { x0: WEST_FOOTPATH.x0 - ROAD_W, x1: WEST_FOOTPATH.x0 };

export const COMPOUND_H = 1.5;
/** Gates on the south compound wall (along plan x). [assumed] */
export const GATES = {
  vehicle: { a: X_WING + 0.4, b: X_WING + 0.4 + 3.6 },
  pedestrian: { a: X_NOTCH_W - 0.2, b: X_NOTCH_W + 0.8 },
};
