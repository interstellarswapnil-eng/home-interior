# Exterior module: decisions and assumptions log

Newest first. **[open]** = waiting on your answer.

## 2026-10-02: structure corrected from site photos (Phase B)

From 4 site photos (kept local in `site_photos/`, git-ignored) and your answers. Review: `docs/exterior/SITE_REVIEW.md`.
- **SW corner:** one sloping, tapered blade column (`cornerColumn()` in `model/shell.ts`) replaces the slim corner column. Sizes are estimated from the photos.
- **Stilt overhang:** the columns under the west and south faces stand back `STILT_SETBACK` = 0.75 m; the first floor overhangs them. The depth is estimated (the photos show the overhang, not its size).
- **Stair tower:** one window per floor at the half landing, not two (you). The removed lower window `stair-a` is also gone from the slots and configs.
- **Kitchen window** (south, onto the kitchen balcony): **1.80 m wide** in the **shared floor plan** (`plan/plan.ts`), approved by you. The interior has it too. The interior's wall cabinet that overlapped it moved to the east wall beside the chimney (`kit-wall-e`, 0.85 m), as you asked.
- **Lift:** the brick room at the back of the stilt floor is the lift core, already modelled.
- Heights stay as they are (no measurements available).
- The interior `npm run smoke` 2D-export check now waits for both files (up to 15 s) instead of a fixed 2 s; the export takes 1.2–2.8 s.

## 2026-10-02: fixes: Day view broke when rotating; slow concept switching

- **Rotating after Dusk → Day smeared the view** (surfaces showing through each other). The dusk/night bloom uses postprocessing's EffectComposer, which switches the renderer's `autoClear` off and never switches it back. Day, Golden hour and Cloudy in Normal quality don't use the composer, so after the switch frames were drawn without clearing colour or depth. A still view hid it; any camera move showed it. Since Step 2 made Dusk the default, everyone hit it. Fix: `RestoreAutoClear` turns clearing back on when the composer goes away. The smoke test now checks for this.
- **Switching concepts at dusk took 6–18 s**: 98% of it was shader compilation. Each concept had a different number of real lights, and three.js builds the light count into every material's shader. The dusk/night lights are now a **fixed pool** per quality (Normal: 12 spot / 8 point / 12 rect; High: 24 / 12 / 14), with unused lights at zero intensity (`scene/nightLights.ts`). Street lamps come first, then the moves (hero first), then the facade slots, so if a design has more lights than the pool, the least important are dropped. Concept switches now take 0.1–0.2 s. Cost: the turntable at dusk runs 81–85 fps in Normal (was ~115) and 50–53 fps in High (was ~62).

## 2026-10-02: v2 Step 2: all 7 concepts in full 3D ("build all 7")

- **Dusk is the default view.** One switch for Day / Golden hour (sunset − 0.6 h) / Dusk / Night / Cloudy, in the quick bar and the View tab. Screenshots and tests that need sun ask for it explicitly.
- **Light fixtures are real objects** (`model/fixtures.ts`). Every glowing part of a move becomes a fixture: downlight, linear LED / cove, backlight panel, lantern, uplight, sconce or nameplate, each with a position, size, facing and colour temperature (2700 K for points, 3000 K for linear). The same list:
  - places the real light sources in 3D at dusk and at night, hero first. Normal quality caps it at 16 lights; High allows 40.
  - exports as a **Lighting schedule (CSV)** from the Save tab
  - feeds the lighting summary on the design sheet
- **Each hero has its own light.** C7's slatted roof got an LED strip under its street-side and side-road fascias. Before that, it only passed gate item 8 through the general facade lights.
- **Frames:** the radius slider now drives the rounded corners (`radii` marks which corners are rounded). C4's single big corner is 3.6 m (max 4.5). Frames can carry a soffit **lining** with downlights every 0.9 m.
- **UI:**
  - Style tab: concepts first, then the Architect's design, then earlier styles folded away; the moves, approval flags and quality gate below.
  - The **grey test** runs in the app: 320×240 offscreen renders of this design against the other concepts and the Architect's design.
  - Elements tab: Moves (Hero / Supporting / Crown / Threshold), then Details. When the hero also forms the crown (C2, C3, C4, C7), it is labelled "Hero move · also the crown".
  - The edit card names the move a surface belongs to.
  - View tab: "Show as" full colour / massing / grey.
- **Design sheet:** adds "The concept" (its moves), the measured approval flags (replacing the v1 optional-changes list) and lighting by type.
- **Board:** `npm run exterior:concepts3d` → `docs/exterior/v2/step2/concepts-3d.html` and `concepts-3d-board.jpg`.
- **Next: Step 3**, 2–3 palette variants per concept on the same form.

## 2026-10-02: v2 brief (exteriorV2.md / exteriorV2study.md), Step 1: concept thumbnails

