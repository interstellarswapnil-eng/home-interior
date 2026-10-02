# Building facts: exterior module

Everything the exterior model is built from, in one place. Each value is tagged:

- **[plan]**: from the floor plan (`docs/floor-plan-source.jpg`, already encoded in the interior module's `plan/plan.ts`)
- **[render]**: estimated from the reference renders that look like this building (images #25 and #28, see "Which images show this building" below)
- **[assumed]**: my assumption. Please confirm or correct these.

Units are metres, with feet in brackets. Plan coordinates follow the interior module: the origin is the inside SW corner of the master bedroom, +X is east, and +Y is north.

## Which images show this building

`exterior_references/` contains **29 JPEG images and nothing else**: no floor plan, no architect's 3D file, no PDF.

Two of them, **#25** (`19.40.04 (1).jpeg`) and **#28** (`19.40.05.jpeg`), show the same apartment block from the same corner. It has stilt parking, 3 residential floors, a stair tower, one stack of balconies, and the Marathi name sign "पसायदान" (*Pasaydan*). That matches the "typical 1st to 3rd floor" plan the interior module is built on. **Confirmed by you: this is your building. #28 is the current design**, and it is the "Architect's design" baseline. #25 is an older variant and is not modelled.

- #25: rounded window box frames, glowing vertical LED groove, curved balcony parapets.
- #28: square box frames, white vertical fins in the side recesses, and the same balconies.

How #28 maps onto the plan (confirmed against the openings): the **balcony face is the south face (the road side)**. Per floor it has the kitchen-balcony door on the left and the kitchen window on the right, exactly as on the plan. The face with the staggered stair windows is the **west** face, with the stair tower at its north (left) end.

## Overall

| Item | Value | Source |
|---|---|---|
| Building type | Apartment block: stilt (parking) ground floor + 3 identical residential floors, **one 2BHK flat per floor**, no penthouse | [plan] + your answer |
| Location | Ahilyanagar (Ahmednagar), Maharashtra. Lat **19.09° N**, long **74.74° E** | Section 0; coordinates [assumed: city centre] |
| Front of the building faces | **South**: the main road is on the south (confirmed). The arrow on the plan drawing is ignored | Section 0 + your answer |
| Side road | **West** (the windows side): a second road perpendicular to the main road, so the plot is a **corner plot** | your request, 2026-10-02 |
| Road widths | Both roads 7.5 m, each with a 2.0 m footpath along the plot; they meet at the south-west corner | [assumed] |
| Plot size | **2 gunthas = 202.3 m² (2,178 sq ft)** [you]. Shape [assumed]: rectangle **13.0 m (E–W) × 15.56 m (N–S)**, giving margins of 1.32 m on the east and west, 1.40 m at the rear (north) and 2.53 m at the front (south, from the balcony face) | your answer + [assumed] |
| Plot shape | The source drawing has a slanted line across the top (north), which may be a non-rectangular plot boundary. Modelled as a rectangle for now | [plan] drawing; [assumed] |

## Footprint (per residential floor)

| Item | Value | Source |
|---|---|---|
| Overall, including balconies | **10.36 m E–W × 11.64 m N–S** (34′0″ × 38′2″) | [plan] `planBounds()` |
| Exterior wall thickness | 200 mm | [plan] |
| West face | One straight wall, x = −0.20, from y = −0.20 to 10.35 (**10.55 m**) | [plan] |
| South face | Master bedroom wall at y = −0.20 (x −0.20 → 3.91). Steps back **1.0 m** to y = 0.81 behind the duct and guest bath (x 3.91 → 5.59). Then the kitchen balcony projects forward to y = −0.50 (x 5.59 → 10.16) | [plan] |
| East face | One wall, x = 10.16, from y = 0.81 to 9.67 (**8.86 m**). The two balconies' end parapets continue it at the north and south ends | [plan] |
| North face | Stair + common lobby block reaches y = 10.35 (x −0.20 → 5.69). Living wall at y = 9.67 (x 5.54 → 10.16), with the living balcony projecting to y = 11.14 | [plan] |
| Built-up area per floor | About 100 m² (≈1,075 sq ft) including walls, stair and lobby, excluding balconies | [plan] computed |

## Heights

| Item | Value | Source |
|---|---|---|
| Plinth (ground floor level above road) | 0.45 m (1′6″) | [assumed] |
| Stilt (parking) floor, floor to floor | 3.00 m (clear ≈ 2.85 m under beams) | [render] proportions; [assumed] |
| Residential floor to floor | **3.20 m**: 3.05 m (10′) clear ceiling + 150 mm slab | Ceiling [plan] (interior module); slab [assumed] |
| Floors | Ground = stilt; 1st, 2nd, 3rd = identical flats | [plan] + [render] |
| Terrace level | 0.45 + 3.00 + 3 × 3.20 = **13.05 m** above road | computed |
| Terrace parapet | 1.05 m (same as the balcony parapet height used inside) | [plan] (balconies); [assumed] (terrace) |
| Stair head room + lift machine room | Over the NW stair/lift core, **3.0 m** above the terrace. Top ≈ 16.0 m | [render] tower at the far left of #25/#28; [assumed] height |
| Balcony slab edge | 150 mm thick, with a deeper 300–450 mm fascia band in the renders | [render] |

## Openings (every residential floor, all builder-supplied)

IDs follow the interior module so inside and outside stay linked. In 3D, each one gets a floor prefix (`F1-`, `F2-`, `F3-`). Sill and head heights are measured from that floor's finished level.

| ID | Side | What | Width | Sill → head | Position along the wall | Source |
|---|---|---|---|---|---|---|
| `win-master-w` | West | Master bedroom window | 1.52 m (5′) | 0.90 → 2.10 | y 0.70 → 2.22 | [plan] |
| `win-mbath-w` | West | Master bath ventilator | 0.60 m | 1.60 → 2.10 | y 3.65 → 4.25 | [plan] |
| `win-kids-w` | West | Kids bedroom window | 1.52 m (5′) | 0.90 → 2.10 | y 5.46 → 6.98 | [plan] |
| `win-stair-w` | West | Staircase windows, 2 per floor, staggered at half-landing levels | ≈ 0.9 m each | staggered | y ≈ 8.3 → 9.9 | Drawn on the source plan but not dimensioned; [render] staggered boxes in #25/#28; sizes [assumed] |
| `win-gbath-s` | South | Guest bath ventilator (in the 1.0 m step-back) | 0.60 m | 1.60 → 2.10 | x 4.67 → 5.27 | [plan] |
| `kitchen-balcony` | South | Kitchen → balcony door | 0.91 m | 0 → 2.10 | x 6.83 → 7.74 | [plan] |
| `win-kitchen-s` | South | Kitchen window (onto the balcony) | 0.90 m | 1.05 → 2.10 | x 8.74 → 9.64 | [plan] |
| `win-kitchen-e` | East | Kitchen window | 0.90 m | 1.05 → 2.10 | y 1.86 → 2.76 | [plan] |
| `win-living-e` | East | Living window | 1.83 m (6′) | 0.90 → 2.10 | y 6.12 → 7.95 | [plan] |
| `living-balcony` | North | Living → balcony double door | 1.83 m (6′) | 0 → 2.10 | x 6.91 → 8.74 | [plan] |
| `entry` | (inside) | Flat entry from the common lobby | 0.99 m | | | [plan]; not visible outside |

The **master bedroom's south wall has no window** [plan]. It's the obvious place for a feature wall, slats or a name panel.

## Balconies

| Balcony | Side | Clear size | Edge | Source |
|---|---|---|---|---|
| Kitchen (service) balcony | **South** | 4.27 m × 1.22 m (14′ × 4′) | 1.05 m parapet. Inside it's modelled as solid + black rail; [render] shows a curved solid lower parapet + glass top | [plan] + [render] |
| Living balcony | North | 4.27 m × 1.37 m (14′ × 4′6″) | 1.05 m parapet | [plan] |

## Core, stair, entrance

| Item | Value | Source |
|---|---|---|
| Staircase | Shared dog-leg stair, NW corner, 3.76 m × 2.13 m clear (plus the landing), windows on the west wall | [plan] |
| Lift | 1.52 m × 1.83 m car (5′ × 6′), NW core, east of the stair | [plan] |
| Common lobby | Between stair and lift, north of the lift. Flat entry opens from it | [plan] |
| Building entrance | Ground floor, under the NW core: an enclosed stair/lift lobby at stilt level, reached through the parking | [render] (enclosed left block at ground in #25/#28); [assumed] |
| Stilt columns | About 230 × 450 mm RCC columns at the outer corners and main wall junctions, roughly 3–4.5 m apart | [render]; grid [assumed] |
| Roof type | Flat RCC terrace with parapet. #25/#28 show a planter edge and a projecting slab over the top balcony | [render] |

## Site

| Item | Value | Source |
|---|---|---|
| Compound wall | 1.5 m high with pilasters about every 3 m. #25/#28 show a lower front wall with LED pilaster strips | [render]; height [assumed] |
| Gate | Main vehicle gate (≈ 4.0 m) + a pedestrian gate (≈ 1.0 m) on the road side. Metal with vertical bars in #25/#28 | [render]; sizes [assumed] |
| Parking | Under the stilts; paver or mosaic paving | [render] |
| Landscaping | Hedge along the front wall, a few palms/trees in the margins | [render] |

## Facing (resolved)

The main road is on the **south** and a side road runs along the **west** (windows side), so the plot is a corner plot. From the side road you see the whole west face: the bedroom windows with their box frames, the staggered staircase windows, and the stair tower. The main road sees:
- the master bedroom's blank south wall (name sign)
- the 1.0 m recess with the full-height wood strip
- the stacked south balconies

The vehicle gate is in front of the balcony wing and leads into the stilt parking. The pedestrian gate leads through the parking to the ground-floor stair/lift lobby (NW).

## Interior module link

The interior module's `plan/plan.ts` stays the single source for the floor plan. The exterior module **imports it read-only** and never edits it, so if a window moves in the plan, it moves on the facade too. Interior coordinates (x, y in metres) carry over unchanged, and the exterior only adds floor elevations.
