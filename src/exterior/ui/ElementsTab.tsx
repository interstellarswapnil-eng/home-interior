import { useState } from "react";
import catalogue from "../config/elements.json";
import optional from "../config/optional.json";
import { patternById, resolveElements, type DesignState, type MoveRef } from "../model/resolve";
import { slotById } from "../model/slots";
import type { DesignAction } from "../state/design";
import { Tip } from "./Tip";

type Param = { label: string; min?: number; max?: number; step?: number; default?: unknown; options?: string[]; type?: "boolean" };
export type CatalogueEntry = { n: number; label: string; tip: string; status: string; move?: boolean; slotOptions?: string[]; params: Record<string, Param> };
export const CATALOGUE = Object.fromEntries(Object.entries(catalogue).filter(([k]) => !k.startsWith("_"))) as unknown as Record<string, CatalogueEntry>;
const OPTIONAL = Object.fromEntries(Object.entries(optional).filter(([k]) => !k.startsWith("_"))) as unknown as Record<string, { label: string; detail: string; why: string }>;
export const ELEMENT_ORDER =Object.keys(CATALOGUE).sort((a, b) => (CATALOGUE[a].n || 99) - (CATALOGUE[b].n || 99));

/** Plain words for option values. */
const OPTION_LABEL: Record<string, string> = {
  vertical: "Vertical",
  horizontal: "Horizontal",
  concrete: "Concrete slab",
  glass: "Glass",
  woodPergola: "Wood pergola",
  thin: "Thin edge",
  band: "Thick band",
  curvedSolidGlass: "Curved wall + glass",
  bars: "Vertical bars",
  solid: "Solid wall",
  verticalBars: "Vertical bars",
  slats: "Wood-look slats",
  wood: "Wood double door",
  pivot: "Wide pivot door",
  windowSurround: "Box frame colour",
  secondSurface: "Second colour",
  featureWall: "Feature wall",
  trim: "Trim colour",
  mainWall: "Main wall",
  base: "Stone base",
};

export function ParamControl({ p, value, onChange }: { p: Param; value: unknown; onChange: (v: unknown) => void }) {
  if (p.options)
    return (
      <label className="row">
        {p.label}
        <select value={String(value ?? p.default)} onChange={(e) => onChange(e.target.value)}>
          {p.options.map((o) => (
            <option key={o} value={o}>
              {OPTION_LABEL[o] ?? o}
            </option>
          ))}
        </select>
      </label>
    );
  if (p.type === "boolean")
    return (
      <label className="row">
        <input type="checkbox" checked={Boolean(value ?? p.default)} onChange={(e) => onChange(e.target.checked)} /> {p.label}
      </label>
    );
  const v = Number(value ?? p.default);
  return (
    <label className="row slider">
      <span>{p.label}</span>
      <input type="range" min={p.min} max={p.max} step={p.step} value={v} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="num">{Number.isInteger(p.step) ? v : v.toFixed(2)}</span>
    </label>
  );
}

/** Catalogue entry for an element: concepts name their moves freely (e.g. "pictureFrame") and give the type in params. */
export const typeOfEl = (design: DesignState, id: string) => ((resolveElements(design)[id]?.params?.type as string) ?? id);
export const entryFor = (design: DesignState, id: string): CatalogueEntry | undefined => CATALOGUE[typeOfEl(design, id)];

