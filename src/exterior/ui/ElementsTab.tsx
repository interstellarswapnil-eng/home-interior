import { useState } from "react";
import catalogue from "../config/elements.json";
import { resolveElements, type DesignState } from "../model/resolve";
import { slotById } from "../model/slots";
import type { DesignAction } from "../state/design";
import { Tip } from "./Tip";

type Param = { label: string; min?: number; max?: number; step?: number; default?: unknown; options?: string[]; type?: "boolean" };
export type CatalogueEntry = { n: number; label: string; tip: string; status: string; slotOptions?: string[]; params: Record<string, Param> };
export const CATALOGUE = Object.fromEntries(Object.entries(catalogue).filter(([k]) => !k.startsWith("_"))) as unknown as Record<string, CatalogueEntry>;
export const ELEMENT_ORDER = Object.keys(CATALOGUE).sort((a, b) => (CATALOGUE[a].n || 99) - (CATALOGUE[b].n || 99));

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

export function ElementControls({ id, design, dispatch, only }: { id: string; design: DesignState; dispatch: (a: DesignAction) => void; only?: "slots" }) {
  const c = CATALOGUE[id];
  const cfg = resolveElements(design)[id] ?? { enabled: false };
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
  const [open, setOpen] = useState<string | null>(focus ?? null);
  return (
    <section>
      <h3>Elements</h3>
      <p className="muted small">The pattern switches these on. Change any of them: tick to show, open to adjust size and where it goes.</p>
      {ELEMENT_ORDER.map((id) => {
        const c = CATALOGUE[id];
        const on = !!els[id]?.enabled;
        const isOpen = open === id;
        return (
          <div key={id} className={`elrow ${on ? "on" : ""}`}>
            <div className="elhead">
              <input type="checkbox" checked={on} onChange={(e) => dispatch({ type: "element", id, patch: { enabled: e.target.checked } })} aria-label={`Show ${c.label}`} />
              <button className="linkish elname" onClick={() => setOpen(isOpen ? null : id)}>
                {c.label}
              </button>
              <Tip text={c.tip} />
              <button className="linkish tiny" onClick={() => setOpen(isOpen ? null : id)}>
                {isOpen ? "close" : "adjust"}
              </button>
            </div>
            {isOpen && <ElementControls id={id} design={design} dispatch={dispatch} />}
          </div>
        );
      })}
      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={() => dispatch({ type: "resetElements" })}>Reset to the pattern's elements</button>
      </div>
    </section>
  );
}
