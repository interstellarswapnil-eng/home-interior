import { budgetLines, budgetMeta } from "../plan/budget";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function BudgetPanel({ onHover }: { onHover: (ids: string[] | null) => void }) {
  const total = budgetMeta.total;
  const pct = (n: number) => (n / total) * 100;
  const ok = budgetMeta.inBand();
  const pos = ((total - 700_000) / (1_100_000 - 700_000)) * 100;
  return (
    <div className="panel">
      <div className="total-card">
        <div>
          <div className="muted small">Interior fit-out total</div>
          <div className="total">{inr(total)}</div>
        </div>
        <span className={`pill ${ok ? "ok" : "bad"}`}>{ok ? "Within ₹8–10 L band" : "Out of band"}</span>
      </div>
      <div className="band" title="₹7 L – ₹11 L scale; shaded = ₹8–10 L band">
        <div className="band-ok" style={{ left: "25%", width: "50%" }} />
        <div className="band-mark" style={{ left: `${Math.min(100, Math.max(0, pos))}%` }} />
        <span style={{ left: "25%" }}>8 L</span>
        <span style={{ left: "50%" }}>9 L</span>
        <span style={{ left: "75%" }}>10 L</span>
      </div>
      <p className="muted small">Hover a line to highlight what it pays for in the 2D and 3D views.</p>
      <table className="budget">
        <tbody>
          {budgetLines.map((l) => (
            <tr key={l.id} onMouseEnter={() => onHover(l.visibleInModel)} onMouseLeave={() => onHover(null)}>
              <td>
                <div>{l.head}</div>
                <div className="bar">
                  <div style={{ width: `${pct(l.amountInr) * 3}%` }} />
                </div>
                {l.visibleInModel.length > 0 ? (
                  <div className="chips">
                    {l.visibleInModel.map((id) => (
                      <span key={id} className="chip">
                        {id}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="muted small">Not a modelled object (finish/service)</div>
                )}
              </td>
              <td className="amt">{inr(l.amountInr)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total ({budgetLines.length} heads)</td>
            <td className="amt">{inr(total)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="muted small">
        Excluded by brief: imported marble, home automation, premium Italian fittings. Entry door, windows and
        balcony glazing are builder-supplied. Mid-market Ahilyanagar labour + material estimates.
      </p>
    </div>
  );
}
