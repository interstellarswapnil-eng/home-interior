/**
 * Style resolution: pattern defaults → palette → user overrides, per surface role.
 * Locked roles keep the user's value when the pattern or palette changes.
 */
import rolesJson from "../config/roles.json";
import materialsJson from "../config/materials.json";
import defaultsJson from "../config/defaults.json";
import type { ElementConfig } from "./elements";
import { SURFACE_ROLES, type SurfaceRole } from "./types";

export type MaterialKind =
  | "paint"
  | "texturedPlaster"
  | "limewash"
  | "wood"
  | "charredWood"
  | "stone"
  | "brick"
  | "concrete"
  | "terracotta"
  | "metal"
  | "glass"
  | "tile"
  | "ground";

export type MaterialDef = {
  name: string;
  kind: MaterialKind;
  roughness: number;
  metalness?: number;
  /** Folder in public/exterior/textures with albedo / normal / rough maps (neutral grey, tinted by the colour). */
  textureSet?: string;
  realSizeMeters?: [number, number];
  /** Optional separate normal map (e.g. generated flutes) and its repeat size. */
  normalSet?: string;
  normalSizeMeters?: [number, number];
  normalScale?: number;
};

export type RoleStyle = { material: string; color: string };

export type Palette = {
  id: string;
  name: string;
  recommended?: boolean;
  note?: string;
  roles: Partial<Record<SurfaceRole, RoleStyle>>;
};

/** v2: one named move inside a concept (element id in `elements`). */
export type MoveRef = { element: string; name: string };

export type Pattern = {
  id: string;
  /** "concept" = v2 design concept (hero move + supporting moves); "style" (default) = v1 style. */
  kind?: "concept" | "style";
  hero?: MoveRef;
  supporting?: MoveRef[];
  crown?: MoveRef;
  threshold?: MoveRef;
  /** roles kept in colour in the grey + accent massing view */
  accentRoles?: SurfaceRole[];
  /** reference images from the study (1–12 = files #0–#11) */
  refs?: number[];
  /** optional bigger changes the concept switches on by default (need approval) */
  optional?: Record<string, boolean>;
  /** Position in the pattern list (optional; new patterns without it go last). */
  order?: number;
  name: string;
  description: string;
  palettes: Palette[];
  defaultPaletteId: string;
  elements: Record<string, ElementConfig>;
  notes: { climate: string; maintenance: string; relativeCost: "$" | "$$" | "$$$" };
};

export type RoleOverride = { material?: string; color?: string; locked?: boolean };

export type DesignState = {
  name: string;
  patternId: string;
  paletteId: string;
  overrides: {
    roles: Partial<Record<SurfaceRole, RoleOverride>>;
    elements: Record<string, Partial<ElementConfig>>;
  };
  /** Bigger changes that need the architect's approval (config/optional.json); off by default. */
  optional?: Record<string, boolean>;
};

export type RoleInfo = { label: string; tip: string; fallback?: SurfaceRole };

export const ROLES = rolesJson as Record<SurfaceRole, RoleInfo>;
/** Keys starting with "_" in config JSON are comments. */
const noComments = <T>(o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith("_"))) as Record<string, T>;
export const MATERIALS = noComments<MaterialDef>(materialsJson);
const DEFAULT_ROLES = defaultsJson.roles as Partial<Record<SurfaceRole, RoleStyle>>;

/** Every pattern file in config/patterns is picked up automatically. */
const patternFiles = import.meta.glob("../config/patterns/*.json", { eager: true, import: "default" }) as Record<string, Pattern>;
export const PATTERNS: Pattern[] = Object.values(patternFiles).sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
export const patternById = (id: string) => PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];

const NEUTRAL: RoleStyle = { material: "plaster", color: "#D8D2C8" };

/** role → { material, color } for a design. Missing roles follow the fallback chain in roles.json. */
export function resolveRoles(design: Pick<DesignState, "patternId" | "paletteId" | "overrides">): Record<SurfaceRole, RoleStyle> {
  const pattern = patternById(design.patternId);
  const palette = pattern.palettes.find((p) => p.id === design.paletteId) ?? pattern.palettes.find((p) => p.id === pattern.defaultPaletteId)!;
  const direct = (role: SurfaceRole): Partial<RoleStyle> | undefined => {
    const o = design.overrides.roles[role];
    const p = palette.roles[role];
    if (!o && !p) return undefined;
    return { ...p, ...(o?.material ? { material: o.material } : {}), ...(o?.color ? { color: o.color } : {}) };
  };
  const out = {} as Record<SurfaceRole, RoleStyle>;
  // palette/override value first; anything missing comes from defaults.json, then the role's fallback chain
  const resolve = (role: SurfaceRole, depth = 0): RoleStyle => {
    if (out[role]) return out[role];
    const d = direct(role);
    const fb = ROLES[role]?.fallback;
    const base = DEFAULT_ROLES[role] ?? (fb && depth < 8 ? resolve(fb, depth + 1) : NEUTRAL);
    return (out[role] = { material: d?.material ?? base.material, color: d?.color ?? base.color });
  };
  for (const r of SURFACE_ROLES) resolve(r);
  return out;
}

/** Pattern elements merged with the user's element overrides. */
export function resolveElements(design: Pick<DesignState, "patternId" | "overrides">): Record<string, ElementConfig> {
  const pattern = patternById(design.patternId);
  const out: Record<string, ElementConfig> = {};
  for (const id of new Set([...Object.keys(pattern.elements), ...Object.keys(design.overrides.elements)])) {
    const base = pattern.elements[id] ?? { enabled: false };
    const o = design.overrides.elements[id] ?? {};
    out[id] = { enabled: o.enabled ?? base.enabled, slots: o.slots ?? base.slots, params: { ...base.params, ...o.params } };
  }
  return out;
}

export function defaultDesign(patternId = "architect"): DesignState {
  const p = patternById(patternId);
  return { name: p.name, patternId: p.id, paletteId: p.defaultPaletteId, overrides: { roles: {}, elements: {} }, ...(p.optional ? { optional: { ...p.optional } } : {}) };
}
