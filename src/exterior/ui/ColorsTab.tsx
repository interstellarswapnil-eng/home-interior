import { useState } from "react";
import { MATERIALS, ROLES, resolveRoles, type DesignState } from "../model/resolve";
import type { SurfaceRole } from "../model/types";
import { materialsForRole, suggestedColors, type DesignAction } from "../state/design";
import { Tip } from "./Tip";

/** The surfaces most people change first; the rest sit under "More surfaces". */
export const MAIN_ROLES: SurfaceRole[] = ["mainWall", "secondSurface", "featureWall", "base", "windowSurround", "trim", "soffit", "railing", "windowFrame", "mainDoor", "compoundWall", "paving"];
const HIDDEN: SurfaceRole[] = ["interior", "context", "road", "joint", "neighbor", "carBody", "person"];
const MORE_ROLES = (Object.keys(ROLES) as SurfaceRole[]).filter((r) => !MAIN_ROLES.includes(r) && !HIDDEN.includes(r));

/** Editor for one surface role: colour picker, hex, suggestions, material, lock, reset. */
export function RoleEditor({ design, role, dispatch, compact }: { design: DesignState; role: SurfaceRole; dispatch: (a: DesignAction) => void; compact?: boolean }) {
  const cur = resolveRoles(design)[role];
  const ov = design.overrides.roles[role];
  const setColor = (c: string) => dispatch({ type: "roleColor", role, color: c });
  return (
    <div className="roleeditor">
      <div className="row">
        <input type="color" value={cur.color.toLowerCase()} onChange={(e) => setColor(e.target.value)} aria-label="Pick a colour" />
        <input
          key={`${role}-${cur.color}`}
          className="hex"
          defaultValue={cur.color}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            if (/^#[0-9A-Fa-f]{6}$/.test(v)) setColor(v);
          }}
          aria-label="Hex colour"
        />
        <label className="row lock" title="Keep this when switching pattern or colour set">
          <input type="checkbox" checked={!!ov?.locked} onChange={(e) => dispatch({ type: "lock", role, locked: e.target.checked })} /> 🔒 Lock
        </label>
      </div>
      <div className="suggest">
        {suggestedColors(design, role, compact ? 8 : 12).map((c) => (
          <button key={c} className={`sw ${c === cur.color.toUpperCase() ? "on" : ""}`} style={{ background: c }} title={c} onClick={() => setColor(c)} />
        ))}
      </div>
      <label className="row">
        Material
        <select value={cur.material} onChange={(e) => dispatch({ type: "roleMaterial", role, material: e.target.value })}>
          {materialsForRole(role).map((m) => (
            <option key={m} value={m}>
              {MATERIALS[m].name}
            </option>
          ))}
        </select>
      </label>
      {ov && (ov.color || ov.material) && (
        <button className="linkish" onClick={() => dispatch({ type: "resetRole", role })}>
          Back to the colour set's {ROLES[role].label.toLowerCase()}
        </button>
      )}
    </div>
  );
}

export function ColorsTab({ design, dispatch, selected, onSelect }: { design: DesignState; dispatch: (a: DesignAction) => void; selected: SurfaceRole; onSelect: (r: SurfaceRole) => void }) {
  const roles = resolveRoles(design);
  const [more, setMore] = useState(!MAIN_ROLES.includes(selected));
  const row = (r: SurfaceRole) => (
    <div key={r} className={`rolerow ${r === selected ? "on" : ""}`}>
      <button className="rolehead" onClick={() => onSelect(r)}>
        <span className="swatch big" style={{ background: roles[r].color }} />
        <span className="rolename">
          {ROLES[r].label}
          <span className="muted tiny"> {roles[r].color} · {MATERIALS[roles[r].material]?.name}</span>
        </span>
        {design.overrides.roles[r]?.locked && <span title="Locked">🔒</span>}
        {(design.overrides.roles[r]?.color || design.overrides.roles[r]?.material) && !design.overrides.roles[r]?.locked && <span className="tiny muted">edited</span>}
      </button>
      <Tip text={ROLES[r].tip} />
      {r === selected && <RoleEditor design={design} role={r} dispatch={dispatch} />}
    </div>
  );
  return (
    <section>
      <h3>Colours and materials</h3>
      <p className="muted small">Pick a surface (or click it on the building), then change its colour or material. Lock a colour to keep it when you switch pattern.</p>
      {MAIN_ROLES.map(row)}
      <button className="linkish" onClick={() => setMore(!more)}>
        {more ? "▾" : "▸"} More surfaces
      </button>
      {more && MORE_ROLES.map(row)}
      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={() => dispatch({ type: "resetColors" })}>Reset to the pattern's colours</button>
      </div>
    </section>
  );
}
