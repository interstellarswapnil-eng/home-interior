import { useRef, useState } from "react";
import type { DesignState } from "../model/resolve";
import type { DesignAction } from "../state/design";
import { deleteSave, designFromJson, designToJson, download, duplicateSave, listSaves, renameSave, saveDesign, type SavedDesign, type SavedView } from "../state/saves";

export type ExportJobs = {
  screenshot: (scale: number) => Promise<void>;
  allViews: () => Promise<void>;
  sheet: () => Promise<void>;
  lighting: () => Promise<void>;
  busy: string | null;
};

export function SaveTab({
  design,
  dispatch,
  view,
  onLoad,
  canUndo,
  canRedo,
  undo,
  redo,
  jobs,
}: {
  design: DesignState;
  dispatch: (a: DesignAction) => void;
  view: SavedView;
  onLoad: (s: { design: DesignState; view?: SavedView }) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  jobs: ExportJobs;
}) {
  const [saves, setSaves] = useState<SavedDesign[]>(listSaves);
  const [current, setCurrent] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [scale, setScale] = useState(2);
  const file = useRef<HTMLInputElement>(null);
  const refresh = () => setSaves(listSaves());
  const say = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <>
      <section>
        <h3>Undo</h3>
        <div className="row">
          <button disabled={!canUndo} onClick={undo} title="Ctrl+Z">
            ↶ Undo
          </button>
          <button disabled={!canRedo} onClick={redo} title="Ctrl+Y or Ctrl+Shift+Z">
            ↷ Redo
          </button>
          <span className="muted tiny">Ctrl+Z / Ctrl+Y</span>
        </div>
      </section>
      <section>
        <h3>Save this design</h3>
        <label className="row">
          Name
          <input className="text" value={design.name} onChange={(e) => dispatch({ type: "rename", name: e.target.value })} />
        </label>
        <div className="row">
          <button
            onClick={() => {
              const s = saveDesign(design, view, current ?? undefined);
              setCurrent(s.id);
              refresh();
              say(current ? "Saved (updated)." : "Saved.");
            }}
          >
            {current ? "Save changes" : "Save"}
          </button>
          <button
            onClick={() => {
              const s = saveDesign({ ...design, name: current ? `${design.name} (copy)` : design.name }, view);
              setCurrent(s.id);
              refresh();
              say("Saved as a new design.");
            }}
          >
            Save as new
          </button>
        </div>
        {msg && <p className="small">{msg}</p>}
        {!!saves.length && (
          <ul className="saves">
            {saves.map((s) => (
              <li key={s.id} className={s.id === current ? "on" : ""}>
                <button
                  className="linkish sname"
                  onClick={() => {
                    onLoad(s);
                    setCurrent(s.id);
                    say(`Loaded "${s.name}".`);
                  }}
                >
                  {s.name}
                </button>
                <span className="muted tiny">{new Date(s.savedAt).toLocaleString()}</span>
                <span className="sactions">
                  <button
                    className="linkish tiny"
                    onClick={() => {
                      const n = prompt("New name", s.name);
                      if (n) renameSave(s.id, n);
                      refresh();
                    }}
                  >
                    rename
                  </button>
                  <button className="linkish tiny" onClick={() => (duplicateSave(s.id), refresh())}>
                    duplicate
                  </button>
                  <button
                    className="linkish tiny"
                    onClick={() => {
                      if (!confirm(`Delete "${s.name}"?`)) return;
                      deleteSave(s.id);
                      if (current === s.id) setCurrent(null);
                      refresh();
                    }}
                  >
                    delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted tiny">Saved designs live in this browser. Use "Export file" to back one up or open it on another computer.</p>
        <div className="row">
          <button onClick={() => download(`${(design.name || "design").replace(/[^\w-]+/g, "-")}.pasaydan.json`, designToJson(design, view))}>Export file (JSON)</button>
          <button onClick={() => file.current?.click()}>Import file…</button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                onLoad(designFromJson(await f.text()));
                setCurrent(null);
                say(`Imported "${f.name}".`);
              } catch (err) {
                say((err as Error).message);
              }
            }}
          />
        </div>
      </section>
      <section>
        <h3>Export pictures</h3>
        <label className="row">
          Size
          <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
            <option value={2}>2× screen (sharp)</option>
            <option value={3}>3× screen (print)</option>
          </select>
        </label>
        <div className="btngrid">
          <button disabled={!!jobs.busy} onClick={() => jobs.screenshot(scale)}>
            Screenshot of this view (PNG)
          </button>
          <button disabled={!!jobs.busy} onClick={() => jobs.allViews()}>
            Export all views (ZIP)
          </button>
          <button disabled={!!jobs.busy} onClick={() => jobs.sheet()}>
            Design sheet for the architect
          </button>
          <button disabled={!!jobs.busy} onClick={() => jobs.lighting()}>
            Lighting schedule (CSV)
          </button>
        </div>
        {jobs.busy && <p className="small">{jobs.busy}</p>}
        <p className="muted tiny">The design sheet is one HTML page with the colours, materials, elements and all views; open it and use "Print / save as PDF". For a photo-like render, use "Photo-quality still" in the View tab.</p>
      </section>
    </>
  );
}
