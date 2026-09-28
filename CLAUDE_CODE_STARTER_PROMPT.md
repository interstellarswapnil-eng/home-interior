# Paste this into Claude Code

(Unzip/copy the interior-design pack into your project folder first so these paths exist: `CLAUDE_CODE_BRIEF.md`, `plan/plan.ts`, `plan/materials.ts`, `plan/budget.ts`, `docs/floor-plan-source.jpg`.)

---

Read `CLAUDE_CODE_BRIEF.md` end-to-end and implement the 2D + 3D interior design app for this Ahilyanagar 2BHK. Follow the brief as the single source of truth.

## Hard constraints (do not renegotiate)

- **Style:** lighter modern (warm off-white walls, light vitrified floors, matte white / light oak laminates, thin black or brushed-nickel handles).
- **Rooms (locked):**
  - Upper bedroom = **kids** (1 child) — single bed + study desk at window + full wardrobe.
  - Lower bedroom = **master** — queen bed + wardrobe; **8'×4' bath between bedrooms is master ensuite**.
  - **4'×7' bath near kitchen** = guest washroom.
  - Former wash-basin niche = **storage room** (full-height shutters; broom/vacuum/linen).
- **Kitchen:** open to living; **L-shaped** counter; **artificial granite ~₹110/sqft**, pale shade; hob and sink on different L legs; chimney; fridge on marked wall.
- **Kitchen balcony faces south** — full shutter door + exterior shade in the model.
- **Budget:** ₹8–10 lakh interiors; default sheet ~₹9–10 lakh must match what you model (`budgetMeta.inBand()` must pass).
- **No** marble upgrades, home automation, or premium Italian fittings in the default scene.

## Start from existing stubs (do not recreate from scratch)

Use these files as-is and build the UI around them:

- `plan/plan.ts` — meter geometry, rooms, openings, furniture, `assertPlanAreas()`
- `plan/materials.ts` — palette + finishes
- `plan/budget.ts` — INR line items + `budgetMeta`
- `docs/floor-plan-source.jpg` — source floor plan (refine wall jogs / lift-foyer strip against this if needed)

First commands in your work:

1. Run / verify `assertPlanAreas()` — all locked rooms must PASS within 2%.
2. Verify `budgetMeta.inBand()` is true.
3. Only then scaffold the app.

## Tech stack

- Vite + React + TypeScript
- **2D:** SVG from the same plan data (pan/zoom, dimension toggle, labels)
- **3D:** React Three Fiber + Drei + Three.js (extrude walls from `plan.ts`)
- One geometry source: both 2D and 3D read `plan/plan.ts`
- Local only; no paid APIs for MVP

## Build order

**Phase A — Boot checks**  
Wire `assertPlanAreas()` and budget band checks into README or a small script; fix any stub issues only if checks fail.

**Phase B — 2D**  
`Plan2D` SVG: walls, rooms, lift, stair context, furniture footprints, ft-in dimensions, room colors, export PNG/SVG.

**Phase C — 3D**  
`Scene3D`: extrude walls, room floors from `materials.ts`, furniture proxies with correct proportions, pale granite L-counter, chimney, glass shower in master bath, south balcony shade. Cameras: orbit overview + living, kitchen, master, kids, foyer. Readable daylight from north living balcony and south kitchen balcony.

**Phase D — Budget + docs**  
Budget panel bound to `budget.ts`. Material legend. README with `npm install` / `npm run dev` and controls. Save screenshots under `docs/screenshots/` (2D plan + four 3D room views).

## Acceptance (print pass/fail when done)

From brief §3.3 and §6.5:

- [ ] Living 14'×16'3"; kitchen 14'×11'6" open to living
- [ ] Kids upper 12'4"×10'6"; master lower 12'2"×10'6"
- [ ] Master ensuite 8'×4'; guest bath 4'×7'; storage at ex-basin niche
- [ ] Living balcony 4'6"; kitchen balcony 4' south; lift 5'×6" shown
- [ ] 2D and 3D share `plan.ts` (data change updates both)
- [ ] Lighter modern + pale artificial granite kitchen + south balcony treatment
- [ ] Budget total ∈ ₹8–10 lakh and lines match visible scope
- [ ] App runs locally; room camera switch does not crash

## Out of scope

Structural changes to lift/stair, municipal working drawings, photoreal exterior, VR stores, live vendor price scraping.

When finished, summarize what you built, how to run it, and the pass/fail checklist.
