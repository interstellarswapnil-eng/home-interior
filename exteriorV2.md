EXTERIOR MODULE — REVISION BRIEF v2

1. WHAT IS WRONG
The current exterior concepts look generic. They are the same plain box with
different colours and on/off add-ons. The 3D quality and walkthrough are
excellent — keep them. The problem is design composition, not rendering.

2. THE OWNER'S TASTE (design to this)
- One big shape organises the front: a thick frame (portal, picture, squircle,
  capsule, quarter-arc, or chamfered/trapezoid), a sweeping curve, or a deep
  floating roof.
- Soft curves are a strong preference (7 of 12 references): rounded slab edges,
  rounded frame corners, capsule/arch openings, streamline-style bands.
- Layered depth: frames and boxes stand in front, balconies and entrances sit
  in deep recesses with warm wood soffits and downlights.
- Warm light main colour (cream, off-white, travertine, taupe); charcoal/black
  used as thin lines (frames, fascias, window frames, gates).
- One natural stone feature; one vertical spine (jaali tower, stone strip,
  fluted wood strip, or fins).
- Light as a material: LED lines tracing edges, coves, grazed stone, backlit
  screens and nameplates, warm interior glow. Dusk is the reference mood.
- Built-in planters with cascading plants.
- A designed crown (pergola / floating roof / tilted roof frame) and a designed
  base (compound wall + gate + nameplate + car porch as one composition).
- Optional subtle modern-Indian detail (brass, lotus jaali, Devanagari
  nameplate) — one motif, used once.

3. WHAT MAY CHANGE / WHAT MAY NOT
Keep unchanged: floor plan, room layout, floor heights, slab levels, stair and
core positions.
Now allowed in front of / around the architect's building: frames, fins,
screens, jaalis, cladding, pergolas, floating roof extensions, planters,
soffits, light lines, and parapet shaping.
Allowed but must be flagged "NEEDS ARCHITECT APPROVAL" in the UI:
- any new or deeper cantilever / balcony box (balconies count in FSI under
  Maharashtra UDCPR; 1.0–2.0 m width; must keep 2 m marginal open space),
- any projection beyond 0.75 m into a marginal open space (chajja/frame rule),
- curved slab edges or GRC shells that change structure,
- new or resized openings,
- entrance canopies (UDCPR: max 5 m x 2.5 m, 2.4 m clear height, 1.5 m from
  boundary, no supporting columns in front margin).
Add a per-concept "Approval flags" list.

4. NEW DESIGN MOVE LIBRARY (replaces flat toggles as the main tool)
Each move is a parametric object that uses the existing role-based palette.
Existing 18 toggles stay as "details" inside moves.

M1 Portal / picture frame
   params: floors spanned, bays spanned, faceWidth 300–600 mm, depth
   (projection) 450–900 mm, cornerRadius 0–1500 mm per corner, chamfer per
   corner, innerLining (soffit material), edgeLight on/off. roles: featureWall
   or mainWall, soffit. refs 1,2,4,5,9,10,11.
M2 Quarter-arc / sweeping frame
   params: arc radius 2000–4500 mm, which corner, faceWidth 450–600 mm, depth,
   infill (stone/wood/glass). refs 5,10,11.
M3 Squircle / capsule frame or opening
   params: width, height, radius (or full capsule), depth, nested count 1–2.
   refs 4,9,11,7.
M4 Cantilevered box
   params: floor, width, cantilever depth 600–2000 mm (flag >0.75 m),
   cornerRadius, railing type, built-in planter on/off, soffit downlights
   spacing 600–900 mm. refs 1,2,4,10,11.
M5 Deep recess / veranda
   params: floor, width, recess depth 900–1500 mm, ceiling material, pendant
   on/off, interior glow. refs 1,3,6,7,9.
M6 Streamline bands
   params: floors, band thickness 200–450 mm, projection 300–900 mm, end
   radius 600–1200 mm, double cornice on/off, LED under-edge line. refs 3,7,5.
M7 Floating roof
   params: overhang 900–2400 mm (flag), fascia thickness 100–200 mm, soffit
   material, downlight grid, tilt angle 0–12°, chamfer. refs 2,12,6.
M8 Pergola crown
   params: slat size, spacing 100–200 mm, direction, frame material, lanterns
   on/off. refs 1,2,6,9.
