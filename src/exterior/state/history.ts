/**
 * Undo / redo around the design reducer. Rapid repeats of the same edit (dragging a slider, moving the colour picker)
 * are merged into one step, so Undo goes back to where the drag started.
 */
import { designReducer, type DesignAction } from "./design";
import type { DesignState } from "../model/resolve";

export type History = { past: DesignState[]; present: DesignState; future: DesignState[]; lastKey?: string; lastT?: number };
export type HistoryAction = DesignAction | { type: "undo" } | { type: "redo" };

const MAX = 100;
const MERGE_MS = 700;

/** Edits of the same thing in quick succession share one undo step. */
function keyOf(a: DesignAction): string {
  switch (a.type) {
    case "roleColor":
    case "roleMaterial":
      return `${a.type}:${a.role}`;
    case "elementParam":
      return `param:${a.id}:${a.key}`;
    case "rename":
      return "rename";
    default:
      return `${a.type}:${Math.random()}`; // never merged
  }
}

export function historyReducer(h: History, a: HistoryAction, now = Date.now()): History {
  if (a.type === "undo") {
    if (!h.past.length) return h;
    return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
  }
  if (a.type === "redo") {
    if (!h.future.length) return h;
    return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
  }
  const next = designReducer(h.present, a);
  if (next === h.present || JSON.stringify(next) === JSON.stringify(h.present)) return h;
  const key = keyOf(a);
  if (key === h.lastKey && h.lastT !== undefined && now - h.lastT < MERGE_MS) return { ...h, present: next, future: [], lastT: now };
  return { past: [...h.past, h.present].slice(-MAX), present: next, future: [], lastKey: key, lastT: now };
}

export const initHistory = (d: DesignState): History => ({ past: [], present: d, future: [] });
