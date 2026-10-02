# Site photo review (Phase A)

Review of 4 site photographs from 2026-10-02, against the exterior model (Architect's design, #28).
**Outcome:** D1, D2 and D3 were applied (see DECISIONS.md, "structure corrected from site photos"). D4 is the lift core, already modelled. The stair tower has one window per floor (your note). Heights unchanged. The photos and comparison images stay in `site_photos/` (git-ignored).

Comparison images: `site_photos/_review/`, with each photo next to the model from about the same spot (`photo-vs-model.jpg`) and close crops of the SW corner and the road face.

## The photos

| # | File | Shows | Stage | Ignored |
|---|---|---|---|---|
| P1 | `09.29.31 (1)` | **West face** (side road), from the west road near the SW corner. North (stair) on the left, south (master) on the right | Floors 1–2 bricked; 3rd floor in props under the fresh terrace slab | bamboo props, rebar cages, ladders, bamboo pile, gravel, plants, power lines |
| P2 | `09.29.32 (1)` | **South face** (main road), from the south, slightly east. East face on the far right | As P1 | brick stack, sand heap, hoist, props, compound-wall panels, green net |
| P3 | `09.30.08 (1)` | South face, same side as P2, evening sun from the left (west) | **Earlier**: only floor 1 bricked; terrace slab formwork going up | bricks, sand, timber, shawl on the brick stack, hoist |
| P4 | `09.30.09 (1)` | **SW corner** from close by, looking up. West face left, south face right | As P1 | timber, bricks, ladders, rubble, power lines |

The side assignment is solid: P1's windows read in the plan's order (stair, kids, master bath, master), and P2 shows the blank master wall, the 1 m step-back and the kitchen-balcony door. P4 links the two, because the same hoist and the same corner column appear in P1, P2 and P4.

## Where the model differs from the site

| # | Item | Model now | Photos show | Confidence | Photos |
|---|---|---|---|---|---|
| D1 | **SW corner column** | Slim vertical column 0.30 × 0.45 m, flush with the corner | One **large tapered, sloping column**: narrow (~0.4 m) at the foot, set back from the corner, widening to ~1.0 m and reaching out to the slab corner. It's the strongest structural feature at street level | **High** (shape) · medium (sizes) | P1, P4 |
| D2 | **First floor cantilevers over the stilt** | Stilt columns flush with the outer walls | The other stilt columns stand back from the faces; the first-floor slab and its deep edge band **overhang them on the west and south faces**, roughly 0.6–1.0 m | **High** that it overhangs · low on the exact depth | P1, P2, P4 |
| D3 | **Kitchen window** (south, onto the kitchen balcony), `win-kitchen-s` | 0.90 m wide, sill 1.05 m, x 8.74–9.64 | About **twice the door's width ≈ 1.6–1.9 m**, sill ≈ 1.0 m, starting ≈ 0.5 m after the door (≈ x 8.3–10.0). Same on floors 1 and 2. The door next to it matches the plan within ~0.1 m, which makes the scale reliable | **Medium** (two photos agree; perspective) | P2, P3 |
| D4 | Ground floor: brick room under the middle/back | Open stilt apart from the NW stair/lift core | A **brick-walled enclosure** at the back of the stilt, seen through from the south (watchman room, meter room, lift lobby?) | Low on position | P2 |

D3 is an **interior plan** opening: the plan lives in the interior module (`plan/plan.ts`), which the exterior only reads. Changing it would change the interior too, so it needs your decision, ideally confirmed with the architect.

## What matches (no change needed)

- Stilt + 3 residential floors, one flat per floor; the 3rd floor and terrace slab are in progress.
- West face: window order and sizes (stair, kids 1.52 m, master bath ventilator, master 1.52 m), **projecting box frames** on the master and kids windows, **staggered stair windows** at the north end, and the stair core going down to the ground.
- South face: **blank master wall**, the **1 m step-back** with its small ventilator, the **kitchen-balcony door** about 1.2 m from the balcony wing (plan 1.24 m), and the balcony slab projecting with no parapet yet.
- A deep slab-edge band at the first floor (model 0.45 m) and a raised concrete plinth around the stilt.
- Evening sun from the west lights the south face from the left (P3), consistent with plan north = true north.

## What the photos can't settle

- **Heights** (stilt, floor-to-floor, parapet): there's no reference in frame, and brick courses can't be counted at this resolution and angle. A tape measurement of one storey would settle it.
- The terrace, stair head room and parapet aren't built yet. Road widths and plot margins are out of frame.

## Surroundings, for realism later (Phase C)

- West road: a tree and an electricity pole with overhead lines along it (P1, P4); across it, a 2-storey house with a balcony and a name sign (P2, left).
- A light-blue 2–3 storey house with solar panels to the west/south-west (P3).
- East side: coconut palms (P2, P3); a cream multi-storey building close behind the east margin (P1); a yellow building to the south-east (P4).
- Precast concrete compound-wall posts and panels (P2).

## Questions for you

1. **D1, the corner column:** should the model follow the site (a tapered sloping column at the SW corner)? In the finished building it will probably be clad. Is it meant to stay visible as a feature? #28 doesn't show it.
2. **D2, the overhang:** should the stilt columns move in so the first floor overhangs, as built? If you know the overhang (or the column positions), I'll use those; otherwise ~0.75 m.
3. **D3, the kitchen window:** is it really ~1.8 m wide now? If yes, should I change it in the shared floor plan? That updates the interior too.
4. **D4:** what is the brick room at the back of the stilt floor, and roughly where?
5. Do you have a measured storey height or total building height?
