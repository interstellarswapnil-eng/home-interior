/**
 * Guided tour + walk spawn, authored in plan metres against plan.ts rooms and converted to
 * world XYZ (world = [x, height, -y]). One pure `tourState(t)` drives the camera, HUD titles
 * and the video compositor, so recording stays in sync with a single tour clock.
 */
import { CatmullRomCurve3, Vector3 } from "three";
import { planBounds } from "./plan";
import { EYE_H } from "./collision";

type V3 = [number, number, number];

export type TourWaypoint = {
  id: string;
  room: string;
  /** Room-name title shown on arrival (only on "stops"); intermediate points have none. */
  title?: string;
  caption?: string;
  position: V3; // world XYZ, Y = eye height
  lookAt: V3;
  /** Optional slow look-pan target during the dwell. */
  panTo?: V3;
  dwellSeconds: number; // pause on arrival
  moveSeconds: number; // time from previous point
  /** Exposure bump (0–0.3) toward bright balcony views. */
  exposure?: number;
};

/** plan (x, y) at eye height → world */
const P = (x: number, y: number): V3 => [x, EYE_H, -y];
/** plan (x, y, h) look target → world */
const L = (x: number, y: number, h: number): V3 => [x, h, -y];

export const tourPath: TourWaypoint[] = [
  { id: "foyer", room: "foyer", title: "Foyer", caption: "Hall to bedrooms · storage room · guest washroom", position: P(3.25, 3.95), lookAt: L(9.0, 4.8, 1.3), dwellSeconds: 3.0, moveSeconds: 0 },
  { id: "hall-east", room: "foyer", position: P(5.4, 3.95), lookAt: L(9.0, 6.5, 1.3), dwellSeconds: 0, moveSeconds: 2.2 },
  { id: "living-in", room: "living", position: P(6.5, 5.3), lookAt: L(8.0, 9.0, 1.2), dwellSeconds: 0, moveSeconds: 2.0 },
  { id: "living", room: "living", title: "Living", caption: "14' × 16'3\" · open to the kitchen", position: P(7.05, 6.9), lookAt: L(7.8, 10.2, 1.3), panTo: L(9.4, 7.1, 0.9), dwellSeconds: 3.5, moveSeconds: 2.2 },
  { id: "living-balcony", room: "living", title: "Living balcony", caption: "North light · double doors", position: P(7.2, 8.55), lookAt: L(7.9, 11.6, 1.2), dwellSeconds: 2.5, moveSeconds: 2.0, exposure: 0.15 },
  { id: "living-mid", room: "living", position: P(6.9, 6.2), lookAt: L(8.5, 2.5, 1.0), dwellSeconds: 0, moveSeconds: 2.2 },
  { id: "kitchen", room: "kitchen", title: "Kitchen", caption: "L-shaped · pale artificial granite · chimney", position: P(7.5, 2.9), lookAt: L(9.7, 3.2, 1.3), panTo: L(9.2, 1.1, 1.1), dwellSeconds: 3.0, moveSeconds: 2.5 },
  { id: "south-balcony", room: "kitchen", title: "South kitchen balcony", caption: "Exterior roller shade · full shutter door", position: P(7.3, 1.95), lookAt: L(7.3, -2.0, 1.1), dwellSeconds: 3.0, moveSeconds: 1.5, exposure: 0.2 },
  { id: "kitchen-out", room: "kitchen", position: P(6.3, 3.9), lookAt: L(3.0, 3.8, 1.4), dwellSeconds: 0, moveSeconds: 2.0 },
  { id: "master-door", room: "foyer", position: P(3.2, 3.9), lookAt: L(3.2, 1.5, 1.2), dwellSeconds: 0, moveSeconds: 2.6 },
  { id: "master", room: "master", title: "Master bedroom", caption: "Queen bed · full-wall light laminate wardrobe", position: P(3.2, 2.3), lookAt: L(1.3, 0.7, 0.7), panTo: L(1.8, 3.1, 1.3), dwellSeconds: 3.5, moveSeconds: 1.6 },
  { id: "master-foot", room: "master", position: P(1.9, 2.32), lookAt: L(0.5, 4.2, 1.2), dwellSeconds: 0, moveSeconds: 1.5 },
  { id: "ensuite", room: "masterBath", title: "Master ensuite", caption: "8' × 4' · glass shower · large light tiles", position: P(0.62, 2.4), lookAt: L(0.55, 4.4, 1.1), panTo: L(1.1, 4.3, 1.0), dwellSeconds: 3.0, moveSeconds: 1.3 },
  { id: "master-foot-back", room: "master", position: P(1.9, 2.32), lookAt: L(3.3, 3.8, 1.4), dwellSeconds: 0, moveSeconds: 1.5 },
  { id: "master-exit", room: "master", position: P(3.2, 2.5), lookAt: L(3.2, 4.5, 1.4), dwellSeconds: 0, moveSeconds: 1.3 },
  { id: "kids-door", room: "foyer", position: P(3.25, 3.95), lookAt: L(3.2, 6.0, 1.3), dwellSeconds: 0, moveSeconds: 1.4 },
  { id: "kids", room: "kids", title: "Kids room", caption: "Single bed · study desk at the window · wardrobe on the lift wall", position: P(3.0, 5.15), lookAt: L(0.4, 6.2, 1.0), panTo: L(1.9, 7.4, 0.8), dwellSeconds: 3.5, moveSeconds: 1.6 },
  { id: "kids-out", room: "foyer", position: P(3.25, 3.95), lookAt: L(8.5, 5.0, 1.4), dwellSeconds: 0, moveSeconds: 2.0 },
  { id: "hall-east-back", room: "foyer", position: P(5.3, 3.9), lookAt: L(9.0, 6.5, 1.3), dwellSeconds: 0, moveSeconds: 2.0 },
  { id: "living-end", room: "living", title: "Ahilyanagar 2BHK", caption: "Lighter modern · ₹8–10 lakh interiors", position: P(6.6, 5.4), lookAt: L(9.4, 8.6, 1.1), dwellSeconds: 3.0, moveSeconds: 1.8 },
];

