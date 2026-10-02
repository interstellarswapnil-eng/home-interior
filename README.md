# 2BHK Interior — Ahilyanagar (2D + 3D)

An interactive 2D floor plan and 3D model of a typical 1st to 3rd floor 2BHK in Ahilyanagar, Maharashtra. The style is **lighter modern**, planned for a family with one child, with an interiors budget of **₹8–10 lakh**.

`CLAUDE_CODE_BRIEF.md` is the single source of truth. The source drawing is `docs/floor-plan-source.jpg`.

![2D plan](docs/screenshots/plan-2d.png)

## Exterior module

A realistic 3D model of the outside of the building (Pasaydan, Ahilyanagar: stilt parking + 3 flats, corner plot with the main road on the south and a side road on the west) that you can restyle. You can switch design patterns, colour sets, materials and facade elements. The building itself stays as the architect designed it. The exterior reads the same floor plan as the interior (`plan/plan.ts`) and never changes it.

![Warm curves pattern](docs/exterior/screenshots/p4-photo-still.png)

### Run it

```bash
npm install
npm run dev          # then open http://localhost:5173/exterior.html
```

You can also click **Exterior** in the interior app's header. Chrome or Edge work best.

### What you can do

| Tab | |
|---|---|
| **Style** | **7 design concepts** (C1 Travertine Lantern … C7 Deccan Veranda). Each is built around one bold hero move, with a crown on top and a designed gate and compound wall. Next come the Architect's design for comparison and the 7 earlier styles (folded away). Below them: the concept's moves, its **approval flags** (what needs the architect's OK, measured from the geometry) and a **quality gate** of 10 checks, including a **grey test** that renders every concept all-grey to prove the form is distinct. Colour sets come with a "Good to know" note on climate, upkeep and cost. |
| **Colors** | Pick any surface (or click it on the building), then change its colour (picker, hex, suggestions) or its material. **Lock** a colour to keep it when you switch pattern. **Reset** restores the pattern's colours. The flat paint colours always show at the top-left of the view. |
| **Elements** | For a concept: its **moves** first (hero, supporting, crown, threshold), each with depth, face width, corner radius and light. Then the smaller elements, each with on/off, size and spacing, and where it goes. **Bigger changes** that need the architect's approval (wider windows, a sliding balcony door, a road-side window, taller stair windows) are off by default and listed separately. |
| **View** | 15 camera views, including flat road-side and side-road elevations. Light presets: Day, Golden hour, **Dusk (the default)**, Night and Cloudy (best for judging colours). Facade lights are real fixtures placed by each move. "Show as" full colour, massing or grey. Walk around (W A S D + mouse), turntable, and sun by time of day and date for Ahilyanagar. **Surroundings from the site photos** (the neighbours, coconut palms, the side-road tree, pole and wires). **Compare with a site photo**: lay one of your photos over the view (see-through and lens sliders); it stays on your computer. Normal or High quality. **Photo-quality still** (path traced, about 1–4 minutes). Car, person and neighbour buildings for scale. |
| **Compare** | Your design (A) next to any pattern or saved design (B), side by side with one shared camera, or flipped in place with the **Space** key. |
| **Save & export** | Named designs (save, load, rename, duplicate, delete). Undo/redo (Ctrl+Z / Ctrl+Y). Design file export and import (JSON). A screenshot at 2× or 3× resolution. **Export all views** as a ZIP of PNGs. A **design sheet** for the architect: one HTML page with every surface's material and hex, the elements, the concept's moves, its approval flags, a lighting summary and the views, with "Print / save as PDF". A **lighting schedule (CSV)** lists every fixture with its type, position, height and colour temperature, for the electrician. |

Clicking any surface shows what it is in plain words, for example "Window box frames · Master bedroom window · 2nd floor · west face". From there you can change its colour or material, or add slats, fins, jaali or sunshades at that spot.

### Add a pattern or a colour set (config only, no code)

Everything style-related lives in `src/exterior/config/`. Every file in `patterns/` is picked up automatically.

**Add a colour set to a pattern.** Add this to the pattern's `palettes` list in `src/exterior/config/patterns/<pattern>.json`:

```json
{
  "id": "terracottaSand",
  "name": "Terracotta & sand",
  "note": "Shown under the swatches.",
  "roles": {
    "mainWall":      { "material": "plaster",     "color": "#E3D5BF" },
    "secondSurface": { "material": "terracotta",  "color": "#B5654A" },
    "featureWall":   { "material": "woodLook",    "color": "#7A5236" },
    "windowFrame":   { "material": "metalMatte",  "color": "#2A2A2A" },
    "railing":       { "material": "metalMatte",  "color": "#2A2A2A" },
    "gate":          { "material": "metalMatte",  "color": "#2A2A2A" },
    "base":          { "material": "stonePanels", "color": "#9C9080" },
    "paving":        { "material": "stonePaving", "color": "#C9BCA4" }
  }
}
```

Surfaces you leave out follow sensible defaults: balcony ceilings use the feature wood, slab edges and the roof edge match the main walls, and box frames use the second colour. Add `"recommended": true` to make it the pattern's ★ pick (one per pattern).

**Add a new pattern.**
1. Copy `patterns/warmMinimal.json` to `patterns/<newId>.json`.
2. Change `id`, `name`, `description`, `notes` and `palettes`, and set `defaultPaletteId`.
3. Switch elements on or off under `elements`. The element ids and their settings are in `config/elements.json`.

**Check your change.** Run `npm test`. It checks colours, materials, slots and geometry for every pattern and colour set.

More detail, including how to add a material and what does need code, is in [`docs/exterior/ADDING_STYLES.md`](docs/exterior/ADDING_STYLES.md).

### Commands

| Command | What it does |
|---|---|
| `npm test` | All tests, including 102 exterior tests (v2: concepts, flags, gate, fixtures): plan match, openings, no flicker, every pattern/palette, sun, locks, undo, walk, save files, zip, design sheet |
| `npm run exterior:smoke` | Clicks through every tab, pattern, element, view, light mode, compare, save/undo and all three exports in headless Chrome/Edge |
| `npm run exterior:perf` | Style-switch times and fps (Normal, High, night) |
| `npm run exterior:shots` | Regenerates `docs/exterior/screenshots/` |
| `npm run exterior:board` | v2 Step 1 board: grey + accent elevations of every concept, with flags, quality gate and grey test (`docs/exterior/v2/step1/`) |
| `npm run exterior:concepts3d` | v2 Step 2 board: every concept in full 3D at dusk, by day, from the side road and at the gate (`docs/exterior/v2/step2/`) |
| `npm run exterior:assets` / `exterior:hdri` | Re-download the CC0 textures / sky images (already committed) |

### Notes

- **Docs:** `docs/exterior/`
  - `BUILDING_FACTS.md`: every dimension and whether it comes from the plan, a render, or an assumption
  - `REFERENCE_ANALYSIS.md`: your 29 reference images
  - `DECISIONS.md`: the log of decisions
  - `ASSET_CREDITS.md`: CC0 sources
- **Assumptions to check:**
  - plot shape: 2 gunthas as a 13.0 × 15.56 m rectangle
  - floor heights
  - column grid
  - plan north = true north
- **Speed on an integrated laptop GPU:** pattern switches take 10–150 ms. Frame rates: Normal ~140 fps, High ~100 fps, night with real lights ~65–125 fps.
- **Walk mode** works on desktop only. On a phone or tablet the app loads in Normal quality and you can rotate the building and switch styles.

## Run it

```bash
npm install
npm run check        # Phase A boot checks: room areas/dims ±2%, topology, budget band + mapping
npm run dev          # http://localhost:5173
```

Other scripts:

| Command | What it does |
|---|---|
| `npm test` | Vitest: `assertPlanAreas()`, `budgetMeta.inBand()` and every boot check |
| `npm run build` | Type-check and production build |
| `npm run smoke` | Headless Chrome/Edge clicks every camera (all wall modes), layer, panel and export; fails on any page error |
| `npm run screenshots` | Regenerates `docs/screenshots/` (2D plan + 3D views) |
| `npm run perf` | fps for High vs Performance at four eye-level tour stops on this machine's GPU |
| `npm run fetch-assets` | Re-downloads and recolours the CC0 textures / HDRI / model into `public/` (already committed) |
| `npm run immersive` | Walk / Tour / Record end-to-end: saves tour stills, walks with real key presses, records the full tour and checks the video (add `-- --no-record` to skip the ~70 s recording) |

`smoke`, `screenshots`, `immersive` and `perf` use `puppeteer-core` with your installed Chrome or Edge on the real GPU, so nothing extra is downloaded. Set `CHROME_PATH` if detection fails, or `SOFTWARE_GL=1` on a machine without a usable GPU.

## Controls

- **Header:** switch between `2D`, `2D + 3D` and `3D`, and choose a side panel (`Budget`, `Materials`, `Checks`).
- **2D plan:** scroll to zoom and drag to pan. Toggle the walls, furniture, dimensions and labels layers, and switch to **print (B/W)**. **Fit** resets the view. **Export SVG/PNG** saves the whole plan. Double-click a room to jump the 3D camera there.
- **3D:** drag to orbit, right-drag to pan, scroll to zoom. The camera buttons are Overview, Living, Kitchen, Master, Kids, Foyer / hall and South balcony. **Walls: auto** shows a 1.2 m cutaway (dollhouse view) in the overview and full 10′ walls in room views. You can force either one.
- **Budget panel:** hover a line to highlight the objects it pays for in both the 2D and 3D views.
- **3D mode toggle:** `Orbit` (above) | `Walk` | `Tour` — see [Immersive walkthrough + video](#immersive-walkthrough--video).
- **Quality:** `High` | `Performance` in the 3D toolbar — see [Realism layer](#realism-layer).
- **URL params** (used by the scripts): `?view=2d|3d|split&cam=living&walls=full&panel=none&dims=0&mode=orbit|walk|tour&tourT=12&quality=high|performance`. For debugging, `&cp=x,y,h&ct=x,y,h&fov=60` places the orbit camera at a plan position (metres).

## Realism layer

Brief: `REALISM_CLAUDE_PROMPT.md`. Geometry, room roles and budget are unchanged, and the 2D plan and budget panel are untouched. Orbit, Walk, Tour and Record all use the upgraded look.

![Living — High quality](docs/screenshots/3d-living.png)

- **Lighting.** A soft neutral daylight HDRI (`small_empty_room_1`) provides environment light only; the background is not replaced, so rooms keep their walls. ACES Filmic tone mapping.
- **Sun.** Comes from the east (the living/kitchen window side) with soft shadows. An invisible roof slab casts shadow, so sunlight only enters through windows and doors.
- **Window light.**
  - North living balcony: cool, bright area light.
  - South kitchen balcony: warm door light, plus a low afternoon-sun wash on the balcony floor under the greige roller shade.
  - Other windows: soft sky area lights.
- **PBR materials.** `plan/materials.ts` → `materialLibrary`, built by `components/materials3d.tsx`. Every texture repeats at real-world scale:
  - 600×600 vitrified tile in dry rooms (UVs in metres)
  - 300 mm anti-skid tile in wet areas
  - pale speckled artificial granite with a faint vein
  - light-oak and matte-white laminate
  - greige performance fabric, linen, sheers
  - brushed nickel and matte-black metal, black glass, porcelain, mirror
  - glass: the shower screen uses true transmission; windows and balcony doors use reflective transparent glass
- **Furniture** (`components/Furniture3D.tsx`), built to the `plan.ts` footprints:
  - sofa and lounge chairs with separate crowned seat cushions, reclined back cushions, rounded arms, throw pillows and tapered oak legs
  - queen bed with a channel-tufted headboard, rounded mattress, duvet with fold-over and side drape, pillows and throw
  - single bed in oak with rounded corners; kids desk with drawer pedestal and rounded top; kids chair
  - wardrobes with 3 mm shutter gaps, a loft line, recessed plinth and black profile handles; the kids wardrobe has open oak book/toy shelves
  - kitchen: separate matte shutters, profile handles, 40 mm granite top, 600 mm granite splash, oak wall units with under-cabinet LED, black-glass hob with pan supports and knobs, steel sink with drainer grooves and a black gooseneck mixer, T-hood chimney, steel fridge with housing
  - bathrooms: vessel basin on an oak vanity, LED mirror, WC, rain shower
  - master bedside tables: the Poly Haven CC0 `side_table_01` model, re-skinned in the project oak
- **Design details** (`plan/details.ts`, derived from the plan):
  - 90 mm skirting on every wall face of dry rooms, skipping door gaps (about 49 m)
  - false-ceiling trays with LED cove in living and master
  - 30 downlights
  - door frames and oak architraves, solid flush leaves with black levers
  - pleated sheers with light-blackout side panels (gathered at the balcony doors)
  - granite window sills
  - louvred full-height storage shutters
  - black MS rail on the balcony parapets
- **Budget.** Nothing new was added to the budget. Skirting falls under paint; trays, cove and downlights under the false-ceiling + LED line; frames and architraves under doors. There's no marble, gold hardware or extra decor.

### Quality toggle: High vs Performance

| | High (default) | Performance |
|---|---|---|
| HDRI environment | ✓ | ✓ |
| Colour (albedo) textures | ✓ | ✓ |
| Normal + roughness maps | ✓ | — |
| Soft shadows (east sun) | ✓ | — |
| Ambient occlusion (N8AO, half-res) + SMAA | ✓ | — |
| Shower glass transmission | ✓ when you're in or at the ensuite* | fallback transparent glass |
| Fill light | HDRI + window area lights | + warm hemisphere light |
| Pixel ratio | up to 2 | up to 1.25 |

\*True transmission costs a full extra render pass whenever the glass is on screen, so it only switches on in or at the door of the ensuite, at half resolution.

**fps** (`npm run perf`, headless Chrome on an **AMD Radeon 740M integrated GPU**, 1600×900, DPR 1, at the living / kitchen / master / kids tour stops). Numbers vary between runs because of thermals, so these are ranges over repeated runs:

| Quality | Average fps | Slowest stop |
|---|---|---|
| High | 37–54 | ~33 (master) |
| Performance | 63–69 | ~33+ |
| High, inside the ensuite (glass transmission on) | ~29 | |

Both modes meet the ≥30 fps walk target on this mid-range laptop GPU. On software-only rendering (no GPU), use Performance. Re-record the tour video after changing quality: the recording captures whatever is on screen.

Asset sources and licences are in [`docs/ASSET_CREDITS.md`](docs/ASSET_CREDITS.md). Everything is CC0 from Poly Haven, or generated in this project.

### Realism acceptance checklist

| Item | Status | Evidence |
|---|---|---|
| Walls / floors / granite / laminate / fabric read as distinct real materials under environment lighting | PASS | `docs/screenshots/3d-*.png`, tour stills |
| Sofa, beds, tables are detailed models (not boxes), scaled to plan anchors | PASS | parametric models at the `plan.ts` footprints + CC0 glTF side table |
| Kitchen shows granite vein, chimney, splash, matte shutters, visible handles | PASS | `3d-kitchen.png`, `04-tour-kitchen.png` |
| Skirting, sheers, ceiling lights, door frames in main rooms | PASS | `plan/details.ts`; tour stills show trays, downlights, frames |
| South balcony heat/shade still readable; north living balcony brighter | PASS | `05-tour-south-balcony.png` (warm floor wash under the shade), `03-tour-living-balcony.png` |
| Walk / Tour still work; Record captures the richer look | PASS | `npm run immersive`: walls stop the player; 1280×720 H.264 MP4, 66.8 s |
| ASSET_CREDITS.md lists texture/model sources + licences | PASS | `docs/ASSET_CREDITS.md` |
| High vs Performance toggle documented | PASS | this section |

## Immersive walkthrough + video

Brief: `IMMERSIVE_VIDEO_CLAUDE_BRIEF.md`. This builds on the existing scene; the apartment geometry is unchanged.

![Tour — living](docs/screenshots/immersive/02-tour-living.png)

### Walk (first person)

1. In the 3D pane, choose **Walk**. You start in the foyer, facing the living room, at 1.6 m eye height.
2. Click **Click to explore** to lock the mouse, then use:
   - **mouse** to look
   - **W A S D** / arrow keys to move
   - **Shift** to sprint
   - **Esc** to release the mouse
3. You collide with walls, window sills, balcony parapets, the lift core, the closed entry door and storage shutters, and furniture. Collision boxes come from `plan/plan.ts` (`plan/collision.ts`), and you slide along walls instead of sticking. Every internal door and both balcony doors are open and passable, so you can't leave the flat.
4. The room you're standing in shows top-left.

Walk is **desktop-only in v1** (keyboard + mouse). Touch controls are not implemented.

### Tour (cinematic, ~66 s)

Choose **Tour**, and it plays once. The path is:

- 3 s drone establishing shot, then a white fade to eye level
- **Foyer** → **Living** → living balcony
- **Kitchen** → a look out over the **south kitchen balcony** (shade + shutter door; the path never steps onto the slab)
- **Master bedroom** → **Master ensuite** peek
- **Kids room** → back to the living room

Room titles fade in at each stop. Use **Pause / Resume**, **Replay**, or click the progress bar to seek. Waypoints live in `plan/tour.ts` (world XYZ, Y = 1.6). A single pure `tourState(t)` drives the camera, titles, fades and exposure. Tests sample the whole path every 20 ms to confirm it never clips walls, furniture or the lift, and that it stays 45–75 s long.

### Record a video

- **Tour → ● Record tour:** restarts the tour from 0:00, records it, and downloads `ahilyanagar-2bhk-walkthrough.mp4` (or `.webm`) when it ends. **■ Stop (cancel)** discards the recording.
- **Walk → ● Record walk:** records your live session. **■ Stop & save** downloads it.

How the capture works:

- Each frame of the WebGL canvas (`preserveDrawingBuffer`) is copied into a fixed **1280×720** canvas, with the room titles and fades drawn on top. That canvas is recorded with `captureStream(30)` + `MediaRecorder` at 8 Mbps. The titles are drawn into the video itself, because HTML overlays aren't captured.
- While recording, the render pixel ratio is raised so the 3D canvas is at least 1280 px wide, which keeps the capture sharp and the same size whatever your window size is.
- Codec: **H.264 MP4** where `MediaRecorder` supports it (current Chrome/Edge). Otherwise **VP9/VP8 WebM**. **Chrome or Edge work best.** Firefox records WebM. Safari support varies.
- The tour clock follows real time while recording. A slow GPU drops frames rather than producing slow motion.
- Verified headless on the GPU: one click → 1280×720 H.264 MP4, 66.8 s for the 66.4 s tour, about 49 MB at 8 Mbps (`npm run immersive`). To shrink it for WhatsApp: `ffmpeg -i ahilyanagar-2bhk-walkthrough.mp4 -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p walkthrough-small.mp4`.

Convert WebM → MP4 (e.g. for WhatsApp) with ffmpeg:

```bash
ffmpeg -i ahilyanagar-2bhk-walkthrough.webm -c:v libx264 -pix_fmt yuv420p walkthrough.mp4
```

### Stills

`docs/screenshots/immersive/` holds `00-tour-intro` through `09-tour-living-end` (one per tour stop) plus `walk-spawn` / `walk-living`.

| | |
|---|---|
| ![Kitchen](docs/screenshots/immersive/04-tour-kitchen.png) | ![South balcony](docs/screenshots/immersive/05-tour-south-balcony.png) |
| ![Master](docs/screenshots/immersive/06-tour-master.png) | ![Kids](docs/screenshots/immersive/08-tour-kids.png) |

### Immersive acceptance checklist

| Item | Status | Evidence |
|---|---|---|
| Mode toggle: Orbit / Walk / Tour | PASS | 3D toolbar; `npm run smoke` switches modes and orbit cameras afterwards with 0 errors |
| Walk: pointer lock, WASD, eye 1.6 m, no wall clipping, doors passable | PASS | `tests/immersive.test.ts` walks foyer→living→kitchen→master→kids through doors and is stopped by walls, entry door, lift, parapet; `npm run immersive` repeats it with real key presses |
| Tour: 45–75 s path hits foyer, living, kitchen, master, kids; titles show | PASS | 66.4 s; stop and title tests; no clipping over 20 ms samples |
| South kitchen balcony acknowledged in tour | PASS | "South kitchen balcony" stop looks out over the slab without walking onto it |
| Record downloads a playable walkthrough video of the tour | PASS | headless run: `.mp4`, 1280×720, 65.7 s, metadata read back by a `<video>` element |
| Existing 2D plan + budget still work | PASS | `npm run check` 30/30, `npm run smoke` (2D layers, exports, budget hover, orbit cameras) |
| README documents controls + ffmpeg convert tip | PASS | this section |

Phase IV extras included: the 3 s establishing shot and an exposure lift at the balcony views. Not done: footsteps, frame-accurate export, and screenshot-strip export.

**Phase 2 (not implemented):** for offline 4K marketing video, evaluate **Remotion + `@remotion/three`** reusing these meshes, with the camera driven by `useCurrentFrame()` instead of R3F `useFrame`. `tourState(t)` is already a pure function of time, so it would map directly onto frame numbers. A WebCodecs/mediabunny frame-accurate encoder is the lighter alternative if realtime capture drops frames on low-end machines.

## How it's built

```
plan/plan.ts        rooms, walls, openings, furniture (meters) + assertPlanAreas()/assertPlanDims()
plan/geometry.ts    wall splitting around openings, ft-in formatting (shared by 2D and 3D)
plan/materials.ts   lighter-modern palette + finish schedule
plan/budget.ts      INR line items + budgetMeta.inBand(); each line lists the model ids it pays for
plan/checks.ts      boot checks used by `npm run check`, vitest and the in-app Checks panel
components/Plan2D.tsx      SVG plan (pan/zoom, layers, dimensions, export)
components/Scene3D.tsx     R3F scene: walls extruded from plan walls/openings, floors, lights, cameras
components/Furniture3D.tsx box-modelled furniture proxies at true proportions
components/BudgetPanel.tsx, Legend.tsx, ChecksPanel.tsx
plan/details.ts             skirting runs, false-ceiling trays, downlight points
components/materials3d.tsx  PBR material library → three.js (real-world texture scale, quality modes)
components/Architecture3D.tsx walls, floors, doors/frames, windows/sills, stair, ceilings, skirting
plan/collision.ts           walk colliders from plan walls/openings/furniture + sliding movement
plan/tour.ts                tour waypoints, walkSpawn, pure tourState(t)
components/WalkControls.tsx    PointerLockControls + WASD + collision
components/TourController.tsx  tour clock → camera
components/VideoRecorder.tsx   1280×720 compositor + MediaRecorder
components/ImmersiveHUD.tsx    lock overlay, titles, tour transport, record controls
src/App.tsx         layout / state
```

**One geometry source.** Both views read `plan/plan.ts`. If you move a room, wall, opening or piece of furniture there, the SVG plan and the 3D scene both update.

**Coordinates.** Units are metres, with `1 ft = 0.3048 m`. The origin is the **SW inside corner of the master bedroom**. +X is east and +Y is north. In 3D, plan `(x, y)` maps to world `(x, height, −y)`. Room rectangles are clear (inside-face) sizes, and walls sit outside them: exterior 200 mm, interior 100 mm, lift shaft 150 mm.

### Layout refinements vs. the stub

Room sizes and roles are exactly as in the stub. The placement was re-fitted to match the source drawing:

- **West stack (south→north):** master, then the 8′×4′ bath, then kids, then the shared stair.
- **Middle strip:** guest bath (south), then the hall, then the storage room (the former basin niche under the lift), then the lift.
- **East wing:** kitchen (south), open to living (north). The balconies are north (living) and south (kitchen).
- **Entry:** from the common lobby (north of the lift) into the living room's NW corner, as drawn.
- **Master ensuite:** the drawing's bath door from the hall is replaced by a door from the master (brief §3.2). The master wardrobe stays on the marked north wall, between the ensuite door and the room door.
- **Kitchen:** the drawing puts the sink and hob on the same leg. The brief requires different legs, so the **sink is on the south leg** under the window and the **hob and chimney are on the east leg**.
- **Remainders:** a 0.46 m plumbing duct fills the gap between the master and the guest bath. The kitchen balcony is modelled at 14′ wide, aligned with the kitchen.

## Budget (default scene)

| Head | ₹ |
|---|---:|
| Modular kitchen (L, pale artificial granite ~₹110/sqft, chimney, sink) | 1,90,000 |
| Wardrobes — master + kids | 1,70,000 |
| Flooring — vitrified dry + anti-skid wet/balconies | 1,10,000 |
| Master ensuite + guest bath | 95,000 |
| Storage room shutters + internals | 30,000 |
| False ceiling + LED lighting | 85,000 |
| Paint (warm off-white) | 55,000 |
| Living furniture — sofa, centre table, TV unit | 1,00,000 |
| Beds, study desk, side tables, mattresses | 75,000 |
| Internal doors / hardware | 40,000 |
| Sheers + light blackout | 25,000 |
| South balcony shade + wash zone + contingency | 25,000 |
| **Total** | **10,00,000** |

`npm run check` confirms three things:

- Every furniture item and non-builder door in the model maps to a budget line.
- Every id a line lists exists in the model.
- The total is inside the band.

Out of band and not modelled: marble, home automation, Italian fittings.

> **Note:** the stub total is **₹10,00,000**, which sits exactly on the upper limit. It passes `inBand()`, but any addition will fail the band check. The balcony/contingency line (₹25k) is also below the brief's ₹40–60k guide. To get back to the brief's ~₹9 L mid-case, trim about ₹50–80k elsewhere, for example kitchen → ₹1.8 L, wardrobes → ₹1.6 L and flooring → ₹1.0 L, and move ₹15k into balcony/contingency. I left the stub amounts unchanged because the brief says to fix stubs only when checks fail.

## Assumptions (brief §8 defaults)

- Flat level: typical 1st–3rd floor. Ceiling height 10′ (3.05 m).
- Kid's age: primary school, so the study desk is 3′6″ × 2′ at the west window.
- Brands: generic mid-market Indian. Entry door, windows and balcony glazing are builder-supplied, so they are not in the budget.
- The fridge appliance is the owner's; the budget covers the fridge housing/loft. The TV set is not modelled.

## Screenshots

| | |
|---|---|
| ![Overview](docs/screenshots/3d-overview.png) | ![Living](docs/screenshots/3d-living.png) |
| ![Kitchen](docs/screenshots/3d-kitchen.png) | ![Master](docs/screenshots/3d-master.png) |
| ![Kids](docs/screenshots/3d-kids.png) | ![South balcony](docs/screenshots/3d-south-balcony.png) |

The foyer/hall view is at `docs/screenshots/3d-foyer.png` and the full app is at `docs/screenshots/app-split-budget.png`.

## Acceptance checklist (brief §3.3 + §6.5)

| Item | Status | Evidence |
|---|---|---|
| Living 14′×16′3″; kitchen 14′×11′6″ open to living | PASS | `assertPlanDims`, no wall between the two rooms |
| Kids upper 12′4″×10′6″; master lower 12′2″×10′6″ | PASS | dims + "kids north of master" check |
| Master ensuite 8′×4′ (door from master); guest bath 4′×7′; storage at ex-basin niche | PASS | dims + topology checks; storage has no basin |
| Living balcony 4′6″; kitchen balcony 4′ south; lift 5′×6′ shown | PASS | dims + `facing: "south"` |
| Door swings roughly match plan logic | PASS | 2D arcs, 3D leaves open along the same swing |
| 2D and 3D share `plan.ts` | PASS | both import `plan/plan.ts`; walls split by the shared `plan/geometry.ts` |
| Lighter modern + pale artificial granite L + south balcony shade/shutter door | PASS | materials check, 3D views |
| Budget total ∈ ₹8–10 L and lines match visible scope | PASS | `inBand()` true (₹10,00,000, at the upper limit); mapping check |
| App runs locally; room camera switch does not crash | PASS | `npm run smoke` (every camera in 3 wall modes, 0 page errors) |

Out of scope: structural changes to the lift or stair, municipal working drawings, photoreal exterior, VR, live vendor pricing.
