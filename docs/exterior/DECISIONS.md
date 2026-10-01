# Exterior module: decisions and assumptions log

Newest first. **[open]** = waiting on your answer.

## 2026-10-01: Phase 3 (controls A–D)

- **Tabs:** Style · Colors · Elements · View. Compare and Save & export are shown but disabled until Phase 5.
  - A quick bar on the 3D view gives view, light and turntable in one click.
  - A flat paint-swatch strip sits on the view. Clicking a swatch opens that colour.
- **Views (A):** 13 presets with smooth 0.9 s camera moves:
  - like image 28
  - 4 sides, 4 corners at 45°
  - top (120 m up with a 16° lens, so it reads like a plan)
  - bird's-eye
  - street level at the gate (1.6 m)
  - entrance close-up

  Orbit limits: the camera never goes below 0.6 m and is pushed out of the flats' volume. The parking underneath stays reachable.
- **Walk mode:** pointer-lock, WASD/arrows, Shift to go faster, 1.6 m eye height above the real ground (road 0, footpath 0.1, plot 0.3, parking 0.45). You collide with walls, columns and the compound wall. **The pedestrian gate is now drawn slid open**, because it's the way in. Touch walking is not implemented (desktop only, like the interior).
- **Sun:** NOAA solar position for 19.09° N, 74.74° E, IST. Tests check solar noon ≈ 12:35, the June noon sun slightly north, and day length. The time slider runs from sunrise to sunset for the chosen date, with season shortcuts. True north = plan north [assumed].
- **Cloudy:** uniform grey sky light, weak soft sun. This is the mode for judging colours.
- **Night:** dark blue ambient light, rooms glow warm behind the glass, light fittings glow. **Real light sources and bloom come in Phase 4.**
- **Pattern cards (B):** thumbnails are rendered from the real model by a small offscreen renderer after the main view loads, then cached in browser storage, keyed by a hash of the pattern file.
- **Colours (C):**
  - **Locks:** switching pattern or palette keeps only locked roles. Locking an unedited role freezes its current look.
  - **Reset:** restores the pattern's colours.
  - **Suggestions:** the colours this role actually gets across all palettes, current pattern first.
  - **Material list:** filtered to what makes sense for the role (no brick railings).
- **Elements (D):** all 18 from the list now generate geometry. New this phase:
  - rounded corners / arches: a soft or arched window-frame ring, surface detail only, needs box frames
  - facade lighting fixtures
  - main door style (wood double / pivot / glass)
  - landscaping (trees, shrubs, stepping stones)
  - solar panels: 3 rows on a 2.2 m raised frame over the west terrace, tilted 19° south

  Each element has on/off, params and "where it goes" slot checkboxes, built from `config/elements.json`.
- **Click to select:** the card shows the role and slot in plain words, the colour, hex, suggestions, material and lock, plus "Adjust / Remove" for the element you clicked and "Add here" for the elements allowed at that spot.
- **Tests and scripts:**
  - `tests/exterior/`: sun, design reducer (locks, reset, elements), walk physics (gate, walls, ground)
  - `npm run exterior:smoke` clicks through everything in a real browser
  - `npm run exterior:perf`: pattern switch 10–130 ms, palette switch ≤ 130 ms, turntable ~140 fps (integrated GPU, both quality modes)

## 2026-10-01: Phase 2 (style system)

- **8 patterns in `src/exterior/config/patterns/`:** Architect's design, the 6 starting patterns, and Warm curves (my references). Each of the 7 non-architect patterns has 3 palettes, with one ★ recommended and the reason shown in the app. The Phase 0 base/plinth refinements are applied.
- **Section 6 column mapping:**
  - Main walls → `mainWall`
  - Second → `secondSurface`
  - Feature → `featureWall`
  - Metal → `windowFrame` + `railing` + `gate`
  - Base & paving → `base` + `paving`

  Other roles follow fallbacks in `roles.json`. Exceptions:
  - The brick palettes set concrete slab edges (`trim`); otherwise the slabs would turn to brick.
  - Warm curves sets a plain wood-look soffit, so the balcony ceilings aren't fluted.
- **Textures:** 16 CC0 Poly Haven sets plus a generated fluted normal map, 1k JPG, 11 MB in total. They're loaded only when a design uses them. Albedos are neutral grey (linear mean 0.5) and tinted by the palette colour × 2, so the average tone matches the hex exactly. Credits are in `ASSET_CREDITS.md`.
- **Real-world scale is calibrated by eye**, because Poly Haven's listed size didn't match the visible units for these two:
  - brick: 1.4 m per repeat, giving 85 mm courses and about 240 mm bricks
  - stone panels: 1.5 m, giving about 330 × 600 mm panels
- **Swapped textures:** the textured plaster was a peeling wall and the pavers were tactile tiles, so both were replaced. Plaster and limewash contrast was lowered so walls don't look blotchy.
- **New generators** (all config-driven, with params): slats/louvers, jaali, cladding, sunshades, roof overhang, pergola, canopy (concrete / glass / wood pergola, over the lobby door or the pedestrian gate), parapet styles (thin / band / glass) and stone base. Also a slatted gate style. **The parapet and the column base sleeves moved from the fixed shell into elements**, so patterns can change them.
- **Planned (catalogued, generated in later phases):** rounded corners/arches, facade lighting, main door style, landscaping, solar panels. Patterns already list them; they're ignored until their generators exist.
- **Light tuned** (sun 1.7, exposure 0.72) so cream reads as cream. Colour judging will be done in the Phase 4 overcast mode.
- **Speed:** pattern switch 50–200 ms, palette switch 50–175 ms (`npm run exterior:perf`). Target ≈ 1 s.