/** Walk mode spawn: in the foyer, facing the living room. */
export const walkSpawn: { position: V3; lookAt: V3 } = { position: P(5.0, 3.9), lookAt: L(9.0, 5.6, EYE_H) };

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
/** Establishing drone orbit before the eye-level tour (short intro only). */
export const INTRO_SECONDS = 3.2;
const FADE = 0.6;

const arrive: number[] = [];
const depart: number[] = [];
{
  let t = INTRO_SECONDS;
  tourPath.forEach((w, i) => {
    t += i === 0 ? 0 : w.moveSeconds;
    arrive.push(t);
    t += w.dwellSeconds;
    depart.push(t);
  });
}
export const TOUR_SECONDS = depart[depart.length - 1];
export const tourStops = tourPath.map((w, i) => ({ w, i, arrive: arrive[i], depart: depart[i] })).filter((s) => s.w.dwellSeconds > 0);

const curve = new CatmullRomCurve3(
  tourPath.map((w) => new Vector3(...w.position)),
  false,
  "centripetal",
);

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp3 = (a: V3, b: V3, f: number): V3 => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const depLook = (i: number) => tourPath[i].panTo ?? tourPath[i].lookAt;

export type TourFrame = {
  position: V3;
  lookAt: V3;
  title: string;
  caption: string;
  titleOpacity: number;
  /** 0–1 white fade (intro → eye level cut) */
  fade: number;
  exposure: number;
  intro: boolean;
  done: boolean;
  /** index of the waypoint we're at or heading to */
  index: number;
};

function introFrame(t: number): Pick<TourFrame, "position" | "lookAt"> {
  const b = planBounds();
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const a = -1.05 + 0.45 * (t / INTRO_SECONDS); // slow orbit from the south-west
  const r = 12;
  return { position: [cx + r * Math.sin(a), 11 - t * 0.6, -(cy - r * Math.cos(a))], lookAt: [cx, 0, -cy] };
}

export function tourState(tIn: number): TourFrame {
  const t = Math.max(0, Math.min(tIn, TOUR_SECONDS));
  const n = tourPath.length;
  let fade = 0;
  if (t > INTRO_SECONDS - FADE && t < INTRO_SECONDS) fade = (t - (INTRO_SECONDS - FADE)) / FADE;
  else if (t >= INTRO_SECONDS && t < INTRO_SECONDS + FADE) fade = 1 - (t - INTRO_SECONDS) / FADE;

  // titles
  let title = "";
  let caption = "";
  let titleOpacity = 0;
  for (const s of tourStops) {
    if (!s.w.title) continue;
    const a = s.arrive - 0.2;
    const d = s.depart + 0.5;
    const o = Math.min(smooth((t - a) / 0.5), smooth((d - t) / 0.5));
    if (o > titleOpacity) {
      titleOpacity = o;
      title = s.w.title;
      caption = s.w.caption ?? "";
    }
  }
  // establishing title over the intro
  if (t < INTRO_SECONDS) {
    const o = Math.min(smooth(t / 0.6), smooth((INTRO_SECONDS - 0.4 - t) / 0.5));
    if (o > titleOpacity) {
      titleOpacity = o;
      title = "Ahilyanagar 2BHK";
      caption = "Walkthrough · typical 1st to 3rd floor";
    }
  }

  const base = { title, caption, titleOpacity, fade, done: tIn >= TOUR_SECONDS };
  if (t < INTRO_SECONDS) return { ...base, ...introFrame(t), exposure: 0, intro: true, index: 0 };

  // dwelling?
  for (let i = 0; i < n; i++) {
    if (t >= arrive[i] && t <= depart[i]) {
      const w = tourPath[i];
      const f = w.dwellSeconds > 0 ? smooth((t - arrive[i]) / w.dwellSeconds) : 0;
      return { ...base, position: w.position, lookAt: lerp3(w.lookAt, w.panTo ?? w.lookAt, f), exposure: w.exposure ?? 0, intro: false, index: i };
    }
  }
  // moving: find the leg between two stops, ease over the whole leg
  // s = last stop (waypoint with a dwell) departed before t; e = next stop (or the final point)
  let s = 0;
  for (let i = 0; i < n; i++) if (tourPath[i].dwellSeconds > 0 && depart[i] < t) s = i;
  let e = s + 1;
  while (e < n - 1 && tourPath[e].dwellSeconds === 0) e++;
  const legStart = depart[s];
  const legEndT = arrive[e];
  const eased = legStart + smooth((t - legStart) / (legEndT - legStart)) * (legEndT - legStart);
  let k = s;
  while (k < e - 1 && eased > arrive[k + 1]) k++;
  const f = (eased - depart[k]) / (arrive[k + 1] - depart[k]);
  const u = (k + f) / (n - 1);
  const p = curve.getPoint(u);
  const look = lerp3(depLook(k), tourPath[k + 1].lookAt, smooth(f));
  const ex = (tourPath[k].exposure ?? 0) * (1 - f) + (tourPath[k + 1].exposure ?? 0) * f;
  return { ...base, position: [p.x, p.y, p.z], lookAt: look, exposure: ex, intro: false, index: k + 1 };
}
