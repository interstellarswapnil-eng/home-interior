/** Shared helpers for element generators. */
import { FLATS } from "./building";
import type { FacadeOpening, Part } from "./types";

export type ElementConfig = { enabled: boolean; slots?: string[]; params?: Record<string, unknown> };
export type ElementCtx = {
  openings: FacadeOpening[];
  /** Set when the roundedCorners element is on: window frames get soft corners or arches. */
  soft?: { radius: number; arches: boolean };
};
export type Gen = (id: string, cfg: ElementConfig, ctx: ElementCtx) => Part[];

export const num = (p: Record<string, unknown> | undefined, k: string, d: number) => (typeof p?.[k] === "number" ? (p[k] as number) : d);
export const str = <T extends string = string>(p: Record<string, unknown> | undefined, k: string, d: NoInfer<T>) => (typeof p?.[k] === "string" ? (p[k] as T) : d);
export const FLOORS = Array.from({ length: FLATS }, (_, i) => i + 1);

/** Openings that belong to a window slot ("win:<planId>"). */
export const slotOpenings = (slot: string, ctx: ElementCtx) => ctx.openings.filter((o) => `win:${o.planId}` === slot);

/** Outward direction sign along the facade normal: S/W faces point to −y/−x. */
export const outSign = (side: "N" | "S" | "E" | "W") => (side === "S" || side === "W" ? -1 : 1);
