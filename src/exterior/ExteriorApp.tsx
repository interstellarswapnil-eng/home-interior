import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ExteriorScene, type PhotoRequest, type Quality, type SceneApi, type ViewState } from "./scene/ExteriorScene";
import { CAMERA_IDS, CAMERA_PRESETS, EXPORT_VIEWS, type CameraId } from "./scene/cameras";
import { PATTERNS, defaultDesign, patternById } from "./model/resolve";
import { approvalFlags, qualityGate } from "./model/approval";
import { fixtureSummary, fixturesFromParts, lightingScheduleCsv } from "./model/fixtures";
import { designParts } from "./scene/ExteriorScene";
import type { Part, SurfaceRole } from "./model/types";
import { designReducer, type DesignAction } from "./state/design";
import { historyReducer, initHistory } from "./state/history";
import { designToJson, download, type SavedView } from "./state/saves";
import { CompareTab, designB, type CompareState } from "./ui/CompareTab";
import { SaveTab } from "./ui/SaveTab";
import { dataUrlToBytes, makeZip } from "./export/zip";
import { designSheetHtml } from "./export/sheet";
import { StyleTab } from "./ui/StyleTab";
import { SitePhotoOverlay, SitePhotoPanel, type SitePhoto } from "./ui/SitePhoto";
import { ColorsTab } from "./ui/ColorsTab";
import { ElementsTab } from "./ui/ElementsTab";
import { ViewTab } from "./ui/ViewTab";
import { PickCard } from "./ui/PickCard";
import { PaintStrip } from "./ui/PaintStrip";
import { LightPresetButtons } from "./ui/LightPresets";
import { bakeThumbnails, cachedThumb } from "./ui/thumbnails";

