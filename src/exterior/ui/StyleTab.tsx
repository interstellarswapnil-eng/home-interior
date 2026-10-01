import { PATTERNS, ROLES, patternById, resolveRoles, type DesignState } from "../model/resolve";
import type { DesignAction } from "../state/design";

const CHIP_ROLES = ["mainWall", "secondSurface", "featureWall", "railing", "base"] as const;

export function StyleTab({ design, dispatch, thumbs }: { design: DesignState; dispatch: (a: DesignAction) => void; thumbs: Record<string, string> }) {
  const pattern = patternById(design.patternId);
  const roles = resolveRoles(design);
  const palette = pattern.palettes.find((p) => p.id === design.paletteId);
  return (
    <>
      <section>
        <h3>Design pattern</h3>
        <div className="cards">
          {PATTERNS.map((p) => (
            <button key={p.id} className={`pcard ${p.id === design.patternId ? "on" : ""}`} onClick={() => p.id !== design.patternId && dispatch({ type: "pattern", id: p.id })}>
              <span className="pthumb">{thumbs[p.id] ? <img src={thumbs[p.id]} alt="" /> : <span className="muted tiny">preparing preview…</span>}</span>
              <span className="pname">
                {p.name} <span className="muted tiny">{p.notes.relativeCost}</span>
              </span>
              <span className="pdesc muted">{p.description}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>Colour sets for {pattern.name}</h3>
        <div className="palettes">
          {pattern.palettes.map((p) => (
            <button key={p.id} className={`palette ${design.paletteId === p.id ? "on" : ""}`} onClick={() => dispatch({ type: "palette", id: p.id })} title={p.note}>
              <span className="chips">
                {CHIP_ROLES.map((r) => (
                  <span key={r} className="swatch" title={`${ROLES[r].label} ${p.roles[r]?.color ?? ""}`} style={{ background: p.roles[r]?.color ?? roles[r].color }} />
                ))}
              </span>
              <span>
                {p.name}
                {p.recommended && <b className="star" title="Recommended"> ★ recommended</b>}
              </span>
            </button>
          ))}
        </div>
        {palette?.note && <p className="muted small">{palette.note}</p>}
        <p className="small">
          <b>Good to know:</b> {pattern.notes.climate}
        </p>
        <p className="small muted">
          Upkeep: {pattern.notes.maintenance} · Relative cost: {pattern.notes.relativeCost}
        </p>
        {Object.values(design.overrides.roles).some((o) => o?.locked) && <p className="small">🔒 Locked colours stay when you switch pattern or colour set.</p>}
      </section>
    </>
  );
}
