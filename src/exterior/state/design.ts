/**
 * Design edits as a pure reducer (testable; undo/redo in Phase 5 keeps a stack of these states).
 *
 * Rules:
 * - Switching pattern or palette keeps only LOCKED role overrides (your other custom colours follow the new palette).
 * - Locking a role freezes its current material + colour, even if you never edited it.
 * - Switching pattern resets element changes to that pattern's defaults.
 */
import type { ElementConfig } from "../model/elements";
import { MATERIALS, PATTERNS, defaultDesign, patternById, resolveRoles, type DesignState, type RoleOverride } from "../model/resolve";
import type { SurfaceRole } from "../model/types";

export type DesignAction =
  | { type: "pattern"; id: string }
  | { type: "palette"; id: string }
  | { type: "roleColor"; role: SurfaceRole; color: string }
  | { type: "roleMaterial"; role: SurfaceRole; material: string }
  | { type: "lock"; role: SurfaceRole; locked: boolean }
  | { type: "resetRole"; role: SurfaceRole }
  | { type: "resetColors" }
  | { type: "element"; id: string; patch: Partial<ElementConfig> }
  | { type: "elementParam"; id: string; key: string; value: unknown }
  | { type: "elementSlot"; id: string; slot: string; on: boolean }
  | { type: "resetElements" }
  | { type: "load"; design: DesignState };

const lockedOnly = (roles: DesignState["overrides"]["roles"]) =>
  Object.fromEntries(Object.entries(roles).filter(([, o]) => o?.locked)) as DesignState["overrides"]["roles"];

export function designReducer(d: DesignState, a: DesignAction): DesignState {
  switch (a.type) {
    case "pattern": {
      const p = patternById(a.id);
      return { ...d, name: d.name, patternId: p.id, paletteId: p.defaultPaletteId, overrides: { roles: lockedOnly(d.overrides.roles), elements: {} } };
    }
    case "palette":
      return { ...d, paletteId: a.id, overrides: { ...d.overrides, roles: lockedOnly(d.overrides.roles) } };
    case "roleColor":
    case "roleMaterial": {
      const cur: RoleOverride = d.overrides.roles[a.role] ?? {};
      const next = a.type === "roleColor" ? { ...cur, color: a.color.toUpperCase() } : MATERIALS[a.material] ? { ...cur, material: a.material } : cur;
      return { ...d, overrides: { ...d.overrides, roles: { ...d.overrides.roles, [a.role]: next } } };
    }
    case "lock": {
      const roles = { ...d.overrides.roles };
      if (a.locked) {
        const now = resolveRoles(d)[a.role];
        roles[a.role] = { material: now.material, color: now.color, ...roles[a.role], locked: true };
      } else if (roles[a.role]) roles[a.role] = { ...roles[a.role], locked: false };
      return { ...d, overrides: { ...d.overrides, roles } };
    }
    case "resetRole": {
      const roles = { ...d.overrides.roles };
      delete roles[a.role];
      return { ...d, overrides: { ...d.overrides, roles } };
    }
    case "resetColors":
      return { ...d, overrides: { ...d.overrides, roles: {} } };
    case "element": {
      const cur = d.overrides.elements[a.id] ?? {};
      return { ...d, overrides: { ...d.overrides, elements: { ...d.overrides.elements, [a.id]: { ...cur, ...a.patch } } } };
    }
    case "elementParam": {
      const cur = d.overrides.elements[a.id] ?? {};
      return { ...d, overrides: { ...d.overrides, elements: { ...d.overrides.elements, [a.id]: { ...cur, params: { ...cur.params, [a.key]: a.value } } } } };
    }
    case "elementSlot": {
      const p = patternById(d.patternId);
      const cur = d.overrides.elements[a.id] ?? {};
      const slots = new Set(cur.slots ?? p.elements[a.id]?.slots ?? []);
      if (a.on) slots.add(a.slot);
      else slots.delete(a.slot);
      return { ...d, overrides: { ...d.overrides, elements: { ...d.overrides.elements, [a.id]: { ...cur, slots: [...slots] } } } };
    }
    case "resetElements":
      return { ...d, overrides: { ...d.overrides, elements: {} } };
    case "load":
      return a.design;
  }
}

/** Colours to suggest for a role: what the patterns use for it, current pattern first. */
export function suggestedColors(d: DesignState, role: SurfaceRole, max = 10): string[] {
  const cur = patternById(d.patternId);
  const out: string[] = [];
  const add = (c?: string) => c && !out.includes(c.toUpperCase()) && out.push(c.toUpperCase());
  // the colour each palette actually gives this role (incl. fallbacks), current pattern first
  const effective = (patternId: string, paletteId: string) => resolveRoles({ patternId, paletteId, overrides: { roles: {}, elements: {} } })[role].color;
  for (const pal of cur.palettes) add(effective(cur.id, pal.id));
  for (const p of PATTERNS) if (p.id !== cur.id) for (const pal of p.palettes) add(effective(p.id, pal.id));
  return out.slice(0, max);
}

/** Which materials make sense for a role (keeps the material dropdown short and sensible). */
export function materialsForRole(role: SurfaceRole): string[] {
  const kinds: Record<string, string[]> = {
    metal: ["windowFrame", "railing", "gate"],
    glass: ["glass", "solar"],
    ground: ["ground"],
    paving: ["paving"],
  };
  const group = Object.entries(kinds).find(([, roles]) => roles.includes(role))?.[0] ?? "wall";
  return Object.entries(MATERIALS)
    .filter(([, m]) => {
      if (group === "metal") return m.kind === "metal" || m.kind === "wood";
      if (group === "glass") return m.kind === "glass";
      if (group === "ground") return m.kind === "ground";
      if (group === "paving") return ["tile", "stone", "concrete", "ground", "brick", "terracotta"].includes(m.kind);
      return !["glass", "ground", "metal"].includes(m.kind);
    })
    .map(([id]) => id);
}

export { defaultDesign };
