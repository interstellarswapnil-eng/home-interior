import { LOCATION } from "../model/building";
import type { ViewState } from "../scene/ExteriorScene";
import { dayOfYear, sunTimes } from "../sun";

/** v2 light presets: Day, Golden hour, Dusk (default for concept review), Night, plus Cloudy for judging colours. */
export const PRESETS = ["day", "golden", "dusk", "night", "cloudy"] as const;
export type Preset = (typeof PRESETS)[number];
export const PRESET_LABEL: Record<Preset, string> = { day: "Day", golden: "Golden hour", dusk: "Dusk", night: "Night", cloudy: "Cloudy" };

export function presetOf(v: ViewState): Preset {
  if (v.sky === "dusk") return "dusk";
  if (v.sky === "night") return "night";
  if (v.sky === "overcast") return "cloudy";
  const { sunset } = sunTimes(LOCATION.lat, LOCATION.lon, dayOfYear(v.date));
  return v.hour >= sunset - 1.25 ? "golden" : "day";
}

export function applyPreset(p: Preset, v: ViewState): Partial<ViewState> {
  const { sunset } = sunTimes(LOCATION.lat, LOCATION.lon, dayOfYear(v.date));
  switch (p) {
    case "day":
      return { sky: "clear", hour: presetOf(v) === "day" ? v.hour : 12.5 };
    case "golden":
      return { sky: "clear", hour: sunset - 0.6 };
    case "dusk":
      return { sky: "dusk" };
    case "night":
      return { sky: "night" };
    case "cloudy":
      return { sky: "overcast" };
  }
}

export function LightPresetButtons({ view, setView, compact }: { view: ViewState; setView: (v: Partial<ViewState>) => void; compact?: boolean }) {
  const cur = presetOf(view);
  return (
    <div className={`seg ${compact ? "" : "wide wrap"}`}>
      {PRESETS.map((p) => (
        <button key={p} className={cur === p ? "on" : ""} onClick={() => setView(applyPreset(p, view))}>
          {PRESET_LABEL[p]}
        </button>
      ))}
    </div>
  );
}
