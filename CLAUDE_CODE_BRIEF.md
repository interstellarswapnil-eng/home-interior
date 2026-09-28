# Claude Code Brief — 2BHK Interior 2D + 3D Design

Use this document as the single source of truth. Do not invent room sizes, room roles, or finishes that contradict it. Prefer accurate scaled geometry over visual flair.

---

## 1. Project goal

Build an interactive **2D floor-plan design** and a **3D interior model** for an under-construction 2BHK apartment in **Ahilyanagar, Maharashtra (India)**, styled **lighter modern**, suitable for a **family with 1 child**, total interiors budget **₹8–10 lakh**.

Deliverables Claude Code must produce:

1. **Scaled 2D plan** (top-down) with rooms labeled, dimensions, furniture footprints, and north/south notes.
2. **3D model / walkthrough** of the same layout (orbit + room cameras at minimum).
3. **Material & finish schedule** tied to the lighter-modern palette.
4. **Budget sheet** (line items summing to ₹8–10 lakh) that matches what is shown in 2D/3D.
5. **README** with how to run the app locally.

---

## 2. Site & climate constraints (design rules)

- Location: Ahilyanagar — hot, dusty summers; monsoon moisture.
- Kitchen balcony faces **south** → afternoon heat; provide shade device + full shutter door in the model.
- Lift core is inside the unit → treat walls shared with lift as **acoustic buffer** (wardrobes / insulation noted in schedule).
- Prefer **light** floors and laminates (dust + heat). Avoid pure stark white floors; use soft off-white / light grey / warm beige.

---

## 3. Authoritative layout (from architectural plan)

Label on drawing: **typical 1st to 3rd floor**. Units on plan are **feet and inches**. Convert to meters for 3D as `1 ft = 0.3048 m`. Keep internal consistency; show both ft and m in the 2D dimension overlay if easy.

### 3.1 Room program (roles are fixed — do not swap)

| Space | Size (plan) | Role |
|---|---|---|
| Living | 14' × 16'3" | Living / lounge, opens to kitchen |
| Kitchen (KIT) | 14' × 11'6" | Open kitchen to living |
| Upper bedroom | 12'4" × 10'6" | **Kids room (1 child)** |
| Lower bedroom | 12'2" × 10'6" | **Master bedroom** |
| Bath between bedrooms | 8' × 4' | **Attached to master** |
| Bath near kitchen | 4' × 7' | **Guest washroom** |
| Former wash-basin niche (by guest bath / lift) | small niche | **Storage room** (full-height shutters) |
| Lift | 5' × 6' | Existing; not redesigned |
| Living balcony | 4'6" depth | Off living, double doors |
| Kitchen balcony | 4' depth | **South-facing** service balcony |
| Staircase | shared core | Outside private rooms; show for context |

### 3.2 Spatial relationships (must match plan)

- Living and kitchen form an open right-hand wing; kitchen is toward the bottom of the plan, living toward the top.
- Bedrooms stack on the left: **upper = kids**, **lower = master**.
- Master door access connects to the **8' × 4'** bath between the two bedrooms (model a door from master into that bath).
- Guest washroom sits near kitchen / foyer; storage room replaces the wash-basin niche beside that zone.
- Entrance / foyer circulation passes the lift, then into living; wash niche is **storage**, not a basin.
- Furniture already suggested on plan (use as starting footprints, refine for 1 kid + lighter modern):
  - Living: 3-seater + 2 chairs + coffee table toward living balcony.
  - Kitchen: L-shaped counter (bottom + right walls on plan), sink + hob, fridge pocket on left kitchen wall.
  - Each bedroom: double bed + 2 side tables + full wardrobe on marked wall — **kids room uses a single bed**, not double, plus study desk at window.

### 3.3 Rebuild accuracy checklist

Before calling 2D/3D done, verify:

- [ ] Living 14' × 16'3"
- [ ] Kitchen 14' × 11'6", open to living
- [ ] Kids 12'4" × 10'6" (upper)
- [ ] Master 12'2" × 10'6" (lower)
- [ ] Master ensuite 8' × 4'
- [ ] Guest bath 4' × 7'
- [ ] Storage room at former basin niche
- [ ] Living balcony 4'6"; kitchen balcony 4' south
- [ ] Lift 5' × 6" shown
- [ ] Door swings roughly match plan logic

---

## 4. Design language — lighter modern

### 4.1 Palette

- Walls: warm off-white / soft white (not clinical blue-white).
- Floors (dry areas): light grey or warm beige **vitrified tile**, mid-format (e.g. 600×600 or 800×800).
- Wet areas (both baths, kitchen wet strip, south balcony): **anti-skid** light tile.
- Wardrobes / kitchen carcass & shutters: matte **white or light oak** laminate; thin black or brushed-nickel handles.
- Soft furnishings: performance fabric in light neutrals (greige, sand, soft taupe); avoid dark heavy curtains — sheer + light blackout.
- Metals: thin black or brushed nickel only; no ornate brass for primary look.