M9 Vertical spine
   params: type (jaali / stone strip / fluted wood / fins), width 600–1500 mm,
   height (floors), position, backlight/grazing. refs 2,6,7,1.
M10 Jaali / screen
   params: pattern (square graded, lotus, capsule, geometric), perforation %
   20–60, density gradient on/off, material (bronze, black MS, stone, brick),
   stand-off 100–300 mm, backlight. refs 1,2,5,9.
M11 Fins / louvers
   params: orientation, depth 150–450 mm, spacing 100–300 mm, material, must
   start and stop at a frame or edge. refs 1,3,12.
M12 Fluted / grooved cladding
   params: groove width 25–60 mm, depth, colour, area. refs 2,7,8.
M13 Figure-ground backdrop
   params: dark backdrop plane, boxes set 600–900 mm in front. refs 8,12.
M14 Integrated planter
   params: length, depth 450–600 mm, plant type, cascade length. refs 1,2,3,6,7,10.
M15 Light layer set
   params: soffit downlights, edge LED lines, coves, grazers on stone, backlit
   screen, light slots, sconces/lanterns, interior glow; CCT 2700–3000K
   default; intensity per layer.
M16 Threshold set (base)
   params: compound wall height and materials (echo house), gate type
   (slat/jaali/laser-cut/sculptural), nameplate (backlit, brass, Devanagari
   option), pillars with light slots, porch ceiling light pattern, paving.

Composition rules the engine must enforce:
- exactly 1 hero move per concept, max 3 supporting moves;
- max 4 materials + glass; dark colour mostly as lines;
- every hero move gets its own light layer;
- every concept has a crown and a threshold set;
- depth: at least one element >= 450 mm proud, one recess >= 900 mm.

5. CONCEPTS TO BUILD (fewer, bolder)
Replace the 6 styles x 3 palettes with these 7 concepts (each with 2–3 palette
variants on the same form):
C1 Travertine Lantern — hero: graded bronze jaali spine; frame + planter;
   floating roof. refs 2,12,6.
C2 Soft Streamline — hero: rounded wraparound bands with LED under each edge.
   refs 3,7,5.
C3 Squircle Garden — hero: two nested squircle frames. refs 4,11,9.
C4 Quarter Arc — hero: giant quarter-circle frame holding ledgestone + wood.
   refs 10,11,5.
C5 Brass and Lotus — hero: cream portal frame crown with teak pergola and
   brass lanterns; lotus jaali gate; Devanagari brass nameplate. refs 1,2.
C6 Taupe and Flute — hero: taupe framed boxes over charcoal fluted backdrop;
   one arched window. refs 8,12.
C7 Deccan Veranda — hero: tilted cantilevered roof frame; deep veranda;
   split-face basalt spine. refs 6,12.
Use the hex values per surface role given in the design document.

6. PRESENTATION DEFAULTS
- Default scene: dusk / blue hour. Deep blue sky gradient, sun just below
  horizon, low ambient light.
- Facade lights ON by default at 2700–3000K, with soft bloom and warm interior
  glow behind glass.
- Soft shadows + ambient occlusion so recesses read deep.
- Presets: Day, Golden hour, Dusk (default), Night.
- Light fixtures are real objects that can be listed/exported.

7. QUALITY GATE — every concept must pass 8/10:
1 hero nameable in 3 words; 2 max 3 supporting moves; 3 one element >=450 mm
proud and one recess >=900 mm; 4 <=4 materials + glass; 5 dark used as lines;
6 designed crown; 7 designed threshold; 8 hero has its own light and reads at
dusk; 9 asymmetric but balanced; 10 still distinct from other concepts when
rendered in grey (run this "grey test" automatically and show it).

8. PROCESS
Step 1: Before full 3D, show quick front-elevation thumbnails (simple massing,
grey + one accent, dusk silhouette) for all 7 concepts side by side, with the
hero move named and approval flags listed. Wait for my approval.
Step 2: Build approved concepts in full 3D.
Step 3: For each, provide 2–3 palette variants on the same form.

9. KEEP EXISTING FEATURES
Camera views, walkthrough, role-based palettes, element toggles (now nested
inside moves), compare mode, save/export. Add: move parameters panel, approval
flags panel, grey test view, lighting preset switch.