## 2026-10-01: Phase 1 (building model)

- **Shell is code, not a file.** `src/exterior/model/shell.ts` builds every wall, opening, slab, balcony, column and the site from `plan/plan.ts` + `building.ts`. It's pure data, unit-tested in `tests/exterior/model.test.ts`.
- **Walls are full floor-to-floor height** (3.2 m), so there's no visible slab line on plain walls (as in #28). The **stair tower** runs continuously from the ground to the head room, with no floor bands. The white **band above the parking** (0.45 m) stops at the stair tower, as in #28.
- **Stilt columns** are 300 × 450 mm on an assumed grid (11 columns), with a 0.6 m plinth sleeve (`base` role).
- **Levels:**
  - road 0
  - plot paving +0.30
  - stilt floor +0.45, reached by a ramp in front of the parking
- **Extra roles** added to the prompt's list:
  - `trim` (white slab edges and bands)
  - `column`
  - `balconyFront`
  - `sill`
  - `door` (balcony doors)
  - `fins`
  - `planter`, `greenery`
  - `interior` (dark rooms behind the glass)
  - `context`, `road`

  Missing roles fall back along a chain in `config/roles.json` (e.g. `soffit` → `featureWall`).
- **Architect's design (#28)** is `config/patterns/architect.json`:
  - taupe box frames on the master and kids windows
  - white fins on the kids window and on the balcony sides
  - white boxes on the stair windows
  - curved solid + glass balcony fronts
  - wood-look feature recess and soffits
  - planter edge over the top front balcony
  - compound wall with pilasters and black bar gates
  - name sign "पसायदान" on the road-facing wall
- **Rear balconies** get the same curved front as the road side. #28 doesn't show them [assumed].
- **Lighting is basic for now**: procedural sky + a fixed afternoon sun from the south-west with soft shadows. Real sun path, overcast, night, HDRI and AO come in Phase 4.
- **Shared files changed** (approved): `vite.config.ts` registers `exterior.html` as a second page, and `src/App.tsx` has the Interior | Exterior switch in the header. The interior's checks (30/30), tests and smoke test all pass.

## 2026-10-01: your answers to the Phase 0 questions

- **Q1:** #25/#28 are your building. **#28 is the current design** → "Architect's design" = #28. #25 is not modelled.
- **Q2:** the road is on the **south**. The plan arrow is ignored. In #28 the balcony face = south, and the stair-window face = west (it matches the plan's openings).
- **Q3:** plot = **2 gunthas (202.3 m²)**. Assumed rectangle 13.0 × 15.56 m: 1.32 m side margins, 1.40 m rear, 2.53 m front.
- **Q4:** stilt parking + 3 identical flats, no penthouse. Heights as assumed in Phase 0.
- **Q5:** shared files may change (`vite.config.ts`, a nav link in `src/App.tsx`). **Photo-quality still button wanted** → `three-gpu-pathtracer` (supports three ≥ 0.185) gets added in Phase 4.
- **Plan wins over render on window positions.** #28 shows the bedroom windows a little differently from the plan. The model uses the plan's positions and applies #28's treatments to them:
  - taupe box frame → master window
  - white vertical fins → kids window
  - white boxes → stair windows
- **The name sign "पसायदान"** goes on the master bedroom's blank **south** wall, which faces the road.

## 2026-10-01: Phase 0

- **Branch:** all exterior work is on `feature/exterior`. `main` keeps the interior exactly as it is.
- **Input folder:** it has 29 JPEG references only, no plan or 3D file. The floor plan is the interior module's `docs/floor-plan-source.jpg` / `plan/plan.ts`.
- **Your building = #25/#28 ("Pasaydan")** [open, Q1]. Stilt + 3 floors and one flat per floor match the "typical 1st to 3rd floor" plan.
- **Facing** [open, Q2]. Section 0 says south. The plan arrow and the renders hint at a west road or a corner plot.
- **Plot size** [open, Q3]. Assumed footprint + 3.0 m front margin and 1.5 m elsewhere (≈ 13.4 × 16.1 m).
- **Heights** [assumed]:
  - plinth 0.45 m
  - stilt floor 3.0 m
  - residential floor to floor 3.2 m (10′ clear + 150 mm slab)
  - terrace parapet 1.05 m
  - stair/lift head room 3.0 m above the terrace
- **Stair windows**: 2 per floor, staggered on the west wall [assumed from #25/#28; not dimensioned on the plan].
- **Rebuild, don't import:** procedural shell from `plan/plan.ts`, read-only, so inside and outside stay in sync.
- **Interior untouched:** only `vite.config.ts` (second page) and one header link in `src/App.tsx` would change, and only with approval [open, Q5].
- **No new libraries needed.** A path tracer is optional [open, Q5].
- **Climate rules applied to palettes:**
  - darker plinth (base) than paving
  - wood colours mean wood-look HPL/WPC/aluminium outdoors
  - pure white and dark main walls are kept but not recommended
- **Proposed pattern "Warm curves" (My references)** with 3 palettes. ★ Ivory & teak.
- **Config format:** JSON in `src/exterior/config/`, checked by a vitest schema test, so adding a pattern or palette is a JSON-only change.