export function ElementControls({ id, design, dispatch, only }: { id: string; design: DesignState; dispatch: (a: DesignAction) => void; only?: "slots" }) {
  const c = entryFor(design, id);
  const cfg = resolveElements(design)[id] ?? { enabled: false };
  if (!c) return null;
  return (
    <div className="elbody">
      {only !== "slots" &&
        Object.entries(c.params).map(([k, p]) => <ParamControl key={k} p={p} value={cfg.params?.[k]} onChange={(v) => dispatch({ type: "elementParam", id, key: k, value: v })} />)}
      {!!c.slotOptions?.length && (
        <div className="slots">
          <div className="muted tiny">Where it goes</div>
          {c.slotOptions.map((s) => (
            <label key={s} className="row">
              <input type="checkbox" checked={!!cfg.slots?.includes(s)} onChange={(e) => dispatch({ type: "elementSlot", id, slot: s, on: e.target.checked })} />
              {slotById(s)?.label ?? s}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function ElementsTab({ design, dispatch, focus }: { design: DesignState; dispatch: (a: DesignAction) => void; focus?: string }) {
  const els = resolveElements(design);
  const pat = patternById(design.patternId);
  const [open, setOpen] = useState<string | null>(focus ?? null);
  // v2: a concept's moves first (hero, supporting, crown, threshold); the v1 elements follow as details
  const moves: { id: string; group: string; name: string }[] = [];
  const add = (group: string, m?: MoveRef) => {
    if (!m || !els[m.element]) return;
    const seen = moves.find((x) => x.id === m.element);
    // a hero that carries on up to the roofline is also the crown: say so rather than list it twice
    if (seen) seen.group += ` · also the ${group.toLowerCase()}`;
    else moves.push({ id: m.element, group, name: m.name });
  };
  if (pat.kind === "concept") {
    add("Hero move", pat.hero);
    pat.supporting?.forEach((m) => add("Supporting moves", m));
    add("Crown", pat.crown);
    add("Threshold", pat.threshold);
    for (const [id, cfg] of Object.entries(els)) if (!moves.some((x) => x.id === id) && CATALOGUE[typeOfEl(design, id)]?.move && cfg.enabled) moves.push({ id, group: "Supporting moves", name: CATALOGUE[typeOfEl(design, id)].label });
  }
  const details = ELEMENT_ORDER.filter((id) => !CATALOGUE[id].move && !moves.some((m) => m.id === id));
  const row = (id: string, label: string) => {
    const c = entryFor(design, id);
    if (!c) return null;
    const on = !!els[id]?.enabled;
    const isOpen = open === id;
    return (
      <div key={id} className={`elrow ${on ? "on" : ""}`}>
        <div className="elhead">
          <input type="checkbox" checked={on} onChange={(e) => dispatch({ type: "element", id, patch: { enabled: e.target.checked } })} aria-label={`Show ${label}`} />
          <button className="linkish elname" onClick={() => setOpen(isOpen ? null : id)}>
            {label}
          </button>
          <Tip text={c.tip} />
          <button className="linkish tiny" onClick={() => setOpen(isOpen ? null : id)}>
            {isOpen ? "close" : "adjust"}
          </button>
        </div>
        {isOpen && <ElementControls id={id} design={design} dispatch={dispatch} />}
      </div>
    );
  };
  let lastGroup = "";
  return (
    <section>
      {!!moves.length && (
        <>
          <h3>Moves</h3>
          <p className="muted small">The bold shapes that make this concept. Open one to change its size, depth, corners and light.</p>
          {moves.map((m) => {
            const head = m.group !== lastGroup ? <div className="movegroup">{m.group}</div> : null;
            lastGroup = m.group;
            return (
              <div key={m.id}>
                {head}
                {row(m.id, m.name)}
              </div>
            );
          })}
          <h3 style={{ marginTop: 16 }}>Details</h3>
        </>
      )}
      {!moves.length && <h3>Elements</h3>}
      <p className="muted small">{moves.length ? "Smaller elements inside the moves: tick to show, open to adjust." : "The pattern switches these on. Change any of them: tick to show, open to adjust size and where it goes."}</p>
      {details.map((id) => row(id, CATALOGUE[id].label))}
      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={() => dispatch({ type: "resetElements" })}>Reset to the pattern's elements</button>
      </div>
      <h3 style={{ marginTop: 18 }}>
        Bigger changes <span className="approval">Needs architect approval</span>
      </h3>
      <p className="muted small">These change window or door sizes, so they are off by default and listed separately on the design sheet.</p>
      {Object.entries(OPTIONAL).map(([id, o]) => (
        <label key={id} className="row optrow">
          <input type="checkbox" checked={!!design.optional?.[id]} onChange={(e) => dispatch({ type: "optional", id, on: e.target.checked })} />
          <span>
            {o.label} <Tip text={`${o.detail} Why: ${o.why}`} />
          </span>
        </label>
      ))}
    </section>
  );
}
