# Second Claude Code prompt — Realism pass

Use **after** the existing 2D/3D (and immersive walk/tour if already done) are working. Do **not** rebuild the floor plan or change room roles/budget totals.

---

## Paste into Claude Code

```
Read this as a second workstream on the existing Ahilyanagar 2BHK R3F app. Do not rebuild plan.ts geometry or change room roles (kids upper, master lower + ensuite, guest bath, storage, south kitchen balcony). Keep lighter-modern palette and ₹8–10L scope.

GOAL
Make the 3D experience feel real: believable color, surface texture, furniture shape/detail, and small design details — so Walk/Tour/Record look like a designed home, not colored boxes.

PILLARS (implement in this order)

1) LIGHTING & COLOR (biggest realism jump)
- Add Drei <Environment> with a soft interior-friendly HDRI (prefer local file under public/hdri/ from Poly Haven; fallback preset "apartment" or "lobby" only for dev). background={false} or heavily blurred so we keep walls, not an outdoor skybox inside rooms.
- One sun-like <directionalLight> from the living/kitchen window side (east on plan) with soft shadows; dim fill ambient; optional warm rect area feel near living balcony (north) and hotter bounce hint near south kitchen balcony.
- Enable shadows on Canvas; cast/receive on furniture and floors.
- Tone mapping: ACES Filmic, exposure tuned so off-white walls stay warm, not blown-out or grey.
- Keep Ahilyanagar daylight logic: brighter from living balcony (north) and strong afternoon feel toward south kitchen balcony (shade device still visible).

2) PBR MATERIALS (real color + texture)
Extend materials.ts into a material library with MeshStandard/Physical maps where useful:
- Walls: warm off-white, slight roughness; optional subtle wall noise/normal (very low).
- Dry floors: light beige/grey vitrified — albedo + roughness (+ normal); tile repeat scaled in meters (e.g. 0.6–0.8 m tile).
- Wet floors: anti-skid lighter tile, higher roughness.
- Kitchen counter: pale artificial granite — albedo with faint vein, mid roughness, low metalness (not mirror marble).
- Laminates (kitchen/wardrobes): matte white / light oak — fine wood or solid matte maps; roughness high enough to read as laminate not plastic.
- Fabric (sofa): greige performance cloth — albedo + roughness (+ normal); no shiny vinyl look.
- Glass: shower screen + balcony doors — transmission/transparent physical material, thin, env reflections.
Sources: prefer CC0 from ambientCG / Poly Haven; store under public/textures/ with LICENSE notes. useTexture + colorSpace SRGB for color maps; RepeatWrapping with real-world repeat.

3) FURNITURE & MODELS (replace box proxies)
Replace primitive boxes with proportion-correct GLTF/GLB assets (CC0 / clearly free for this use). Priority order:
1. Sofa 3-seater + lounge chairs + coffee table
2. Queen bed + single bed + side tables
3. Study desk + chair (kids)
4. Kitchen: hob, sink, chimney, fridge (or detailed proxies)
5. Wardrobe fronts can stay paneled meshes if full GLB is heavy — but add shutter splits, thin handles (black/nickel), plinth, and 18–22mm thickness cues
Scale to plan.ts furniture footprints; origin/rotation must match room anchors. Keep polycount reasonable for walkthrough (instanced or shared materials). Document sources in docs/ASSET_CREDITS.md.

4) DESIGN DETAILS (make it feel finished)
Add small architectural layer tied to plan:
- 75–100 mm skirting in laminate/paint contrast
- Simple false-ceiling trays or cove in living + master (match budget mid false-ceiling)
- Curtain sheers at living balcony and bedroom windows (light fabric, not heavy drapes)
- LED cove or downlight points (emissive discs / spots) — living, kitchen, beds
- Kitchen splash strip behind hob/sink (granite or tile)
- Door frames + architraves; solid-looking door leaves
- South balcony: rail/shade, anti-skid floor, outdoor light wash
- Storage room: full-height louver or panel shutters + shelf depth
Do NOT add marble flooring, gold hardware, or out-of-budget decor.

5) POST + QUALITY (polish, not a filter party)
- Mild SMAA or default antialias
- Optional light SSAO (subtle — interiors go muddy if strong)
- ContactShadows under main furniture if AccumulativeShadows is too heavy
- Perf: target ≥30 fps walk on mid laptop; texture sizes 1k–2k max; compress; no 4k everywhere

INTEGRATION
- Single RealisticScene or material/furniture swap layer so Orbit / Walk / Tour / Record all use the upgraded look.
- Quality toggle: “Performance” vs “High” (High = env + shadows + SSAO; Performance reduces shadows/maps).
- Do not break 2D SVG plan or budget panel.

ACCEPTANCE (print pass/fail)
- [ ] Walls/floors/granite/laminate/fabric read as distinct real materials under Environment lighting
- [ ] Sofa, beds, tables are detailed models (not boxes), scaled to plan anchors
- [ ] Kitchen shows granite vein, chimney, splash, matte shutters, visible handles
- [ ] Skirting, sheers, ceiling lights, door frames present in main rooms
- [ ] South balcony heat/shade still readable; north living balcony brighter
- [ ] Walk/Tour still work; Record still captures the richer look
- [ ] ASSET_CREDITS.md lists texture/model sources + licenses
- [ ] High vs Performance toggle documented in README

OUT OF SCOPE
Photoreal path tracing, scanned apartment capture, paid Quixel-only pipelines, changing plan roles/budget, Remotion, WebXR.

When finished: summarize what changed, fps notes, and the pass/fail checklist.
```

---

## Suggested run order for you

1. Finish immersive Walk/Tour/Record (first immersive prompt) if not done.
2. Paste **this** second prompt so Claude upgrades lighting → materials → furniture → details.
3. Re-record the tour video after realism lands.
