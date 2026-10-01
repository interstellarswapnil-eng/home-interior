# Exterior Design Module: Prompt for Claude Code

> How to use: fill in Section 0, save this file in the project folder, then tell Claude Code:
> "Read exterior-design-prompt.md and start with Phase 0."

---

## 0. Project details (fill in before starting)

- Input folder (references, floor plan, architect's design): `exterior_references`
- Location and climate: `Ahilyanagar`
- Direction the front of the house faces: `South facing`
- Must keep from the architect's design (optional): 
- My favorite reference images (optional):

---

## 1. Goal

Add a new **Exterior** module to this project, next to the existing interior design module. It shows a realistic 3D model of the outside of my house. I can look at it from any angle and restyle it: switch design patterns, color combinations, and facade elements until I find the look I like.

The building itself stays as my architect designed it: footprint, floor plan, floor heights, and window and door positions. We are redesigning the outer "skin": materials, colors, and add-on elements (slats, screens, window frames, canopies, lighting, landscaping).

I am not an architect. Explain things to me in simple words, and use plain labels in the app.

---

## 2. How to work

- Work in the phases in Section 4. After each phase: stop, summarize what you did in plain words, show screenshots if you can make them (for example with a headless browser), tell me how to run it, and wait for my OK.
- Do not write code until I approve the Phase 0 plan.
- Use the same stack, folder structure, and conventions as the interior module. Reuse its viewer, materials, and UI parts where it makes sense. Ask me before adding large new libraries or changing shared code.
- The interior module must keep working.
- Create a new git branch for this work. Commit at the end of each phase.
- Keep a short log of decisions and assumptions in `docs/exterior/DECISIONS.md`.
- If anything in this prompt conflicts with what you find in the project or the input folder, tell me instead of guessing.

---

## 3. Inputs and how to use them

First, list every file in the input folder and say what each one is. Then:

- **Floor plan**: the source of truth for footprint, walls, openings, and dimensions. If a dimension is missing or unclear, write down your assumption and ask me.
- **Architect's 3D design**:
  - If it is a 3D file the browser can load (GLB/glTF, OBJ, FBX, DAE): import it, clean it up, and use it as the base geometry.
  - If it is a format you can't load (e.g. SketchUp .skp, Revit .rvt, 3ds Max .max): tell me exactly which export to ask my architect for (GLB preferred, OBJ or FBX is fine). Meanwhile, rebuild the model from the plan and renders.
  - If it is only images or PDFs: rebuild the outer shell from the floor plan, and use the renders for heights, roof, balconies, and proportions.
  - If the interior module already has a model of the house, reuse or share that data so inside and outside stay in sync.
- **Reference screenshots**: the looks I like. Analyze them in Phase 0.

---

## 4. Phases

### Phase 0: Study and plan (no code)

1. Review the existing project: stack, folders, how the interior module works, shared parts, how to run it.
2. Write `docs/exterior/BUILDING_FACTS.md`: plot size, footprint, number of floors, floor-to-floor height, parapet height, roof type, balconies, every door and window per side (with size), entrance, staircase, compound wall and gate, facing direction. Mark each value as "from plan", "estimated from render", or "assumed".
3. Write `docs/exterior/REFERENCE_ANALYSIS.md`. For each screenshot: style, main materials (and roughly how much of the facade each one covers), 4 to 6 main colors as hex, key elements (slats, fins, jaali, stone base, window box frames, etc.), and what makes it work. Then: what my references have in common, which pattern in Section 6 each one is closest to, and a proposed "My references" pattern with 3 palettes.
4. Review the palettes in Section 6 against my references and this building. Refine them if needed, and mark one recommended palette per pattern with a one-line reason.
5. Technical plan: import vs. rebuild, data model, UI layout, libraries, texture sources, and how you'll keep it fast.
6. Ask me up to 5 questions you need answered before building (for example, key dimensions or the facing direction).

### Phase 1: Building model

- Build or import the outer shell at real scale (meters), matching the plan: footprint, floor heights, openings, balconies, roof and parapet, columns, visible staircase, compound wall and gate, and the ground of the plot.
- Tag every surface with a role (Section 5) and give every opening an ID, so styles are applied through data, not hard-coded.
- Define **slots** where elements can go: front feature wall, entrance, balcony fronts, window surrounds, terrace edge, staircase wall, compound wall, and so on.
- Recreate the architect's current look as a preset called **"Architect's design"** for comparison.
- Basic camera and light so I can check the model.

### Phase 2: Style system

- Patterns, palettes, materials, and elements live in config files (e.g. `src/exterior/config/`). Adding a new pattern, palette, or element must need only a config change, no code changes.
- Load the starting library from Section 6, plus "My references" from Phase 0.
- Build the material library with realistic textures (Section 8).

### Phase 3: Controls

Build features A to D in Section 7.

### Phase 4: Realism and lighting

Everything in Section 8.

### Phase 5: Compare, save, and export

Build features E to H in Section 7. Update the README with how to run the module and how to add a new pattern or palette (with an example).

---

## 5. Surface roles

Every surface in the model belongs to one role. Palettes and materials are applied by role.

| Role | What it is |
|---|---|
| `mainWall` | Most of the outer walls (about 60% of the look) |
| `secondSurface` | A volume or band in a second color or material (about 30%) |
| `featureWall` | The special surface: wood, stone, brick, or fluted panel (about 10%) |
| `base` | Bottom band of the house (plinth), about 0 to 0.6 m high |
| `roofEdge` | Parapet top and roof edges |
| `soffit` | Undersides of balconies, canopies, and overhangs |
| `windowFrame` | Window and door frames |
| `windowSurround` | Box frames around windows (when used) |
| `glass` | All glazing |
| `railing` | Balcony and terrace railings |
| `mainDoor` | Main entrance door |
| `compoundWall`, `gate` | Boundary wall and gate |
| `paving`, `ground` | Driveway, paths, lawn, gravel |

Add roles if the building needs them.

---

## 6. Starting design library

General rules:

- Use 3 to 5 materials per design. Main color about 60%, second surface about 30%, feature about 10%.
- For wood, stone, brick, and terracotta, the hex value is the average tone. Use real textures tinted to that tone.
- In the palette tables: "Metal" sets `windowFrame`, `railing`, and `gate`. "Base & paving" sets `base` and `paving`. Roles not listed get sensible pattern defaults (e.g. `soffit` uses the feature wood, `roofEdge` matches the main wall, `mainDoor` uses the feature wood or a matching accent).
- Each pattern turns on its own default elements (listed below). I can change everything after that.
- Add short practical notes per pattern: climate fit, maintenance, and relative cost ($ / $$ / $$$).

### 6.1 Warm Minimal

Clean, calm boxes in warm white (not stark white), one warm wood feature, slim dark frames.
Default elements: wood slat feature at the entrance, thin roof edge, slim frames, glass railings, box frame on 1 or 2 key windows, linear light under the canopy, simple planters.

| Palette | Main walls | Second surface | Feature | Metal | Base & paving |
|---|---|---|---|---|---|
| Warm white & teak | Warm white `#EEEAE1` | Light greige `#D6CEC1` | Teak slats `#8E5E3E` | Matte black `#1E1E1E` | Light grey stone `#A9A49B` |
| Sand & oak | Soft sand `#E8E0D2` | Warm beige `#C8B69B` | Light oak `#C4A27A` | Dark bronze `#3F362D` | Travertine `#D3C4A8` |
| Soft grey & walnut | Soft white `#ECEBE7` | Stone grey `#8E9290` | Walnut `#5C3F2B` | Charcoal `#2E3133` | Concrete `#9C9993` |

### 6.2 Japandi (Japanese + Scandinavian)

Quiet and natural. Low contrast, horizontal lines, dark and light wood together, garden-focused.
Default elements: vertical wood screens, deep roof edge or overhang, slim bar railings, low garden walls, gravel and stepping stones, warm low lighting.

| Palette | Main walls | Second surface | Feature | Metal | Base & paving |
|---|---|---|---|---|---|
| Greige & charred wood | Textured greige `#D3CBBE` | Light oak cladding `#C8A97E` | Charred wood `#2A2623` | Dark bronze `#3B342D` | Grey pebble `#8C8A84` |
| Paper & stone | Rice-paper white `#E9E3D7` | Warm stone grey `#A69E91` | Cedar `#A9714B` | Black `#1F1F1F` | Slate `#5F605C` |
| Mushroom & moss | Mushroom `#BCB2A4` | Muted moss `#7C8466` | Ash wood `#CDB089` | Charcoal `#333333` | Pale gravel `#B5B0A6` |

### 6.3 Dark Modern

Bold and dramatic. A dark main color, warmed up with wood at the entrance and under canopies. Strong at night.
Default elements: dark main volumes, wood soffits and entrance, large glass, black frames, uplights and wall washers, minimal planting.
Note: dark walls absorb heat. In hot climates, prefer dark colors on shaded sides or as an accent.

| Palette | Main walls | Second surface | Feature | Metal | Base & paving |
|---|---|---|---|---|---|
| Charcoal & cedar | Charcoal `#34363A` | Warm white `#EDEAE3` | Cedar `#A9714B` | Black `#1A1A1A` | Concrete `#9A978F` |
| White & anthracite | White `#F0EEE9` | Anthracite `#383E42` | Warm wood `#9C6B48` | Anthracite `#383E42` | Dark slate `#4D4E4B` |
| Forest green & bronze | Deep green `#2F3A32` | Warm off-white `#EAE4D9` | Cedar `#B07A4F` | Bronze `#4A3B2F` | Sandstone `#CDB48C` |

### 6.4 Tropical Modern

Open, shaded, and green. Made for strong sun and heavy rain.
Default elements: deep overhangs and sunshades over openings, vertical wood-look louvers, jaali screen on a balcony or staircase wall, stone base, planters and green pockets, terrace pergola.

| Palette | Main walls | Second surface | Feature | Metal | Base & paving |
|---|---|---|---|---|---|
| White & teak | White `#F2F0EB` | Light greige `#CFC8BC` | Teak louvers `#8B5A3C` | Black `#222222` | Slate stone `#5F605C` |
| Sand & sandstone | Sand `#E1D5C1` | Sandstone cladding `#CDB48C` | Dark teak `#6F4630` | Bronze `#4E4034` | Brown stone `#9E9483` |
| Stone & terracotta | Warm grey `#C9C4BA` | Terracotta tiles or jaali `#B5654A` | Teak `#8B5A3C` | Dark green `#2F3D33` | Grey stone `#77756F` |

### 6.5 Earthy Organic

Soft and handmade. Textured limewash walls, rounded edges, terracotta details.
Default elements: rounded corners and edges, arch-shaped frames or niches (only where the structure allows; otherwise as a surface detail), terracotta screen or tile band, wooden main door, potted olive trees and plants.

| Palette | Main walls | Second surface | Feature | Metal | Base & paving |
|---|---|---|---|---|---|
| Limewash & terracotta | Limewash white `#EEE7DC` | Terracotta `#B86B4B` | Light oak `#C4A27A` | Black `#1E1E1E` | Travertine `#D2C1A4` |
| Clay | Clay `#D2B898` | Deep clay `#A86A4A` | Walnut `#6E4B33` | Bronze `#5C4632` | Sandstone `#C9B595` |
| Stone & olive | Stone beige `#DCD2C1` | Olive `#7A7A55` | Natural oak `#B48A5E` | Aged bronze `#5A4C3A` | Limestone `#CFC6B5` |

### 6.6 Brick & Concrete

Honest raw materials with clean modern lines.
Default elements: a brick volume or full brick walls, brick jaali screen, concrete bands or frames around openings, black steel railings, large windows.

| Palette | Main walls | Second surface | Feature | Metal | Base & paving |
|---|---|---|---|---|---|
| Red brick & black | Red brick `#9C4F35` | Light concrete `#A9A69F` | Wood `#8B5E3C` | Black `#1C1C1C` | Concrete `#8C8984` |
| Whitewashed brick | Whitewashed brick `#E4DED3` | Mid concrete `#8F8C86` | Teak `#8E5E3E` | Black `#222222` | Dark stone `#5A5A57` |
| Charcoal brick & bronze | Charcoal brick `#45403C` | Warm concrete `#B9B3A8` | Oak `#B08A60` | Bronze `#5A4A3A` | Light stone `#BDB6A8` |

### 6.7 My references

Built in Phase 0 from my screenshots: the elements, materials, and 3 palettes taken from them.

### 6.8 Architect's design

The current proposal, recreated as closely as possible. Used as the baseline for comparison.

---

## 7. Features I need

### A. View from every angle

- Rotate, zoom, and pan, with limits (the camera can't go under the ground or inside walls).
- One-click views with smooth transitions: front, back, left, right, four corners (45°), top (plan), bird's-eye, street level (1.6 m eye height at the gate), entrance close-up.
- Walk-around mode at eye level (keyboard and mouse; touch if easy).
- Auto-rotate (turntable).
- Sun: time-of-day slider from sunrise to sunset, using the real location (latitude) and facing direction from Section 0. Optional date or season. Overcast mode (soft light, best for judging colors). Night mode with facade lights and a warm glow from the windows.

### B. Switch design pattern

- Pattern cards with an auto-generated thumbnail and a one-line description.
- Instant switch without reloading. The camera stays where it is.

### C. Change colors

- Each pattern shows its palettes as swatch cards. One click applies a palette.
- Custom colors: pick any surface role (or click a surface in 3D) and change its color with a color picker, a hex input, and a few suggested colors that suit the pattern.
- Lock a color or material so it stays when I switch palette or pattern (e.g. keep my stone base).
- Reset to the pattern's defaults.
- Show the flat paint swatch next to the 3D view, because colors look different in sun and shade.

### D. Change aesthetic elements

Each element has: on/off, simple options (material, color, size, spacing, depth), and where it goes (slots). A pattern sets the defaults; I can change any of them.

1. Wood slats or louvers (vertical or horizontal)
2. Vertical fins (concrete or metal)
3. Jaali or breeze-block screen (brick, concrete, or laser-cut metal patterns)
4. Box frames around windows
5. Feature wall cladding (wood-look panels, stone, brick tiles, fluted panels, terracotta tiles)
6. Stone base (height, material)
7. Entrance canopy (concrete, glass, or wood pergola)
8. Sunshades over windows and roof overhang depth
9. Terrace pergola
10. Parapet and roof edge style (thin edge, thick band, glass)
11. Railings (frameless glass, vertical bars, solid wall, perforated metal)
12. Rounded corners and arches (non-structural only, unless I approve)
13. Planters and green walls
14. Facade lighting (uplights, wall washers, linear LEDs, bollards)
15. Main door style (wood, pivot, color accent)
16. Compound wall and gate (matching the pattern)
17. Landscaping (lawn, gravel, pavers, driveway, trees)
18. Solar panels on the roof (optional)

Click to select: clicking any surface shows what it is in plain words (its role and slot) and lets me change its material, color, or elements right there.

### E. Compare

- Side-by-side view of two designs with the cameras in sync. Include "Architect's design" vs. my current design.
- A quick key to flip between design A and design B.

### F. Save

- Save named designs. List, load, rename, duplicate, and delete them.
- Undo and redo.
- Export and import a design as a JSON file.

### G. Export

- Screenshot of the current view (high-resolution PNG).
- "Export all views": one image per preset view.
- A one-page design sheet (Markdown or HTML; PDF if easy): pattern, palette, material and color (hex) for each surface, elements used, and screenshots. I will share this with my architect.

### H. Optional bigger changes

If a pattern looks clearly better with a change to openings or structure (bigger window, removed wall, deeper balcony), add it as a separate toggle, off by default, labelled "Needs architect approval". List these in the design sheet.

---

## 8. Realism

- Realistic materials with real textures from free CC0 sources (e.g. Poly Haven, ambientCG). Store them in the project and keep a credits file. Use correct real-world scale (brick about 230 × 75 mm, wood slats 50 to 100 mm wide, stone panels about 300 × 600 mm).
- Sky lighting (HDRI) plus a sun light, soft shadows, ambient occlusion, filmic tone mapping (ACES or AgX), and correct color management (hex colors are sRGB).
- Glass that reflects the sky and shows a hint of a dark interior. Not fully see-through.
- Small details that make it look real: window sills, drip edges, parapet coping, slightly rounded edges, joint lines on large plaster areas.
- Site context: ground, driveway, lawn or gravel, a few trees and plants, compound wall, gate. Toggles for a car and a person (for scale) and plain grey neighbor buildings.
- Night: facade lights as real light sources, warm window glow, a little bloom.
- Two quality modes: **Normal** (smooth on an average laptop) and **High quality** (for screenshots: higher resolution and better shadows; a path-traced still render if feasible).
- Load textures only when a pattern needs them, and keep them reasonably compressed.
- It should at least load and let me switch presets on a tablet or phone.

---

## 9. Look and feel of the app

- The house is the hero. Keep the control panel simple, neutral, and collapsible so it doesn't compete with the facade colors.
- Match the interior module's look and navigation. Add "Exterior" next to it.
- Panel tabs: Style, Colors, Elements, View, Compare, Save & export.
- Plain labels in sentence case ("Wall color", "Wood slats", "Stone base"). Add a small "What is this?" tip for terms like louver, jaali, parapet, plinth, and soffit.

---

## 10. Climate and practical notes

- Use the location and climate from Section 0 when choosing materials and writing notes.
- For hot and rainy climates: deep overhangs over windows; rain-safe finishes; avoid large areas of pure white (stains show) and real wood exposed to rain (suggest wood-look HPL or aluminum panels instead); dark colors heat up on sun-facing walls.
- Show these notes in the app as a short "Good to know" line per pattern.

---

## 11. Suggested data model (adapt to the project)

```ts
type SurfaceRole =
  | 'mainWall' | 'secondSurface' | 'featureWall' | 'base' | 'roofEdge'
  | 'soffit' | 'windowFrame' | 'windowSurround' | 'glass' | 'railing'
  | 'mainDoor' | 'compoundWall' | 'gate' | 'paving' | 'ground';

interface MaterialDef {
  id: string;
  name: string;
  kind: 'paint' | 'texturedPlaster' | 'limewash' | 'wood' | 'charredWood' | 'stone'
      | 'brick' | 'concrete' | 'terracotta' | 'metal' | 'glass' | 'tile';
  textureSet?: string;               // folder with color / normal / roughness maps
  tint: string;                      // hex
  roughness: number;
  metalness?: number;
  realSizeMeters?: [number, number]; // size of one texture repeat
}

interface Palette {
  id: string;
  name: string;
  recommended?: boolean;
  note?: string;
  roles: Partial<Record<SurfaceRole, { material: string; color: string }>>;
}

interface Pattern {
  id: string;
  name: string;
  description: string;
  palettes: Palette[];
  defaultPaletteId: string;
  elements: Record<string, { enabled: boolean; slots?: string[]; params?: Record<string, unknown> }>;
  notes: { climate: string; maintenance: string; relativeCost: '$' | '$$' | '$$$' };
}

interface DesignState {
  name: string;
  patternId: string;
  paletteId: string;
  overrides: {
    roles: Partial<Record<SurfaceRole, { material?: string; color?: string; locked?: boolean }>>;
    elements: Record<string, { enabled?: boolean; slots?: string[]; params?: Record<string, unknown> }>;
  };
  view: { cameraPreset?: string; timeOfDay: number; sky: 'clear' | 'overcast' | 'night' };
}
```

---

## 12. Done when

- [ ] "Exterior" opens from the app next to the interior module, and the interior module still works.
- [ ] The model matches the floor plan (footprint, floors, openings), and `BUILDING_FACTS.md` lists every assumption.
- [ ] I can rotate, zoom, pan, use all preset views, walk around, and auto-rotate.
- [ ] Time of day, facing direction, overcast, and night mode work, with correct shadows.
- [ ] All 6 patterns plus "My references" and "Architect's design" switch in about a second, without reloading.
- [ ] Each pattern has at least 3 palettes with one marked as recommended. I can change any surface color, lock colors, and reset.
- [ ] At least 12 elements can be turned on/off and adjusted, and clicking a surface lets me edit it.
- [ ] Compare view works with synced cameras.
- [ ] Save, load, duplicate, delete, undo/redo, screenshots, "Export all views", and the design sheet all work.
- [ ] Adding a new pattern or palette is a config-only change, and the README shows how with an example.
- [ ] Runs smoothly on a normal laptop in Normal mode.

---

## 13. Not in scope (for now)

- Changes to the interior, the structure, or the floor plan (except the optional toggles in 7H).
- Construction drawings and exact paint brand codes. Hex codes are enough.

---

Start with Phase 0 now. Do not write code until I approve the plan.
