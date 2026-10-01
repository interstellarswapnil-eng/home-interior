import { useMemo, useState } from "react";
import { ExteriorScene, type Quality } from "./scene/ExteriorScene";
import { CAMERA_IDS, CAMERA_PRESETS, type CameraId } from "./scene/cameras";
import { PATTERNS, ROLES, defaultDesign, patternById, resolveRoles } from "./model/resolve";
import { floorName, slotById } from "./model/slots";
import { sideName } from "./model/shell";
import { SURFACE_ROLES, type Part } from "./model/types";
import { roleDebugColor } from "./scene/materials";

const params = new URLSearchParams(location.search);
const pick = <T extends string>(key: string, allowed: readonly T[], def: T): T => {
  const v = params.get(key) as T | null;
  return v && allowed.includes(v) ? v : def;
};

export function ExteriorApp() {
  const [design, setDesign] = useState(() => {
    const d = defaultDesign(params.get("pattern") ?? "architect");
    const pal = params.get("palette");
    return pal && patternById(d.patternId).palettes.some((p) => p.id === pal) ? { ...d, paletteId: pal } : d;
  });
  const [camera, setCamera] = useState<CameraId>(pick("cam", CAMERA_IDS, "corner"));
  const [nonce, setNonce] = useState(0);
  const [quality, setQuality] = useState<Quality>(pick<Quality>("quality", ["normal", "high"], "normal"));
  const [showRoles, setShowRoles] = useState(params.get("roles") === "1");
  const [panel, setPanel] = useState(params.get("panel") !== "0");
  const [picked, setPicked] = useState<Part | null>(null);
  const pattern = patternById(design.patternId);
  const roles = useMemo(() => resolveRoles(design), [design]);
  const slot = slotById(picked?.slot);

  return (
    <div className={`xapp ${panel ? "" : "nopanel"}`}>
      <header>
        <div className="title">
          <strong>Pasaydan · Exterior</strong>
          <span className="muted">Ahilyanagar · stilt + 3 floors · road on the south</span>
        </div>
        <nav className="seg">
          <button onClick={() => (location.href = "./")}>Interior</button>
          <button className="on">Exterior</button>
        </nav>
        <button onClick={() => setPanel(!panel)}>{panel ? "Hide panel" : "Show panel"}</button>
      </header>

      <main className="xview">
        <ExteriorScene design={design} camera={camera} cameraNonce={nonce} quality={quality} showRoles={showRoles} onPick={setPicked} />
        {picked && (
          <div className="pickcard">
            <strong>{ROLES[picked.role]?.label ?? picked.role}</strong>
            {slot && <div>{slot.label}</div>}
            <div className="muted small">
              {floorName(picked.floor)}
              {picked.side && ["N", "S", "E", "W"].includes(picked.side) ? ` · ${sideName(picked.side)} face` : ""}
            </div>
            <div className="small">{ROLES[picked.role]?.tip}</div>
            <div className="swatchrow">
              <span className="swatch" style={{ background: roles[picked.role].color }} />
              <span className="small">{roles[picked.role].color}</span>
            </div>
            <div className="muted tiny">{picked.id}</div>
          </div>
        )}
      </main>

      {panel && (
        <aside className="xpanel">
          <section>
            <h3>Style</h3>
            <label className="row">
              Pattern
              <select value={design.patternId} onChange={(e) => setDesign(defaultDesign(e.target.value))}>
                {PATTERNS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted small">{pattern.description}</p>
            <div className="palettes">
              {pattern.palettes.map((p) => (
                <button key={p.id} className={`palette ${design.paletteId === p.id ? "on" : ""}`} onClick={() => setDesign({ ...design, paletteId: p.id })} title={p.note}>
                  <span className="chips">
                    {(["mainWall", "secondSurface", "featureWall", "railing", "base"] as const).map((r) => (
                      <span key={r} className="swatch" style={{ background: p.roles[r]?.color ?? roles[r].color }} />
                    ))}
                  </span>
                  <span>
                    {p.name}
                    {p.recommended && <b className="star" title="Recommended"> ★</b>}
                  </span>
                </button>
              ))}
            </div>
            {pattern.palettes.find((p) => p.id === design.paletteId)?.note && (
              <p className="muted small">{pattern.palettes.find((p) => p.id === design.paletteId)?.note}</p>
            )}
            <p className="small">
              <b>Good to know:</b> {pattern.notes.climate} <span className="muted">{pattern.notes.maintenance} Cost: {pattern.notes.relativeCost}</span>
            </p>
          </section>
          <section>
            <h3>View</h3>
            <div className="btngrid">
              {CAMERA_IDS.map((c) => (
                <button
                  key={c}
                  className={camera === c ? "on" : ""}
                  onClick={() => {
                    setCamera(c);
                    setNonce((n) => n + 1);
                  }}
                >
                  {CAMERA_PRESETS[c].label}
                </button>
              ))}
            </div>
            <label className="row">
              Quality
              <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
                <option value="normal">Normal</option>
                <option value="high">High quality</option>
              </select>
            </label>
            <p className="muted small">Drag to rotate · right-drag to pan · scroll to zoom · click any surface to see what it is.</p>
          </section>
          <section>
            <h3>Check the model</h3>
            <label className="row">
              <input type="checkbox" checked={showRoles} onChange={() => setShowRoles(!showRoles)} /> Colour each surface type
            </label>
            {showRoles && (
              <ul className="legend">
                {SURFACE_ROLES.map((r) => (
                  <li key={r}>
                    <span className="swatch" style={{ background: roleDebugColor(r) }} />
                    {ROLES[r]?.label ?? r}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      )}
    </div>
  );
}