### 4.2 Kitchen specifics (locked)

- Counter: **artificial granite @ ~₹110 / sq ft**.
- Color: pale — soft white with faint grey vein OR light beige; no busy dark pattern.
- Edge: simple straight or small bevel.
- Finish: polished or light leather-matte.
- Layout: **L-shaped**; hob and sink on **different** legs; fridge on marked fridge wall.
- Chimney above hob (Indian tadka-capable, shown in 3D).
- Door to south balcony: full shutter; add exterior shade (roller / louvers) on balcony.
- Splash: same artificial granite strip or matching light tile behind hob & sink.

### 4.3 Room-by-room furniture (model these)

**Living (14' × 16'3")**

- 3-seater sofa + 2 lounge chairs + coffee table toward balcony doors.
- Optional slim TV unit on a long wall (light laminate).
- Keep clear circulation from foyer into living and through to kitchen.

**Kitchen (14' × 11'6")**

- L-counter with artificial granite top.
- Base + wall units in light laminate; tall unit / fridge housing.
- Service balcony south with washing tap zone if space allows (simple).

**Master (lower, 12'2" × 10'6")**

- Queen bed, 2 side tables, light full-wall wardrobe on marked wall (use wardrobe as lift-noise buffer where wall adjoins core).
- Door into 8' × 4' ensuite: WC + shower + basin in efficient wet layout; glass shower screen; large-format light tiles.

**Kids (upper, 12'4" × 10'6") — 1 child**

- Single bed (not bunk), study desk at window, chair, full wardrobe with clothes + toy/book zones.
- Soft rounded corners on desk/bed where reasonable.

**Guest washroom (4' × 7")**

- Compact WC + basin + shower; hard-wearing anti-skid; simple light tiles; no fragile niches.

**Storage room (ex-basin niche)**

- Full-height shutters, same laminate language as kitchen; broom / vacuum / linen zones labeled in 2D.

---

## 5. Budget — ₹8–10 lakh (target ~₹9 lakh)

All costs are **interior fit-out estimates** for Ahilyanagar mid-market labour + material. Keep the 3D contents inside this envelope; if something is shown, it must appear in the budget sheet.

| Head | Target (₹) | Notes |
|---|---:|---|
| Modular kitchen (incl. artificial granite top @ ~110/sq ft, chimney, sink) | 1,80,000–2,20,000 | L-shape; light laminate |
| Wardrobes (master + kids) | 1,60,000–2,00,000 | Full-wall, light laminate |
| Flooring (supply + lay) | 1,00,000–1,40,000 | Vitrified dry + anti-skid wet/balcony |
| Master ensuite + guest bath (tiles, sanitary, CP fittings mid-range) | 90,000–1,20,000 | Efficient layouts |
| Storage room shutters + internals | 25,000–40,000 | |
| False ceiling + lighting (living, kitchen, bedrooms) | 80,000–1,10,000 | Simple trays / coves; LED |
| Paint / wall finish | 50,000–70,000 | Off-white |
| Living furniture (sofa set, centre table, TV unit) | 1,00,000–1,40,000 | Performance fabric |
| Beds, study desk, side tables, mattresses (basic–mid) | 70,000–1,00,000 | 1 single + 1 queen |
| Doors (internal) / hardware upgrades | 40,000–60,000 | Solid-core bedroom doors for lift noise |
| Curtains / sheers | 25,000–40,000 | |
| Balcony shade + misc / contingency | 40,000–60,000 | South kitchen balcony |
| **Total** | **~8,00,000–10,00,000** | Stay inside band |

Budget rules for Claude Code:

- Default build to **~₹9,00,000** mid-case.
- Every major mesh/object in 3D that is “bought” must map to a budget line.
- Do **not** show imported marble flooring, full home automation, or premium Italian fittings — out of band.
- Mark optional upgrades clearly if shown as toggles (e.g. quartz upgrade) but default scene = budget palette.

---

## 6. Technical build instructions (Claude Code)

### 6.1 Recommended stack

Build a **local web app** (unless the user already has a repo with another stack — then adapt):

- **Vite + React + TypeScript**
- **2D:** SVG (preferred) or Canvas — true scale, pan/zoom, layer toggles (walls / furniture / dimensions / labels)
- **3D:** React Three Fiber + Drei + Three.js — extruded walls from the same plan data
- **Single source of geometry:** one `plan.ts` (or JSON) with coordinates in meters; both 2D and 3D read from it
- **UI:** simple room switcher, orbit controls, dimension toggle, material legend, budget panel
- **No paid APIs required** for the MVP

Alternative only if user insists: Sweet Home 3D / Blender pipeline — still export the same `plan` data and budget CSV. Default to the web app above.

### 6.2 Project structure (suggested)

Starter stubs already exist in this folder — **use them as-is**, then build UI around them:

```
/plan/plan.ts          # READY — rooms, openings, furniture, area asserts (meters)
/plan/materials.ts     # READY — lighter-modern palette + finishes
/plan/budget.ts        # READY — ~₹9L lines, inBand() helper
/docs/floor-plan-source.jpg  # source plan image
/components/Plan2D.tsx
/components/Scene3D.tsx
/components/BudgetPanel.tsx
/components/Legend.tsx
/public/assets/        # optional textures — keep lightweight
README.md
CLAUDE_CODE_BRIEF.md   # this file
```

### 6.3 Geometry rules

- Origin: pick one corner of the unit (e.g. bottom-left of overall footprint); document it in README.
- Wall thickness: exterior ~200 mm, interior ~100 mm (approximate if plan doesn’t specify).
- Door width default 3'0" (0.9 m) unless plan implies otherwise; balcony living doors as double leaf.
- Ceiling height default **10'0" (3.05 m)** unless user overrides — common Indian residential.
- South kitchen balcony: tag orientation in data (`facing: "south"`).
- Do not place a washbasin in the storage room.

### 6.4 Build phases (execute in order)

**Phase A — Data**

1. Encode full plan into `plan.ts` from Section 3.
2. Unit tests or assertions: room areas within ~2% of plan lengths × widths.
3. Commit room role labels exactly as in Section 3.1.

**Phase B — 2D**

1. Render walls, openings, rooms, lift, stair context.
2. Furniture footprints per Section 4.3.
3. Dimension strings in ft-in (and m secondary).
4. Color-code rooms lightly; print-friendly toggle (black/white).
5. Export button: PNG and SVG of current 2D view.

**Phase C — 3D**

1. Extrude walls; add floor slabs per room material.
2. Place furniture as simple on-brief proxies (box-modeled is OK if proportions are right; refine if time).
3. Kitchen L-counter with pale artificial-granite material; chimney; fridge.
4. Glass shower panel in master bath; south balcony shade.
5. Cameras: overview orbit, living, kitchen, master, kids, foyer.
6. Daylight: stronger light from south balcony + living balcony; avoid pitch-black rooms.

**Phase D — Budget & docs**

1. Budget panel from `budget.ts`; total between 8–10 lakh.
2. Material schedule view matching Section 4.
3. README: `npm install`, `npm run dev`, brief summary of controls.
4. Screenshot set: 2D plan + 4 room 3D views saved under `/docs/screenshots/`.

### 6.5 Acceptance criteria

Done when:

- 2D and 3D share the same plan data (moving a wall in data updates both).
- Room roles match Section 3.1 (kids upper, master lower + ensuite, guest bath, storage).
- Kitchen shows pale artificial granite L-counter and south balcony treatment.
- Style reads lighter modern (light floors, light laminates, minimal hardware).
- Budget total ∈ ₹8–10 lakh and lines match visible scope.
- App runs locally with clear README; no crash on room camera switch.

### 6.6 Out of scope (unless user asks later)

- Structural changes to lift/stair
- Working drawings for contractor stamp / municipal
- Photoreal exterior building
- VR app stores
- Live cost scraping from vendor sites

---

## 7. Copy-paste starter prompt for Claude Code

Paste this into Claude Code in an empty project folder (attach the floor-plan image if available):

```
Read CLAUDE_CODE_BRIEF.md end-to-end and implement Phase A→D without skipping acceptance checks.

Constraints:
- Follow room roles and sizes exactly from the brief (kids = upper bedroom, master = lower + 8'×4' ensuite).
- Lighter modern + artificial granite kitchen counters ~₹110/sq ft (pale).
- Kitchen balcony faces south.
- Storage room replaces wash-basin niche; guest bath is the 4'×7' near kitchen.
- Budget ₹8–10 lakh; default ~₹9 lakh sheet must match what you model.
- Single plan.ts drives both SVG 2D and R3F 3D.
- Indian residential assumptions: ceiling 10', mm wall thicknesses as in brief.

Start from the existing plan/plan.ts, plan/materials.ts, and plan/budget.ts stubs (do not recreate from scratch). Run assertPlanAreas() and budgetMeta.inBand() first, then build 2D, then 3D, then budget panel + README.
When finished, print the checklist from section 3.3 and 6.5 with pass/fail.
```

---

## 8. Locked decisions log (do not re-ask)

- City: Ahilyanagar
- Household: family, **1 kid**
- Style: **lighter modern**
- Upper bedroom: **kids**
- Lower bedroom: **master**
- Bath between bedrooms (8'×4'): **master ensuite**
- Bath near kitchen (4'×7'): **guest washroom**
- Wash-basin niche: **storage room**
- Kitchen balcony: **south**
- Kitchen counter: **artificial granite ~₹110 / sq ft**, pale
- Interiors budget: **₹8–10 lakh**

Unknowns Claude may assume with defaults (and list in README):

- Exact flat level / wing beyond “typical 1–3”
- Ceiling height → 10'
- Exact kid age → primary-school capable study desk
- Brand SKUs → generic mid-market Indian
