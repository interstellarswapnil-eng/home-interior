# Exterior module: decisions and assumptions log

Newest first. **[open]** = waiting on your answer.

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
