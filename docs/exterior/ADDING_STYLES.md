# Adding a pattern, palette or material (config only, no code)

All styles live in `src/exterior/config/`:

| File | What it holds |
|---|---|
| `patterns/<id>.json` | One pattern: name, description, notes, its palettes and default elements. **Every file in this folder is picked up automatically.** |
| `materials.json` | Material library: texture set, real-world size of one repeat, roughness |
| `roles.json` | Surface roles: plain names, "What is this?" tips, fallback order |
| `elements.json` | Element catalogue: labels, tips, adjustable params (used by the Elements tab) |
| `defaults.json` | Colours every design gets unless a palette sets them (glass, road, plants…) |

After any change, run `npm test`. The tests check that:

- every colour is a valid hex
- every material, role and slot exists
- each pattern has ≥ 3 palettes, with exactly one marked `recommended`
- every pattern builds valid geometry with no flickering surfaces

## Add a palette to an existing pattern

Add an entry to the pattern's `palettes` list:

```json
{
  "id": "terracottaSand",
  "name": "Terracotta & sand",
  "note": "Optional one-liner shown under the swatches.",
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

Roles you leave out follow `roles.json` fallbacks:

- the ceiling under the balconies (soffit) → feature wall
- slab edges and the roof edge → main walls
- box frames, jaali → second surface
- frames, gates → railings

To mark a palette as the pattern's recommendation, add `"recommended": true` (only one per pattern).

## Add a new pattern

Copy `patterns/warmMinimal.json` to `patterns/<newId>.json`, then:

- change `id`, `name`, `description`, `notes` and `palettes`
- set `defaultPaletteId`
- switch elements on or off under `elements`. The element ids and their params are in `elements.json`, and the slot names are in `src/exterior/model/slots.ts`. Some examples:
  - `wall:featureRecess`
  - `wall:stairTower`
  - `win:win-master-w`
  - `balcony:S`
  - `site:gate`
- `order` positions it in the list (optional)

## Add a material

1. Add the texture set to `SPECS` in `scripts/exterior-fetch-assets.ts` (a Poly Haven id), then run `npm run exterior:assets`.
2. Add an entry to `materials.json` with `textureSet` and `realSizeMeters` (the real size one texture repeat covers on the wall).

Albedo maps are stored as neutral grey, and the palette colour tints them. The hex you write is the average tone you'll see, and the texture's grain and joints are kept.

## What does need code

A brand-new *kind* of element: for example, a new railing type or a new screen shape. Each element type is one generator function in:

- `src/exterior/model/elements.ts`
- `wallElements.ts`
- `roofElements.ts`
