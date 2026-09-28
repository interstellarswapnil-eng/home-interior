/**
 * Tiny shared store for Walk / Tour / Record. Continuous values (tour clock, title opacity,
 * walk position) are read by rAF loops; discrete changes notify React via useImmersive().
 */
import { useSyncExternalStore } from "react";
import { TOUR_SECONDS, tourState, type TourFrame } from "../plan/tour";

export type ImmersiveMode = "orbit" | "walk" | "tour";

type State = {
  mode: ImmersiveMode;
  /** Tour clock (s) — the single source of timing for camera, titles and recording. */
  tourT: number;
  tourPlaying: boolean;
  tourFrame: TourFrame;
  walkLocked: boolean;
  walkPos: { x: number; y: number; yaw: number };
  walkRoom: string;
  recording: false | "tour" | "walk";
  recordStart: number;
  glCanvas: HTMLCanvasElement | null;
};

export const immersive: State = {
  mode: "orbit",
  tourT: 0,
  tourPlaying: false,
  tourFrame: tourState(0),
  walkLocked: false,
  walkPos: { x: 0, y: 0, yaw: 0 },
  walkRoom: "",
  recording: false,
  recordStart: 0,
  glCanvas: null,
};

let version = 0;
const listeners = new Set<() => void>();

/** Update discrete state and notify subscribers. */
export function setImmersive(patch: Partial<State>) {
  Object.assign(immersive, patch);
  version++;
  listeners.forEach((l) => l());
}

export function useImmersive(): State & { version: number } {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
  return { ...immersive, version };
}

export const tour = {
  play() {
    if (immersive.tourT >= TOUR_SECONDS) immersive.tourT = 0;
    setImmersive({ tourPlaying: true });
  },
  pause() {
    setImmersive({ tourPlaying: false });
  },
  replay() {
    immersive.tourT = 0;
    immersive.tourFrame = tourState(0);
    setImmersive({ tourPlaying: true });
  },
  seek(t: number) {
    immersive.tourT = Math.max(0, Math.min(TOUR_SECONDS, t));
    immersive.tourFrame = tourState(immersive.tourT);
    setImmersive({});
  },
};
