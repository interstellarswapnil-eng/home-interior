# Exterior module: technical plan (Phase 0)

Status: **draft, waiting for approval**. No code is written until you approve this plan.

## 1. What exists today

| | |
|---|---|
| Stack | Vite 8 + React 18 + TypeScript, `three` 0.186 via `@react-three/fiber` 8 + `drei` 9 + `@react-three/postprocessing` (N8AO, SMAA, ACES tone mapping) |
| Layout | `plan/` = data (floor plan, materials, budget, tour); `components/` = React/R3F; `src/App.tsx` = the one page; `scripts/` = headless Chrome checks (puppeteer-core); `tests/` = vitest |
| How it runs | `npm run dev` → http://localhost:5173 · `npm test` · `npm run check` · `npm run smoke` · `npm run screenshots` |
| Navigation | No router. One page, with header buttons and URL params (`?view=3d&cam=…`) |
| Reusable pieces | `plan/plan.ts` (walls, openings, balconies: the floor plan), the PBR material pattern in `components/materials3d.tsx` (real-world UV scale, High/Performance quality), the CC0 asset pipeline in `scripts/fetch-assets.ts`, `drei` `PointerLockControls` (walk), the headless screenshot/smoke scripts, and the warm neutral UI style in `src/styles.css` |

## 2. Keeping the interior safe

- **No edits** to `plan/`, `components/`, `tests/`, `scripts/` or `public/` (existing files).
- The exterior **reads** `plan/plan.ts` (import only) so the facade follows the floor plan.
- Everything new goes in `src/exterior/`, `public/exterior/`, `scripts/exterior-*.ts`, `tests/exterior/`, `docs/exterior/`, plus one new `exterior.html`.
- **Only two shared files change, and only if you approve (Question 5):**
  - `vite.config.ts`: register `exterior.html` as a second page (about 5 lines).
  - `src/App.tsx`: one "Exterior →" link in the interior header (1–3 lines).
- After every phase I run the interior's own checks (`npm run check`, `npm test`, `npm run build`, `npm run smoke`) and report the results.

## 3. Import or rebuild?

There's no 3D file and no exterior drawing, so I'll **rebuild** the shell in code from `plan/plan.ts`, using #25/#28 for heights and proportions. Options considered:

| Option | Verdict |
|---|---|
| **A. Procedural rebuild from `plan.ts`** (recommended) | Exact match with the interior plan. Every surface is tagged with a role in code, so restyling is just data. No extra tools. |
| B. Hand-model in Blender, export GLB | Slower. Roles would have to be tagged by hand, and it drifts from the plan when the plan changes. |
| C. Wait for the architect's file | Blocks progress. If the architect later sends a **GLB** (preferred) or OBJ/FBX, I can add an "architect model" view for comparison. Restyling would still use the procedural shell. If they only have SketchUp/Revit, ask for: *File → Export → 3D Model → glTF/GLB (or OBJ), metres, with materials*. |

## 4. Folder layout

```
exterior.html                         second Vite page (its own <title>, same favicon style)
src/exterior/
  main.tsx, ExteriorApp.tsx           page shell: header (Interior | Exterior), 3D view, side panel
  config/                             ← data only: add patterns/palettes here, no code changes
    patterns/*.json                   one file per pattern (incl. its palettes + default elements)
    materials.json                    material library (kind, texture set, roughness, real size)
    elements.json                     element catalogue: labels, "What is this?" tips, params + ranges
    glossary.json                     plain-language tips (louver, jaali, parapet, plinth, soffit…)
  model/                              pure TypeScript, no React, unit-tested
    building.ts                       facts from BUILDING_FACTS.md (heights, floors, plot, facing)
    shell.ts                          plan.ts → facade surfaces {id, role, slot, floor, box/shape}
    openings.ts                       plan openings × 3 floors → IDs like "F2-win-kids-w"
    slots.ts                          named slots: frontFeatureWall, entrance, balconyFront-S, …
    elements/*.ts                     one generator per element type → mesh specs for a slot
    resolve.ts                        pattern + palette + overrides → final role→material/colour map
  state/                              design store (useSyncExternalStore, like immersiveStore),
                                      undo/redo history, saves (localStorage), JSON import/export
  scene/                              R3F: Shell, Elements, Site, Sky/Sun, Lights, Cameras, Walk,
                                      Compare (split view), Exporter
  ui/                                 panel tabs: Style, Colors, Elements, View, Compare, Save & export
  sun.ts                              sun position from lat/long/date/time (NOAA formula, ~60 lines)
public/exterior/textures/<set>/      1k JPG maps (albedo neutralised for tinting, normal, roughness)
public/exterior/hdri/                 clear sky, overcast, night (1k/2k HDR)
scripts/exterior-fetch-assets.ts      download + process CC0 textures (separate from the interior script)
scripts/exterior-shots.ts             headless: every preset view × patterns → docs/exterior/screenshots/
tests/exterior/*.test.ts              config validation, shell matches plan, resolve rules, sun, undo
```

## 5. Data model

This follows Section 11 of the prompt, with these additions:

