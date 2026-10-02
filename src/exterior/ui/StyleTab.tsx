import { useState } from "react";
import { PATTERNS, ROLES, patternById, resolveRoles, type DesignState, type Pattern } from "../model/resolve";
import type { DesignAction } from "../state/design";
import { CheckPanel } from "./CheckPanel";

const CHIP_ROLES = ["mainWall", "secondSurface", "featureWall", "railing", "base"] as const;

/** v2 Style tab: the 7 design concepts first, the Architect's design for reference, earlier styles folded away. */
export function StyleTab({ design, dispatch, thumbs }: { design: DesignState; dispatch: (a: DesignAction) => void; thumbs: Record<string, string> }) {
  const pattern = patternById(design.patternId);
  const roles = resolveRoles(design);
  const palette = pattern.palettes.find((p) => p.id === design.paletteId);
  const concepts = PATTERNS.filter((p) => p.kind === "concept");
  const architect = PATTERNS.find((p) => p.id === "architect")!;
  const earlier = PATTERNS.filter((p) => p.kind !== "concept" && p.id !== "architect");
  const [showEarlier, setShowEarlier] = useState(earlier.some((p) => p.id === design.patternId));

  const card = (p: Pattern) => (
    <button key={p.id} className={`pcard ${p.id === design.patternId ? "on" : ""}`} onClick={() => p.id !== design.patternId && dispatch({ type: "pattern", id: p.id })}>
      <span className="pthumb">{thumbs[p.id] ? <img src={thumbs[p.id]} alt="" /> : <span className="muted tiny">preparing preview…</span>}</span>
      <span className="pname">
        {p.name} <span className="muted tiny">{p.notes.relativeCost}</span>
      </span>
      {p.hero && <span className="herochip">{p.hero.name}</span>}
      <span className="pdesc muted">{p.description}</span>
    </button>
  );

  return (
    <>
      <section>
        <h3>Design concepts</h3>
        <p className="muted small">Each concept is built around one bold move (the hero), with a crown on top and a designed gate and wall at the bottom. Your building's floor plan and floor heights never change.</p>
        <div className="cards">{concepts.map(card)}</div>
        <h3 style={{ marginTop: 12 }}>For comparison</h3>
        <div className="cards">{card(architect)}</div>
        <button className="linkish" onClick={() => setShowEarlier(!showEarlier)}>
          {showEarlier ? "▾" : "▸"} Earlier styles ({earlier.length})
        </button>
        {showEarlier && <div className="cards">{earlier.map(card)}</div>}
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
        {Object.values(design.overrides.roles).some((o) => o?.locked) && <p className="small">🔒 Locked colours stay when you switch concept or colour set.</p>}
      </section>
      <CheckPanel design={design} />
    </>
  );
}
