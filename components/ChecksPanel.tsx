import { runChecks } from "../plan/checks";

export function ChecksPanel() {
  const checks = runChecks();
  const failed = checks.filter((c) => !c.ok).length;
  let group = "";
  return (
    <div className="panel">
      <div className="total-card">
        <div>
          <div className="muted small">Boot checks (same as npm run check)</div>
          <div className="total">
            {checks.length - failed}/{checks.length}
          </div>
        </div>
        <span className={`pill ${failed ? "bad" : "ok"}`}>{failed ? `${failed} failing` : "All passing"}</span>
      </div>
      <ul className="checks">
        {checks.map((c, i) => {
          const head = c.group !== group ? (group = c.group) : null;
          return (
            <li key={i}>
              {head && <h4>{head}</h4>}
              <span className={c.ok ? "ok-t" : "bad-t"}>{c.ok ? "PASS" : "FAIL"}</span> {c.name}
              {c.detail && <span className="muted small"> — {c.detail}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