- `SurfaceRole` adds `trim` (white slab edges and bands, which appear in #25/#28), `stiltColumn`, `soffit` per slab, and `sign` (name plate).
- `Surface { id, role, slot?, floor, side: 'N'|'S'|'E'|'W'|'roof', geom }`. Every mesh in the shell is a `Surface`, and clicking one shows its role and slot in plain words.
- `Slot { id, label, side, floors, rect }`: a named area an element can attach to. Starting list:
  - `masterSouthWall` (front feature wall)
  - `balconyFront-S`, `balconyFront-N`
  - `windowSurround-*` (per window)
  - `stairTowerWest`
  - `eastWall`
  - `terraceEdge`
  - `entrance` (ground lobby)
  - `compoundWall-front`, `gate`
  - `stiltBand`
- `ElementType` is **code**: one generator each for the 18 elements. `elements.json` and patterns only **switch them on and set parameters**. A new pattern or palette is a JSON change only. A brand-new *kind* of element (say, a new railing type) needs a generator. The README will say so plainly.
- `DesignState` is as in the prompt, plus `optional: Record<string, boolean>` for the "Needs architect approval" toggles (7H) and `variant` for the architect's A/B.
- **Resolve order** for each role: pattern defaults → palette → user overrides. **Locked** roles keep their value when the pattern or palette changes. Unit tests cover these rules.

## 6. Rendering and realism

- **One material per role per variant.** Meshes for a role are merged, so a style switch only updates about 15 materials. Recolouring changes `material.color`, which is instant: no rebuild, no reload, and the camera doesn't move.
- **Tinting.** Each texture's albedo is neutralised to mid-grey during processing, and the palette hex is multiplied in, so one wood or stone texture serves every palette and the average tone equals the hex (sRGB → linear handled by three.js colour management).
- **Repeated items** (slats, fins, jaali blocks, railing bars, pavers) use `InstancedMesh`. In Normal quality, jaali is an alpha-cut texture on a plane. In High quality it's real geometry.
- **Light:**
  - day HDRI + a directional sun from `sun.ts`, with the shadow frustum fitted tightly to the plot
  - ACES tone mapping (same as the interior)
  - N8AO ambient occlusion in High only
  - overcast mode: an overcast HDRI and a weak, soft sun
  - night mode: dark HDRI, real point/spot/rect lights for facade lights, emissive warm windows, light bloom
- **Glass:** reflective and slightly tinted, with a dark "room behind" box, so it is not see-through.
- **Small details:** sills, drip grooves, parapet coping, bevelled edges, and plaster joint lines on large walls, all generated with the shell.
- **Site:** ground, driveway, lawn or gravel, the compound wall and gate, low-poly trees and plants. Toggles for a car, a person, and grey neighbour blocks.
- **Quality modes:**
  - **Normal**: device pixel ratio ≤ 1.25, 2k shadows, no AO, 1k textures. Picked automatically on phones and tablets.
  - **High**: device pixel ratio ≤ 2, 4k shadows, AO, SMAA. Screenshots render at 2–3× resolution.
  - A path-traced still is optional (Question 5).
- **Loading:** textures load only when the active pattern needs them and are cached afterwards. Pattern thumbnails are rendered once from the live scene and cached (localStorage, as data URLs).

## 7. UI

- `exterior.html`: same header style as the interior, with a segmented **Interior | Exterior** switch.
- The house fills the screen. The side panel is collapsible, about 360 px wide, and neutral grey/white so it never competes with the facade colours. It becomes a bottom sheet on phones.
- Tabs, labels and tips as described in Section 9 of the prompt. "What is this?" tips come from `glossary.json`.

## 8. Features → where they live

| Feature | How |
|---|---|
| A. Views | `OrbitControls` with min/max distance and a polar limit (never below ground). A box around the building pushes the camera out of walls. Presets are computed from the building bounds (front/back/left/right relative to the facing). Smooth fly-to (about 0.8 s). Walk mode uses `PointerLockControls` with its own colliders (building, compound wall); touch joystick only if it turns out to be easy. Turntable. Sun slider with date/season. |
| B. Patterns | Cards with cached thumbnails; switching applies resolved materials and elements in one frame. |
| C. Colours | Palette swatches; a role picker or a click on a surface; `<input type=color>` + hex field + 5 suggestions from the pattern; lock; reset; a flat swatch next to the 3D view. |
| D. Elements | 18 element types, each with on/off, parameters and slot checkboxes. |
| E. Compare | One canvas split in two with drei `<View>` scissor viewports (one WebGL context, so it stays fast) and a shared camera. **Space** flips A/B. |
| F. Save | Named designs in localStorage: list, load, rename, duplicate, delete. Undo/redo (Ctrl+Z / Ctrl+Y, ≥ 50 steps). JSON export and import. |
| G. Export | PNG at 2–3× resolution. "Export all views" renders each preset and bundles them into **one self-contained HTML design sheet** (images embedded), so there's one download, not 13. **Print → PDF** from the browser. A separate "download PNGs" button is also included. |
| H. Optional changes | Toggles marked "Needs architect approval", off by default, listed in the design sheet. |

## 9. New libraries

**None are required.** Everything above uses what's already installed (three, R3F, drei, postprocessing). Optional extras, only with your OK:

- `three-gpu-pathtracer` (about 300 KB) for a path-traced "High quality still" button. Recommended only after Phase 4 looks good.

## 10. Textures (CC0)

These come from Poly Haven and ambientCG, at 1k resolution, as JPG. They are processed by `scripts/exterior-fetch-assets.ts` and credited in `docs/exterior/ASSET_CREDITS.md`. The exact assets are picked in Phase 2. Sets:

- smooth plaster, textured plaster/limewash
- wood planks (light and dark)
- charred wood
- stacked/ledge stone, sandstone, travertine, slate
- red brick (230 × 75 mm)
- concrete (board-formed + smooth)
- terracotta tile
- pavers, gravel, grass, perforated metal
- HDRIs: clear, overcast, night

Estimated size: 25–35 MB on disk, loaded per pattern (a typical pattern is about 5–8 MB).

## 11. Phase gates

At the end of every phase, I'll:

- commit on `feature/exterior`
- record the interior's checks
- take headless screenshots into `docs/exterior/screenshots/`
- write a plain-words summary
- wait for your OK
