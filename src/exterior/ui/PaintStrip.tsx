import { MATERIALS, ROLES, resolveRoles, type DesignState } from "../model/resolve";
import type { SurfaceRole } from "../model/types";

const STRIP: SurfaceRole[] = ["mainWall", "secondSurface", "featureWall", "railing", "base"];

/** Flat paint swatches beside the 3D view: colours look different in sun and shade, so the true colour is always shown. */
export function PaintStrip({ design, onSelect }: { design: DesignState; onSelect: (r: SurfaceRole) => void }) {
  const roles = resolveRoles(design);
  return (
    <div className="paintstrip" title="Flat colours (as on a paint card)">
      {STRIP.map((r) => (
        <button key={r} className="paintchip" onClick={() => onSelect(r)} title={`${ROLES[r].label}: ${roles[r].color} · ${MATERIALS[roles[r].material]?.name}`}>
          <span className="chipcolor" style={{ background: roles[r].color }} />
          <span className="chiplabel">
            {ROLES[r].label}
            <span>{roles[r].color}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
