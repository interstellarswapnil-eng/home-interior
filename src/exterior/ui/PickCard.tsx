import { ROLES, patternById, resolveElements, resolveRoles, type DesignState } from "../model/resolve";
import { floorName, slotById } from "../model/slots";
import { sideName } from "../model/shell";
import type { Part, SurfaceRole } from "../model/types";
import type { DesignAction } from "../state/design";
import { RoleEditor } from "./ColorsTab";
import { CATALOGUE, ELEMENT_ORDER, entryFor } from "./ElementsTab";
import { Tip } from "./Tip";

/** Click-to-edit: what you clicked, in plain words, with its colour, material and the elements that can go there. */
export function PickCard({
  part,
  design,
  dispatch,
  onClose,
  openElement,
}: {
  part: Part;
  design: DesignState;
  dispatch: (a: DesignAction) => void;
  onClose: () => void;
  openElement: (id: string) => void;
}) {
  const slot = slotById(part.slot);
  // v2 moves are named in the concept ("Quarter arc frame"); details use the catalogue label
  const pat = patternById(design.patternId);
  const moveName = [pat.hero, ...(pat.supporting ?? []), pat.crown, pat.threshold].find((m) => m && m.element === part.element)?.name;
  const entry = part.element ? entryFor(design, part.element) : undefined;
  const partOf = moveName ?? entry?.label;
  const els = resolveElements(design);
  const here = part.slot ? ELEMENT_ORDER.filter((id) => CATALOGUE[id].slotOptions?.includes(part.slot!)) : [];
  const editable = !["interior", "context", "road"].includes(part.role);
  const color = resolveRoles(design)[part.role].color;
  return (
    <div className="pickcard" onPointerDown={(e) => e.stopPropagation()}>
      <div className="row between">
        <strong>
          <span className="swatch" style={{ background: color }} /> {ROLES[part.role]?.label ?? part.role} <Tip text={ROLES[part.role]?.tip} />
        </strong>
        <button className="linkish" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {slot && <div>{slot.label}</div>}
      <div className="muted small">
        {floorName(part.floor)}
        {part.side && ["N", "S", "E", "W"].includes(part.side) ? ` · ${sideName(part.side)} face` : ""}
        {partOf ? ` · part of: ${partOf}${moveName && pat.hero?.element === part.element ? " (hero move)" : ""}` : ""}
      </div>
      {editable && <RoleEditor design={design} role={part.role as SurfaceRole} dispatch={dispatch} compact />}
      {part.element && partOf && (
        <div className="row">
          <button onClick={() => openElement(part.element!)}>Adjust {partOf.toLowerCase()}</button>
          <button onClick={() => dispatch({ type: "element", id: part.element!, patch: { enabled: false } })}>Remove</button>
        </div>
      )}
      {!!here.length && (
        <div className="slots">
          <div className="muted tiny">Add here</div>
          {here.map((id) => {
            const on = !!els[id]?.enabled && !!els[id]?.slots?.includes(part.slot!);
            return (
              <label key={id} className="row">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => {
                    if (e.target.checked && !els[id]?.enabled) dispatch({ type: "element", id, patch: { enabled: true, slots: [part.slot!] } });
                    else dispatch({ type: "elementSlot", id, slot: part.slot!, on: e.target.checked });
                  }}
                />
                {CATALOGUE[id].label}
                <Tip text={CATALOGUE[id].tip} />
              </label>
            );
          })}
        </div>
      )}
      <div className="muted tiny">{part.id}</div>
    </div>
  );
}
