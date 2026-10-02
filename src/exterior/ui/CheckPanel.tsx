import { useEffect, useMemo, useState } from "react";
import { approvalFlags, qualityGate } from "../model/approval";
import { PATTERNS, patternById, type DesignState } from "../model/resolve";
import { designParts } from "../scene/ExteriorScene";
import { GREY_THRESHOLD, greyDiff, greyShots, keyOf, type GreyShot } from "./greyTest";
import { Tip } from "./Tip";

/** v2: what makes this concept (moves), the architect's approval flags, the quality gate and the grey test. */
export function CheckPanel({ design }: { design: DesignState }) {
  const pat = patternById(design.patternId);
  const parts = useMemo(() => designParts(design), [design]);
  const flags = useMemo(() => approvalFlags(design, parts), [design, parts]);
  const [grey, setGrey] = useState<{ shots: GreyShot[]; mine: GreyShot; nearest: { label: string; d: number } } | null>(null);
  const [busy, setBusy] = useState(false);
  const gate = useMemo(
    () => qualityGate(design, parts, grey ? { distinct: grey.nearest.d >= GREY_THRESHOLD, note: `closest: ${grey.nearest.label} (${grey.nearest.d.toFixed(1)}, needs ≥ ${GREY_THRESHOLD})` } : undefined),
    [design, parts, grey],
  );
  useEffect(() => setGrey(null), [design]);

  const runGrey = async () => {
    setBusy(true);
    try {
      const others = PATTERNS.filter((p) => (p.kind === "concept" || p.id === "architect") && p.id !== design.patternId);
      const shots = await greyShots([
        { key: `mine:${keyOf(design)}`, label: "This design", design },
        ...others.map((p) => ({ key: `ref:${p.id}`, label: p.name, design: { name: p.name, patternId: p.id, paletteId: p.defaultPaletteId, overrides: { roles: {}, elements: {} }, optional: { ...p.optional } } })),
      ]);
      const [mine, ...rest] = shots;
      const nearest = rest.map((s) => ({ label: s.label, d: greyDiff(mine.pixels, s.pixels) })).sort((a, b) => a.d - b.d)[0];
      setGrey({ shots, mine, nearest });
    } finally {
      setBusy(false);
    }
  };

  if (pat.kind !== "concept")
    return (
      <section>
        <h3>Approval flags</h3>
        {flags.length ? <FlagList flags={flags} /> : <p className="muted small">None: nothing changes beyond the architect's building.</p>}
      </section>
    );

  const passed = gate.filter((g) => g.pass === true).length;
  return (
    <>
      <section>
        <h3>What makes {pat.name.replace(/^C\d /, "")}</h3>
        <ul className="moves">
          <li>
            <span className="chip hero">Hero</span> {pat.hero?.name}
          </li>
          {pat.supporting?.map((s) => (
            <li key={s.element + s.name}>
              <span className="chip">Supporting</span> {s.name}
            </li>
          ))}
          <li>
            <span className="chip">Crown</span> {pat.crown?.name}
          </li>
          <li>
            <span className="chip">Threshold</span> {pat.threshold?.name}
          </li>
        </ul>
        <p className="muted tiny">Inspired by study references {pat.refs?.join(", ")}. Change the moves in the Elements tab.</p>
      </section>
      <section>
        <h3>
          Approval flags ({flags.length}) <span className="approval">Needs architect approval</span>
        </h3>
        {flags.length ? <FlagList flags={flags} /> : <p className="muted small">None.</p>}
        <p className="muted tiny">Measured against the assumed plot margins (front ≈ 2.5 m, sides ≈ 1.3 m). Rules are readings of Maharashtra UDCPR-2020; your architect confirms them.</p>
      </section>
      <section>
        <h3>
          Quality gate: {passed}/10{" "}
          <Tip text="A concept should pass at least 8 of 10: one nameable hero, ≤ 3 supporting moves, real depth, ≤ 4 materials, dark used as lines, a crown, a threshold, light on the hero, asymmetric balance, and distinct in grey." />
        </h3>
        <ol className="gate">
          {gate.map((g) => (
            <li key={g.n} className={g.pass === true ? "ok" : g.pass === false ? "bad" : "eye"}>
              {g.pass === true ? "✓" : g.pass === false ? "✗" : "?"} {g.label} <span className="muted tiny">{g.note}</span>
            </li>
          ))}
        </ol>
        <div className="row">
          <button disabled={busy} onClick={runGrey}>
            {busy ? "Rendering grey views…" : grey ? "Run the grey test again" : "Run the grey test"}
          </button>
        </div>
        {grey && (
          <div className="greystrip">
            {grey.shots.map((s) => (
              <figure key={s.key} className={s === grey.mine ? "mine" : s.label === grey.nearest.label ? "near" : ""}>
                <img src={s.url} alt={s.label} />
                <figcaption>{s.label.replace(/^C\d /, "")}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function FlagList({ flags }: { flags: { id: string; title: string; detail: string; rule: string }[] }) {
  return (
    <ul className="flags">
      {flags.map((f) => (
        <li key={f.id}>
          <b>{f.title}</b>
          <div className="muted tiny">
            {f.detail} <i>{f.rule}</i>
          </div>
        </li>
      ))}
    </ul>
  );
}
