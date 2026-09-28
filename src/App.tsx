import { useEffect, useMemo, useRef, useState } from "react";
import { Plan2D, type Layers, type Plan2DHandle } from "../components/Plan2D";
import { Scene3D, cameraLabels, type CameraId } from "../components/Scene3D";
import { BudgetPanel } from "../components/BudgetPanel";
import { Legend } from "../components/Legend";
import { ChecksPanel } from "../components/ChecksPanel";
import { ImmersiveHUD } from "../components/ImmersiveHUD";
import { immersive, setImmersive, tour, type ImmersiveMode } from "../components/immersiveStore";
import { stopRecording } from "../components/VideoRecorder";
import { meta, type RoomId } from "../plan/plan";

type View = "2d" | "3d" | "split";
type Side = "budget" | "materials" | "checks" | "none";
type WallMode = "auto" | "full" | "cut";

const params = new URLSearchParams(location.search);
const pick = <T extends string>(key: string, allowed: readonly T[], def: T): T => {
  const v = params.get(key) as T | null;
  return v && allowed.includes(v) ? v : def;
};
const cameraIds = Object.keys(cameraLabels) as CameraId[];
const roomToCamera: Partial<Record<RoomId, CameraId>> = {
  living: "living",
  kitchen: "kitchen",
  master: "master",
  masterBath: "master",
  kids: "kids",
  foyer: "foyer",
  storage: "foyer",
  guestBath: "foyer",
  kitchenBalcony: "southBalcony",
};

export function App() {
  const [view, setView] = useState<View>(pick<View>("view", ["2d", "3d", "split"], "split"));
  const [side, setSide] = useState<Side>(pick<Side>("panel", ["budget", "materials", "checks", "none"], "budget"));
  const [camera, setCamera] = useState<CameraId>(pick<CameraId>("cam", cameraIds, "overview"));
  const [wallMode, setWallMode] = useState<WallMode>(pick<WallMode>("walls", ["auto", "full", "cut"], "auto"));
  const [mode, setMode] = useState<ImmersiveMode>(pick<ImmersiveMode>("mode", ["orbit", "walk", "tour"], "orbit"));
  const [layers, setLayers] = useState<Layers>({ walls: true, furniture: true, dims: params.get("dims") !== "0", labels: true });
  const [print, setPrint] = useState(false);
  const [hover, setHover] = useState<string[] | null>(null);
  const plan = useRef<Plan2DHandle>(null);
  const highlight = useMemo(() => new Set(hover ?? []), [hover]);
  const selectedRoom = (Object.entries(roomToCamera).find(([, c]) => c === camera)?.[0] ?? null) as RoomId | null;

  // keep the immersive store in sync; leaving a mode cancels any recording
  useEffect(() => {
    if (immersive.recording) stopRecording(false);
    setImmersive({ mode, tourPlaying: false });
    if (mode === "tour") {
      const seekT = Number(params.get("tourT"));
      if (params.has("tourT") && Number.isFinite(seekT)) tour.seek(seekT);
      else tour.replay();
    }
  }, [mode]);

  const toggle = (k: keyof Layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  return (
    <div className={`app side-${side}`}>
      <header>
        <div className="title">
          <strong>2BHK Interior</strong>
          <span className="muted">
            {meta.project} · {meta.style} · {meta.household}
          </span>
        </div>
        <div className="seg">
          {(["2d", "split", "3d"] as View[]).map((v) => (
            <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
              {v === "split" ? "2D + 3D" : v.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="seg">
          {(["budget", "materials", "checks", "none"] as Side[]).map((s) => (
            <button key={s} className={side === s ? "on" : ""} onClick={() => setSide(s)}>
              {s === "none" ? "Hide panel" : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <main className={`views view-${view}`}>
        {view !== "3d" && (
          <section className="pane">
            <div className="toolbar">
              {(Object.keys(layers) as (keyof Layers)[]).map((k) => (
                <label key={k}>
                  <input type="checkbox" checked={layers[k]} onChange={() => toggle(k)} /> {k === "dims" ? "dimensions" : k}
                </label>
              ))}
              <label>
                <input type="checkbox" checked={print} onChange={() => setPrint(!print)} /> print (B/W)
              </label>
              <span className="spacer" />
              <button onClick={() => plan.current?.fit()}>Fit</button>
              <button onClick={() => plan.current?.exportSvg()}>Export SVG</button>
              <button onClick={() => plan.current?.exportPng()}>Export PNG</button>
            </div>
            <Plan2D
              ref={plan}
              layers={layers}
              print={print}
              highlight={highlight}
              selectedRoom={view === "split" ? selectedRoom : null}
              onSelectRoom={(id) => {
                const c = roomToCamera[id];
                if (c) setCamera(c);
                if (view === "2d") setView("split");
              }}
            />
            <div className="hint muted small">Scroll to zoom · drag to pan · double-click a room to jump the 3D camera there</div>
          </section>
        )}
        {view !== "2d" && (
          <section className="pane">
            <div className="toolbar">
              <div className="seg mode">
                {(["orbit", "walk", "tour"] as ImmersiveMode[]).map((m) => (
                  <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
                    {m[0].toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              {mode === "orbit" &&
                cameraIds.map((c) => (
                  <button key={c} className={camera === c ? "on" : ""} onClick={() => setCamera(c)}>
                    {cameraLabels[c]}
                  </button>
                ))}
              <span className="spacer" />
              {mode === "orbit" && (
                <select value={wallMode} onChange={(e) => setWallMode(e.target.value as WallMode)} title="Wall height">
                  <option value="auto">Walls: auto</option>
                  <option value="full">Walls: full height</option>
                  <option value="cut">Walls: cutaway</option>
                </select>
              )}
            </div>
            <div className="canvas-wrap">
              <Scene3D camera={camera} mode={mode} wallMode={wallMode} highlight={highlight} />
              <ImmersiveHUD />
            </div>
            <div className="hint muted small">
              {mode === "orbit" && "Drag to orbit · right-drag to pan · scroll to zoom · pick a room camera above"}
              {mode === "walk" && "Walk: click the view to look around · WASD / arrows move · Shift sprints · Esc releases the mouse"}
              {mode === "tour" && "Tour: ~66 s guided walkthrough · Record saves a 1280×720 video of the full tour"}
            </div>
          </section>
        )}
      </main>

      {side !== "none" && (
        <aside>
          {side === "budget" && <BudgetPanel onHover={setHover} />}
          {side === "materials" && <Legend />}
          {side === "checks" && <ChecksPanel />}
        </aside>
      )}
    </div>
  );
}