- **Your answers:** the old styles stay as "Earlier styles" (saved designs keep working). Approval flags use the **assumed** margins until the real ones are known.
- **References:** the study's images 1–12 are files #0–#11 in `exterior_references` (checked against its descriptions).
- **Adapted to this building:** the study assumed a G+2 house in Pune. Here it's the G+3 stilt apartment in Ahilyanagar, which falls under the same UDCPR-2020. "Porch" becomes the gate, compound wall and ground-floor lobby.
- **Design moves** (`src/exterior/model/moves.ts`) are config-driven element generators, so concepts reuse palettes, compare, save and export:
  - `frame`: portal, picture, squircle or capsule, plus the quarter arc (by leaving sides out and giving one corner a big radius)
  - `bands`: streamline slab bands with an LED under-edge
  - `floatingRoof`: flat or tilted, solid or slatted
  - `lanterns`
  - upgraded v1 details: graded and backlit jaali, a jaali gate, a compound-wall band, a backlit nameplate on the compound wall
- **7 concepts** are in `config/patterns/c1…c7*.json`. Each has one hero, ≤ 3 supporting moves, a crown and a threshold, the study's hex values, accent roles, and its references. **For now each has one palette; the 2–3 variants come in Step 3.**
- **Approval flags** (`model/approval.ts`) are measured from the geometry against the assumed margins:
  - projection > 0.75 m (UDCPR 6.7(a))
  - narrowing the ~1.3 m side-road margin
  - supports on the ground in the front margin (6.7(k))
  - curved or projecting slab bands
  - new roof structures (6.7(e))
  - canopies (6.7(d))
  - new or resized openings
- **Quality gate:** items 1–8 are automated. Item 9 (balance) is judged by eye. Item 10, the **grey test**, is computed from renders: all-grey street-corner view in afternoon sun, building crop, mean grey-level difference to every other concept and the Architect's design, pass mark ≥ 4/255 (my calibration). A dead-on flat grey elevation hid all depth and made every concept look the same, which is why the grey test uses the street corner.
- **New looks and views:** a dusk sky (blue hour, warm afterglow in the west, lights and window glow on); `look=grey|massing`; long-lens elevation cameras for the south and west. **Dusk as the app default and the Day / Golden / Dusk / Night switch come in Step 2.**
- **Board:** `npm run exterior:board` → `docs/exterior/v2/step1/concepts.html` and `concepts-board.png`.
- **Results:** gate 9–10/10 for every concept (the open item is "balanced"). Flags: C1 3, C2 2, C3 3, C4 2, C5 3, C6 6, C7 5.

## 2026-10-02: side road on the west (windows side)

- **The plot is now a corner plot.** A road runs along the west, on the windows side, perpendicular to the main road on the south. Both roads are 7.5 m wide with a 2 m footpath along the plot [assumed widths]. They meet at the south-west corner, where the south footpath stops and the road crosses. The layout constants are in `building.ts` (`SOUTH_ROAD`, `WEST_ROAD`, footpaths).
- **Context:** the grey west neighbour (toggle) now stands across the side road. A third street lamp stands on the west footpath. All lamp arms now reach out over their road, with the night light under the lamp head.
- **Walk mode:** the west footpath is 0.1 m high and the side road is at road level.
- **Unchanged:** the compound wall on the west and both gates (south). Tell me if you want a gate or an entrance from the side road too.

## 2026-10-02: Phase 5 (compare, save, export) and shipping

- **Compare (E):**
  - Side by side uses two canvases with one shared camera: the view under the mouse leads and the other follows. Light and time apply to both.
  - Flip mode switches A ↔ B in one view with the Space key.
  - B can be any pattern's recommended look, the Architect's design, or a saved design.
- **Save (F):**
  - Named designs are kept in browser storage (`ext-saves:v1`) and can be saved, loaded, renamed, duplicated and deleted.
  - Undo/redo keeps up to 100 steps. Rapid repeats of the same edit (dragging a slider or the colour picker) merge into one step. Keys: Ctrl+Z, Ctrl+Y or Ctrl+Shift+Z.
  - JSON export/import uses the format `pasaydan-exterior-design` v1 and checks files with plain-language errors.
- **Export (G):**
  - Screenshot at 2× or 3× the screen resolution.
  - "Export all views" makes 11 PNGs plus `design.pasaydan.json` in one ZIP (own small ZIP writer, no new library; about 70 MB at 2×).
  - The design sheet is one self-contained HTML page with print styling, so "Print → Save as PDF" gives a PDF.
- **Optional changes (H):** `config/optional.json`, all off by default, labelled "Needs architect approval", and listed on the design sheet:
  - wider bedroom windows
  - sliding kitchen-balcony door
  - a road-side master window (the name sign moves up)
  - taller stair windows

  They only change openings; walls, frames and elements follow automatically.
- **Photo-quality still:** `three-gpu-pathtracer` **0.0.24**. 0.0.25 needs three-mesh-bvh 0.9, which conflicts with drei's 0.7, so 0.0.24 shares drei's copy and the interior is unaffected. It's lazy-loaded (56 KB gz) and pre-bundled in `vite.config.ts` so the first click doesn't reload the dev page. About 1–4 minutes per still on an integrated GPU.
- **Shipping:** the user asked to "ship everything once done": `feature/exterior` is merged into `main` and pushed to `origin`.

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
