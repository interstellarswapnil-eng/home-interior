import { useEffect, useReducer, useState } from "react";
import { ExteriorScene, type PhotoRequest, type Quality, type ViewState } from "./scene/ExteriorScene";
import { CAMERA_IDS, CAMERA_PRESETS, type CameraId } from "./scene/cameras";
import { PATTERNS, defaultDesign, patternById } from "./model/resolve";
import type { Part, SurfaceRole } from "./model/types";
import { designReducer } from "./state/design";
import { StyleTab } from "./ui/StyleTab";
import { ColorsTab } from "./ui/ColorsTab";
import { ElementsTab } from "./ui/ElementsTab";
import { ViewTab } from "./ui/ViewTab";
import { PickCard } from "./ui/PickCard";
import { PaintStrip } from "./ui/PaintStrip";
import { bakeThumbnails, cachedThumb } from "./ui/thumbnails";

const params = new URLSearchParams(location.search);
const pick = <T extends string>(key: string, allowed: readonly T[], def: T): T => {
  const v = params.get(key) as T | null;
  return v && allowed.includes(v) ? v : def;
};
const TABS = ["style", "colors", "elements", "view", "compare", "save"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { style: "Style", colors: "Colors", elements: "Elements", view: "View", compare: "Compare", save: "Save & export" };
const LATER: Tab[] = ["compare", "save"];

function initialDesign() {
  let d = defaultDesign(params.get("pattern") ?? "architect");
  const pal = params.get("palette");
  if (pal && patternById(d.patternId).palettes.some((p) => p.id === pal)) d = { ...d, paletteId: pal };
  // scripts: ?on=solar,pergola switches elements on
  for (const id of params.get("on")?.split(",").filter(Boolean) ?? []) d = designReducer(d, { type: "element", id, patch: { enabled: true } });
  return d;
}

export function ExteriorApp() {
  const [design, dispatch] = useReducer(designReducer, undefined, initialDesign);
  const [camera, setCamera] = useState<CameraId>(pick("cam", CAMERA_IDS, "photo"));
  const [nonce, setNonce] = useState(0);
  const [quality, setQuality] = useState<Quality>(pick<Quality>("quality", ["normal", "high"], "normal"));
  const [photo, setPhoto] = useState<PhotoRequest>(null);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [view, setViewState] = useState<ViewState>({
    mode: pick("mode", ["orbit", "walk"], "orbit"),
    autoRotate: params.get("spin") === "1",
    sky: pick("sky", ["clear", "overcast", "night"], "clear"),
    hour: Number(params.get("hour") ?? 16),
    date: params.get("date") ?? new Date().toISOString().slice(0, 10),
    context: { neighbours: params.get("nb") === "1", car: params.get("ctx") !== "0", person: params.get("ctx") !== "0" },
  });
  const [showRoles, setShowRoles] = useState(params.get("roles") === "1");
  const [panel, setPanel] = useState(params.get("panel") !== "0");
  const [tab, setTab] = useState<Tab>(pick("tab", TABS, "style"));
  const [picked, setPicked] = useState<Part | null>(null);
  const [role, setRole] = useState<SurfaceRole>("mainWall");
  const [focusElement, setFocusElement] = useState<string | undefined>();
  const [thumbs, setThumbs] = useState<Record<string, string>>(() => Object.fromEntries(PATTERNS.map((p) => [p.id, cachedThumb(p) ?? ""]).filter(([, u]) => u)));
  const pattern = patternById(design.patternId);

  const setView = (v: Partial<ViewState>) => setViewState((s) => ({ ...s, ...v }));
  const goCamera = (c: CameraId) => {
    setView({ mode: "orbit" });
    setCamera(c);
    setNonce((n) => n + 1);
  };
  const selectRole = (r: SurfaceRole) => {
    setRole(r);
    setTab("colors");
    setPanel(true);
  };
  const takePhoto = (samples: number) => {
    setView({ autoRotate: false, mode: "orbit" });
    setPicked(null);
    setPhotoProgress(0);
    setPhoto({ id: Date.now(), samples });
  };
  const openElement = (id: string) => {
    setFocusElement(id);
    setTab("elements");
    setPanel(true);
  };

  // scripts: ?photo=64 renders a photo-quality still as soon as the view is ready
  useEffect(() => {
    const n = Number(params.get("photo"));
    if (!n) return;
    const t = setInterval(() => {
      if (!(window as unknown as { __extReady?: boolean }).__extReady) return;
      clearInterval(t);
      takePhoto(n);
    }, 300);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pattern thumbnails: baked once from the real model after the main view is ready, then cached.
  useEffect(() => {
    if (params.get("thumbs") === "0") return;
    let stop = false;
    const t = setInterval(() => {
      if (!(window as unknown as { __extReady?: boolean }).__extReady) return;
      clearInterval(t);
      if (!stop) void bakeThumbnails(PATTERNS, (id, url) => setThumbs((s) => ({ ...s, [id]: url })));
    }, 500);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className={`xapp ${panel ? "" : "nopanel"}`}>
      <header>
        <div className="title">
          <strong>Pasaydan · Exterior</strong>
          <span className="muted">
            {pattern.name} · {pattern.palettes.find((p) => p.id === design.paletteId)?.name}
          </span>
        </div>
        <nav className="seg">
          <button onClick={() => (location.href = "./")}>Interior</button>
          <button className="on">Exterior</button>
        </nav>
        <button onClick={() => setPanel(!panel)}>{panel ? "Hide panel" : "Show panel"}</button>
      </header>

      <main className="xview">
        <ExteriorScene
          design={design}
          camera={camera}
          cameraNonce={nonce}
          quality={quality}
          view={view}
          showRoles={showRoles}
          onPick={(p) => setPicked(p)}
          instantCamera={params.get("instant") === "1"}
          photo={photo}
          onPhotoProgress={setPhotoProgress}
          onPhotoDone={(url) => {
            setPhoto(null);
            setPhotoUrl(url ?? "error");
          }}
        />
        {photo && (
          <div className="photoprogress">
            Rendering a photo-quality still… {Math.round(photoProgress * 100)}%
            <div className="bar">
              <span style={{ width: `${photoProgress * 100}%` }} />
            </div>
            <button onClick={() => setPhoto(null)}>Cancel</button>
          </div>
        )}
        {photoUrl && (
          <div className="photomodal" onClick={() => setPhotoUrl(null)}>
            <div className="photobox" onClick={(e) => e.stopPropagation()}>
              {photoUrl === "error" ? (
                <p>The photo renderer could not start on this device. Use High quality instead.</p>
              ) : (
                <img src={photoUrl} alt="Photo-quality still" />
              )}
              <div className="row between">
                {photoUrl !== "error" && (
                  <a className="btn" href={photoUrl} download={`pasaydan-${design.patternId}-${design.paletteId}-photo.png`}>
                    Download PNG
                  </a>
                )}
                <button onClick={() => setPhotoUrl(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
        <PaintStrip design={design} onSelect={selectRole} />
        <div className="quickbar">
          <select
            value={view.mode === "walk" ? "walk" : camera}
            onChange={(e) => (e.target.value === "walk" ? setView({ mode: "walk", autoRotate: false }) : goCamera(e.target.value as CameraId))}
            aria-label="View"
          >
            {CAMERA_IDS.map((c) => (
              <option key={c} value={c}>
                {CAMERA_PRESETS[c].label}
              </option>
            ))}
            <option value="walk">Walk around…</option>
          </select>
          <div className="seg">
            {(["clear", "overcast", "night"] as const).map((s) => (
              <button key={s} className={view.sky === s ? "on" : ""} onClick={() => setView({ sky: s })}>
                {s === "clear" ? "Sunny" : s === "overcast" ? "Cloudy" : "Night"}
              </button>
            ))}
          </div>
          <button className={view.autoRotate ? "on" : ""} onClick={() => setView({ autoRotate: !view.autoRotate, mode: "orbit" })} title="Turntable">
            ⟳ Turntable
          </button>
        </div>
        {view.mode === "walk" && (
          <button id="walk-start" className="walkhint">
            Click here to walk · W A S D to move · mouse to look · Esc to stop
          </button>
        )}
        {picked && view.mode === "orbit" && <PickCard part={picked} design={design} dispatch={dispatch} onClose={() => setPicked(null)} openElement={openElement} />}
      </main>

      {panel && (
        <aside className="xpanel">
          <nav className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={tab === t ? "on" : ""}
                disabled={LATER.includes(t)}
                title={LATER.includes(t) ? "Coming in Phase 5" : undefined}
                onClick={() => setTab(t)}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
          </nav>
          {tab === "style" && <StyleTab design={design} dispatch={dispatch} thumbs={thumbs} />}
          {tab === "colors" && <ColorsTab design={design} dispatch={dispatch} selected={role} onSelect={setRole} />}
          {tab === "elements" && <ElementsTab key={focusElement} design={design} dispatch={dispatch} focus={focusElement} />}
          {tab === "view" && (
            <ViewTab
              view={view}
              setView={setView}
              camera={camera}
              goCamera={goCamera}
              quality={quality}
              setQuality={setQuality}
              showRoles={showRoles}
              setShowRoles={setShowRoles}
              takePhoto={takePhoto}
              photoBusy={!!photo}
            />
          )}
        </aside>
      )}
    </div>
  );
}
