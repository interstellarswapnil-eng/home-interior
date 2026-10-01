/**
 * Exterior model types. Plan coordinates are shared with the interior module (plan/plan.ts):
 * metres, origin = SW inside corner of the master bedroom, +x east, +y north, z = height above road.
 */

export const SURFACE_ROLES = [
  "mainWall",
  "secondSurface",
  "featureWall",
  "base",
  "roofEdge",
  "trim",
  "soffit",
  "column",
  "balconyFront",
  "sill",
  "windowFrame",
  "windowSurround",
  "glass",
  "railing",
  "door",
  "mainDoor",
  "fins",
  "planter",
  "greenery",
  "compoundWall",
  "gate",
  "paving",
  "ground",
  "interior",
  "context",
  "road",
] as const;
export type SurfaceRole = (typeof SURFACE_ROLES)[number];

export type Side = "N" | "S" | "E" | "W" | "roof" | "under";

/** Axis-aligned box: plan footprint (x, y, w along x, h along y) + height band z0..z1. */
export type Box = { x: number; y: number; w: number; h: number; z0: number; z1: number };

type PartBase = {
  /** Unique, stable id, e.g. "F2-wall-ext-w-3", "F1-win-kids-w-glass". */
  id: string;
  role: SurfaceRole;
  /** Slot the part belongs to (elements and click-to-edit use it). */
  slot?: string;
  /** 0 = ground/stilt, 1..3 = flats, 4 = terrace / roof level, -1 = site. */
  floor: number;
  side?: Side;
  /** Element that generated it (undefined = building shell). */
  element?: string;
};

export type BoxPart = PartBase & { kind: "box"; box: Box };

/**
 * A 2D profile in a vertical plane, extruded horizontally.
 * axis "x": profile u runs along plan x, plane spans plan y = at .. at + thickness.
 * axis "y": profile u runs along plan y, plane spans plan x = at .. at + thickness.
 */
export type PrismPart = PartBase & {
  kind: "prism";
  profile: [number, number][];
  axis: "x" | "y";
  at: number;
  thickness: number;
};

/** Flat text plate on a wall (the building name). */
export type LabelPart = PartBase & {
  kind: "label";
  text: string;
  /** Centre in plan coords + height; normal = side. */
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
};

export type Part = BoxPart | PrismPart | LabelPart;

/** A window or door on the facade, one per floor (id prefixed "F<n>-"). */
export type FacadeOpening = {
  id: string;
  planId: string;
  floor: number;
  type: "window" | "door" | "doubleDoor";
  side: "N" | "S" | "E" | "W";
  /** Along-wall extent (plan x for N/S walls, plan y for E/W walls). */
  a: number;
  b: number;
  /** Absolute heights (m above road). */
  z0: number;
  z1: number;
  /** Outer face of the host wall (plan y for N/S, plan x for E/W) and wall thickness. */
  face: number;
  depth: number;
  label: string;
};

/** A named place where elements can go. */
export type Slot = {
  id: string;
  label: string;
  side: Side;
  kind: "window" | "wall" | "balcony" | "edge" | "site" | "entrance";
  /** Floors the slot exists on. */
  floors: number[];
  /** For window slots: the plan opening id. */
  openingPlanId?: string;
};