const params = new URLSearchParams(location.search);
const pick = <T extends string>(key: string, allowed: readonly T[], def: T): T => {
  const v = params.get(key) as T | null;
  return v && allowed.includes(v) ? v : def;
};
/** scripts: ?ui=0 hides the overlays on the 3D view (clean renders) */
const hideUi = params.get("ui") === "0";
const TABS = ["style", "colors", "elements", "view", "compare", "save"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { style: "Style", colors: "Colors", elements: "Elements", view: "View", compare: "Compare", save: "Save & export" };

function initialDesign() {
  let d = defaultDesign(params.get("pattern") ?? "architect");
  const pal = params.get("palette");
  if (pal && patternById(d.patternId).palettes.some((p) => p.id === pal)) d = { ...d, paletteId: pal };
  // scripts: ?on=solar,pergola switches elements on
  for (const id of params.get("on")?.split(",").filter(Boolean) ?? []) d = designReducer(d, { type: "element", id, patch: { enabled: true } });
  // scripts: ?opt=widerBedroomWindows,masterRoadWindow switches optional changes on
  for (const id of params.get("opt")?.split(",").filter(Boolean) ?? []) d = designReducer(d, { type: "optional", id, on: true });
  return d;
}

// scripts: flags and quality gate for any pattern, computed with the same code as the app
(window as unknown as { __extV2?: unknown }).__extV2 = {
  report: (id: string) => {
    const d = defaultDesign(id);
    const parts = designParts(d);
    const p = patternById(id);
    return { name: p.name, description: p.description, hero: p.hero, supporting: p.supporting, crown: p.crown, threshold: p.threshold, refs: p.refs, flags: approvalFlags(d, parts), gate: qualityGate(d, parts) };
  },
  concepts: () => PATTERNS.filter((p) => p.kind === "concept").map((p) => p.id),
};

export function ExteriorApp() {
  const [hist, dispatchH] = useReducer(historyReducer, undefined, () => initHistory(initialDesign()));
  const design = hist.present;
  const dispatch = useCallback((a: DesignAction) => dispatchH(a), []);
  const undo = () => dispatchH({ type: "undo" });
  const redo = () => dispatchH({ type: "redo" });
  const [cmp, setCmpState] = useState<CompareState>({ mode: "side", bId: "pattern:architect", showB: false });
  const setCmp = (c: Partial<CompareState>) => setCmpState((x) => ({ ...x, ...c }));
  const api = useRef<SceneApi | null>(null);
  const onApi = useCallback((a: SceneApi) => (api.current = a), []);
  // compare with a site photo (kept in memory only)
  const [sitePhoto, setSitePhoto] = useState<SitePhoto | null>(null);
  const [fov, setFovState] = useState(50);
  const setFov = (f: number) => {
    setFovState(f);
    api.current?.setFov(f);
  };
  const [busy, setBusy] = useState<string | null>(null);
  const [camera, setCamera] = useState<CameraId>(pick("cam", CAMERA_IDS, "photo"));
  const [nonce, setNonce] = useState(0);
  const [quality, setQuality] = useState<Quality>(pick<Quality>("quality", ["normal", "high"], "normal"));
  const [photo, setPhoto] = useState<PhotoRequest>(null);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [view, setViewState] = useState<ViewState>({
    mode: pick("mode", ["orbit", "walk"], "orbit"),
    autoRotate: params.get("spin") === "1",
    // v2: concepts are reviewed at dusk with the facade lights on
    sky: pick("sky", ["clear", "overcast", "dusk", "night"], "dusk"),
    hour: Number(params.get("hour") ?? 16),
    date: params.get("date") ?? new Date().toISOString().slice(0, 10),
    context: { neighbours: params.get("nb") === "1", car: params.get("ctx") !== "0", person: params.get("ctx") !== "0" },
    look: pick<"full" | "grey" | "massing">("look", ["full", "grey", "massing"], "full"),
  });
  const [showRoles, setShowRoles] = useState(params.get("roles") === "1");
  const [panel, setPanel] = useState(params.get("panel") !== "0");
  const [tab, setTab] = useState<Tab>(pick("tab", TABS, "style"));
  const [picked, setPicked] = useState<Part | null>(null);
  const [role, setRole] = useState<SurfaceRole>("mainWall");
  const [focusElement, setFocusElement] = useState<string | undefined>();
  const [thumbs, setThumbs] = useState<Record<string, string>>(() => Object.fromEntries(PATTERNS.map((p) => [p.id, cachedThumb(p) ?? ""]).filter(([, u]) => u)));
  const pattern = patternById(design.patternId);
  const inCompare = tab === "compare";
  const sideBySide = inCompare && cmp.mode === "side" && view.mode === "orbit";
  const flipB = inCompare && cmp.mode === "flip" && cmp.showB;
  const bDesign = designB(cmp.bId);
  const bLabel = `${patternById(bDesign.patternId).name} · ${patternById(bDesign.patternId).palettes.find((p) => p.id === bDesign.paletteId)?.name ?? ""}`;

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
  const savedView = (): SavedView => ({ camera, sky: view.sky, hour: view.hour, date: view.date });
  const loadDesign = ({ design: d, view: v }: { design: typeof design; view?: SavedView }) => {
    dispatch({ type: "load", design: d });
    if (v) {
      setView({ ...(v.sky ? { sky: v.sky as ViewState["sky"] } : {}), ...(v.hour ? { hour: v.hour } : {}), ...(v.date ? { date: v.date } : {}) });
      if (v.camera && v.camera in CAMERA_PRESETS) goCamera(v.camera as CameraId);
    }
  };
  const fileBase = () => `pasaydan-${(design.name || design.patternId).replace(/[^\w-]+/g, "-").toLowerCase()}`;
  const jobs = {
    busy,
    screenshot: async (scale: number) => {
      if (!api.current) return;
      setBusy("Rendering the screenshot…");
      try {
        download(`${fileBase()}-${camera}.png`, await api.current.capture(scale));
      } finally {
        setBusy(null);
      }
    },
    allViews: async () => {
      if (!api.current) return;
      setBusy(`Rendering view 1 of ${EXPORT_VIEWS.length}…`);
      try {
        const shots = await api.current.captureViews(EXPORT_VIEWS, 2, "image/png", (i) => setBusy(`Rendering view ${Math.min(i + 1, EXPORT_VIEWS.length)} of ${EXPORT_VIEWS.length}…`));
        const files = shots.map((sh, i) => ({ name: `${String(i + 1).padStart(2, "0")}-${sh.id}.png`, data: dataUrlToBytes(sh.url) }));
        files.push({ name: "design.pasaydan.json", data: new TextEncoder().encode(designToJson(design, savedView())) });
        download(`${fileBase()}-all-views.zip`, makeZip(files), "application/zip");
      } finally {
        setBusy(null);
      }
    },
    lighting: async () => lightingSchedule(),
    sheet: async () => {
      if (!api.current) return;
      setBusy("Preparing the design sheet…");
      try {
        const ids: CameraId[] = ["photo", "front", "cornerSW", "cornerSE", "left", "right", "bird", "street"];
        const shots = await api.current.captureViews(ids, 1.5, "image/jpeg", (i) => setBusy(`Preparing the design sheet: view ${i} of ${ids.length}…`));
        const html = designSheetHtml(
          design,
          shots.map((sh) => ({ label: CAMERA_PRESETS[sh.id].label, url: sh.url })),
          { flags: approvalFlags(design, designParts(design)), lights: fixtureSummary(fixturesFromParts(designParts(design))), date: new Date().toLocaleDateString(), viewNote: `Light: ${view.sky === "clear" ? `sunny, ${view.date}, ${view.hour.toFixed(1)} h` : view.sky === "dusk" ? "dusk, facade lights on" : view.sky}.` },
        );
        download(`${fileBase()}-design-sheet.html`, html, "text/html");
      } finally {
        setBusy(null);
      }
    },
  };
  const lightingSchedule = () => {
    const pat = patternById(design.patternId);
    const named = [pat.hero, ...(pat.supporting ?? []), pat.crown, pat.threshold];
    const label = (el: string) => named.find((m) => m?.element === el)?.name ?? (el === "lighting" ? "Facade lighting" : el === "nameSign" ? "Nameplate" : el === "context" ? "Street" : el);
    download(`${fileBase()}-lighting-schedule.csv`, lightingScheduleCsv(fixturesFromParts(designParts(design)), label), "text/csv");
  };
  const openElement = (id: string) => {
    setFocusElement(id);
    setTab("elements");
    setPanel(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatchH({ type: e.shiftKey ? "redo" : "undo" });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        dispatchH({ type: "redo" });
      } else if (e.code === "Space" && tab === "compare" && cmp.mode === "flip") {
        e.preventDefault();
        setCmpState((x) => ({ ...x, showB: !x.showB }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, cmp.mode]);

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

      <main className={`xview ${sideBySide ? "split" : ""}`}>
        <div className="scenepane">
        <ExteriorScene
          design={flipB ? bDesign : design}
          camera={camera}
          cameraNonce={nonce}
          quality={quality}
          view={view}
          showRoles={showRoles}
          onPick={(p) => setPicked(p)}
          instantCamera={params.get("instant") === "1"}
          onApi={onApi}
          syncId={sideBySide ? "A" : undefined}
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
        {!inCompare && <SitePhotoOverlay photo={sitePhoto} />}
        {inCompare && <div className="cmplabel">{flipB ? "B" : "A"}: {flipB ? bLabel : "Current design"}</div>}
        {!inCompare && !hideUi && <PaintStrip design={design} onSelect={selectRole} />}
        </div>
        {sideBySide && (
          <div className="scenepane">
            <ExteriorScene design={bDesign} camera={camera} cameraNonce={nonce} quality={quality} view={{ ...view, mode: "orbit" }} showRoles={showRoles} syncId="B" />
            <div className="cmplabel">B: {bLabel}</div>
          </div>
        )}
        {!hideUi && (
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
          <LightPresetButtons view={view} setView={setView} compact />
          <button className={view.autoRotate ? "on" : ""} onClick={() => setView({ autoRotate: !view.autoRotate, mode: "orbit" })} title="Turntable">
            ⟳ Turntable
          </button>
        </div>
        )}
        {view.mode === "walk" && (
          <button id="walk-start" className="walkhint">
            Click here to walk · W A S D to move · mouse to look · Esc to stop
          </button>
        )}
        {picked && view.mode === "orbit" && !inCompare && <PickCard part={picked} design={design} dispatch={dispatch} onClose={() => setPicked(null)} openElement={openElement} />}
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
                onClick={() => setTab(t)}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
          </nav>
          {tab === "compare" && <CompareTab design={design} cmp={cmp} setCmp={setCmp} />}
          {tab === "save" && (
            <SaveTab
              design={design}
              dispatch={dispatch}
              view={savedView()}
              onLoad={loadDesign}
              canUndo={hist.past.length > 0}
              canRedo={hist.future.length > 0}
              undo={undo}
              redo={redo}
              jobs={jobs}
            />
          )}
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
          {tab === "view" && (
            <SitePhotoPanel
              photo={sitePhoto}
              setPhoto={(p) => {
                if (p && !sitePhoto) setFovState(api.current?.getFov() ?? fov);
                setSitePhoto(p);
              }}
              fov={fov}
              setFov={setFov}
            />
          )}
        </aside>
      )}
    </div>
  );
}
