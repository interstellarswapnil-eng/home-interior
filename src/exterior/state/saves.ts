/**
 * Named designs, kept in this browser (localStorage), plus JSON export / import so a design can be
 * backed up, moved to another computer or sent to someone.
 */
import { PATTERNS, type DesignState } from "../model/resolve";

export type SavedView = { camera?: string; sky?: string; hour?: number; date?: string };
export type SavedDesign = { id: string; name: string; savedAt: string; design: DesignState; view?: SavedView };

const KEY = "ext-saves:v1";
const FORMAT = "pasaydan-exterior-design";

export function listSaves(): SavedDesign[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(list: SavedDesign[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false; // storage blocked or full; the JSON export still works
  }
}

const newId = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Save as a new design (or overwrite `id`). Returns the saved entry. */
export function saveDesign(design: DesignState, view: SavedView, id?: string): SavedDesign {
  const list = listSaves();
  const entry: SavedDesign = { id: id ?? newId(), name: design.name || "My design", savedAt: new Date().toISOString(), design, view };
  const i = list.findIndex((s) => s.id === entry.id);
  if (i >= 0) list[i] = entry;
  else list.unshift(entry);
  write(list);
  return entry;
}

export function renameSave(id: string, name: string) {
  const list = listSaves().map((s) => (s.id === id ? { ...s, name, design: { ...s.design, name } } : s));
  write(list);
}

export function duplicateSave(id: string): SavedDesign | undefined {
  const s = listSaves().find((x) => x.id === id);
  if (!s) return;
  const name = `${s.name} (copy)`;
  return saveDesign({ ...s.design, name }, s.view ?? {});
}

export function deleteSave(id: string) {
  write(listSaves().filter((s) => s.id !== id));
}

// ---------------------------------------------------------------------------
export function designToJson(design: DesignState, view: SavedView): string {
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), design, view }, null, 2);
}

/** Parse an exported design file; throws a plain-language error if it isn't one. */
export function designFromJson(text: string): { design: DesignState; view?: SavedView } {
  let o: { format?: string; design?: DesignState; view?: SavedView };
  try {
    o = JSON.parse(text);
  } catch {
    throw new Error("This file is not a design file (it is not valid JSON).");
  }
  if (o.format !== FORMAT || !o.design) throw new Error("This file is not a Pasaydan exterior design.");
  const d = o.design;
  if (!PATTERNS.some((p) => p.id === d.patternId)) throw new Error(`Unknown design pattern "${d.patternId}".`);
  return {
    design: { name: d.name ?? "Imported design", patternId: d.patternId, paletteId: d.paletteId, overrides: { roles: d.overrides?.roles ?? {}, elements: d.overrides?.elements ?? {} }, optional: d.optional ?? {} },
    view: o.view,
  };
}

/** Save a text or data-URL file in the browser. */
export function download(name: string, data: string | Blob, type = "application/json") {
  const url = typeof data === "string" && data.startsWith("data:") ? data : URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (!url.startsWith("data:")) setTimeout(() => URL.revokeObjectURL(url), 5000);
}
