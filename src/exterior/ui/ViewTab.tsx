import { LOCATION } from "../model/building";
import { ROLES } from "../model/resolve";
import { SURFACE_ROLES } from "../model/types";
import { CAMERA_IDS, CAMERA_PRESETS, type CameraId } from "../scene/cameras";
import type { Quality, Sky, ViewState } from "../scene/ExteriorScene";
import { roleDebugColor } from "../scene/materials";
import { dayOfYear, formatHour, sunTimes } from "../sun";
import { Tip } from "./Tip";

const SEASONS: { label: string; date: string }[] = [
  { label: "Summer (May)", date: "2026-05-15" },
  { label: "Monsoon (Aug)", date: "2026-08-01" },
  { label: "Diwali (Nov)", date: "2026-11-08" },
  { label: "Winter (Dec)", date: "2026-12-21" },
];

export type ViewTabProps = {
  view: ViewState;
  setView: (v: Partial<ViewState>) => void;
  camera: CameraId;
  goCamera: (c: CameraId) => void;
  quality: Quality;
  setQuality: (q: Quality) => void;
  showRoles: boolean;
  setShowRoles: (b: boolean) => void;
};

export function ViewTab({ view, setView, camera, goCamera, quality, setQuality, showRoles, setShowRoles }: ViewTabProps) {
  const { sunrise, sunset } = sunTimes(LOCATION.lat, LOCATION.lon, dayOfYear(view.date));
  return (
    <>
      <section>
        <h3>Look from</h3>
        <div className="seg wide">
          <button className={view.mode === "orbit" ? "on" : ""} onClick={() => setView({ mode: "orbit" })}>
            Rotate around
          </button>
          <button className={view.mode === "walk" ? "on" : ""} onClick={() => setView({ mode: "walk", autoRotate: false })}>
            Walk around
          </button>
        </div>
        {view.mode === "orbit" ? (
          <>
            <div className="btngrid">
              {CAMERA_IDS.map((c) => (
                <button key={c} className={camera === c ? "on" : ""} onClick={() => goCamera(c)}>
                  {CAMERA_PRESETS[c].label}
                </button>
              ))}
            </div>
            <label className="row">
              <input type="checkbox" checked={view.autoRotate} onChange={(e) => setView({ autoRotate: e.target.checked })} /> Turntable (slowly turn around the building)
            </label>
            <p className="muted small">Drag to rotate · right-drag to pan · scroll to zoom · click a surface to edit it.</p>
          </>
        ) : (
          <p className="small">
            Click the view to start, then use <b>W A S D</b> or the arrow keys to walk and the mouse to look. <b>Shift</b> walks faster, <b>Esc</b> frees the mouse. You start on the footpath; the
            pedestrian gate is open.
          </p>
        )}
      </section>
      <section>
        <h3>Light</h3>
        <div className="seg wide">
          {(["clear", "overcast", "night"] as Sky[]).map((s) => (
            <button key={s} className={view.sky === s ? "on" : ""} onClick={() => setView({ sky: s })}>
              {s === "clear" ? "Sunny" : s === "overcast" ? "Cloudy" : "Night"}
            </button>
          ))}
        </div>
        {view.sky === "overcast" && <p className="muted small">Soft, even light: the best way to judge colours.</p>}
        {view.sky === "clear" && (
          <>
            <label className="row slider">
              <span>Time</span>
              <input type="range" min={sunrise + 0.1} max={sunset - 0.1} step={0.05} value={Math.min(sunset - 0.1, Math.max(sunrise + 0.1, view.hour))} onChange={(e) => setView({ hour: Number(e.target.value) })} />
              <span className="num">{formatHour(view.hour)}</span>
            </label>
            <div className="muted tiny">
              Sunrise {formatHour(sunrise)} · sunset {formatHour(sunset)} in Ahilyanagar. The road side faces south.
            </div>
            <label className="row">
              Date
              <input type="date" value={view.date} onChange={(e) => e.target.value && setView({ date: e.target.value })} />
            </label>
            <div className="seg wrap">
              {SEASONS.map((s) => (
                <button key={s.date} className={view.date === s.date ? "on" : ""} onClick={() => setView({ date: s.date })}>
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
        <label className="row">
          Quality
          <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)}>
            <option value="normal">Normal (smooth)</option>
            <option value="high">High quality (for screenshots)</option>
          </select>
        </label>
      </section>
      <section>
        <h3>
          Check the model <Tip text="Paints every type of surface in its own colour, so you can see what each part of the building is. Click any surface for its name." />
        </h3>
        <label className="row">
          <input type="checkbox" checked={showRoles} onChange={() => setShowRoles(!showRoles)} /> Colour each surface type
        </label>
        {showRoles && (
          <ul className="legend">
            {SURFACE_ROLES.filter((r) => r !== "interior" && r !== "context" && r !== "road").map((r) => (
              <li key={r}>
                <span className="swatch" style={{ background: roleDebugColor(r) }} />
                {ROLES[r]?.label ?? r}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
