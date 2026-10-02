import { PATTERNS, defaultDesign, patternById, type DesignState } from "../model/resolve";
import { listSaves } from "../state/saves";

export type CompareState = { mode: "side" | "flip"; bId: string; showB: boolean };

/** Design B options: the architect's design, every pattern's recommended look, and your saved designs. */
export function compareOptions(): { id: string; label: string; design: DesignState }[] {
  const out = PATTERNS.map((p) => ({ id: `pattern:${p.id}`, label: p.id === "architect" ? "Architect's design" : `${p.name} (recommended colours)`, design: defaultDesign(p.id) }));
  for (const s of listSaves()) out.push({ id: `save:${s.id}`, label: `Saved: ${s.name}`, design: s.design });
  return out;
}

export function designB(bId: string): DesignState {
  return compareOptions().find((o) => o.id === bId)?.design ?? defaultDesign("architect");
}

export function CompareTab({ design, cmp, setCmp }: { design: DesignState; cmp: CompareState; setCmp: (c: Partial<CompareState>) => void }) {
  const opts = compareOptions();
  const b = designB(cmp.bId);
  return (
    <section>
      <h3>Compare two designs</h3>
      <p className="small">
        <b>A</b> = your current design ({patternById(design.patternId).name})
        <br />
        <b>B</b> =
        <select value={cmp.bId} onChange={(e) => setCmp({ bId: e.target.value })} style={{ marginLeft: 6, maxWidth: 230 }}>
          {opts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </p>
      <div className="seg wide">
        <button className={cmp.mode === "side" ? "on" : ""} onClick={() => setCmp({ mode: "side" })}>
          Side by side
        </button>
        <button className={cmp.mode === "flip" ? "on" : ""} onClick={() => setCmp({ mode: "flip" })}>
          Flip (Space key)
        </button>
      </div>
      {cmp.mode === "side" ? (
        <p className="muted small">Both views share one camera: rotate or zoom either and the other follows. The light and time (View tab) apply to both.</p>
      ) : (
        <>
          <p className="muted small">One view, same camera. Press the Space key (or the button) to flip between A and B and spot the difference.</p>
          <button onClick={() => setCmp({ showB: !cmp.showB })}>Now showing {cmp.showB ? "B" : "A"}: flip</button>
        </>
      )}
      <p className="small muted">
        B: {patternById(b.patternId).name} · {patternById(b.patternId).palettes.find((p) => p.id === b.paletteId)?.name}
      </p>
    </section>
  );
}
