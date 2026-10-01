/**
 * `npm run exterior:assets` — downloads the CC0 facade textures (Poly Haven) used by the exterior module into
 * public/exterior/textures/<set>/ and writes docs/exterior/ASSET_CREDITS.md.
 *
 * Albedo maps are NEUTRALISED: converted to grey with a linear mean of exactly 0.5 (contrast kept, scaled by `k`).
 * The app multiplies them by (palette colour ÷ 0.5), so the average tone of the surface equals the palette hex
 * while the real grain / joints / grit stay. One texture therefore serves every palette.
 * Separate from the interior's scripts/fetch-assets.ts. Outputs are committed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const API = "https://api.polyhaven.com";
const RES = "1k";
const OUT = "public/exterior/textures";

type Files = Record<string, Record<string, Record<string, { url: string }>>>;
async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return (await r.json()) as T;
}
async function bytes(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** Grey albedo with linear mean 0.5; `k` scales contrast around the mean (1 = as photographed). */
async function neutralise(src: Buffer, k: number): Promise<Buffer> {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const lum = new Float32Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) {
    lum[i] = 0.2126 * toLin(data[i * 3] / 255) + 0.7152 * toLin(data[i * 3 + 1] / 255) + 0.0722 * toLin(data[i * 3 + 2] / 255);
    mean += lum[i];
  }
  mean /= n;
  const out = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    const v = 0.5 * (1 + k * (lum[i] / mean - 1));
    out[i] = Math.round(255 * toSrgb(Math.max(0.02, Math.min(1, v))));
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 1 } }).jpeg({ quality: 84 }).toBuffer();
}

type Spec = { set: string; id: string; k: number; use: string };
const SPECS: Spec[] = [
  { set: "plaster", id: "white_plaster_02", k: 0.3, use: "smooth painted plaster" },
  { set: "roughPlaster", id: "white_plaster_rough_01", k: 0.5, use: "textured plaster" },
  { set: "limewash", id: "clay_plaster", k: 0.5, use: "limewash / clay plaster" },
  { set: "wood", id: "synthetic_wood", k: 1.0, use: "wood-look panels, slats, soffits, doors" },
  { set: "charred", id: "black_painted_planks", k: 1.0, use: "charred / dark wood" },
  { set: "stackedStone", id: "stacked_stone_wall", k: 1.0, use: "stacked / ledge stone" },
  { set: "stonePanels", id: "sandstone_blocks_08", k: 0.9, use: "sandstone, travertine, limestone panels" },
  { set: "slate", id: "slate_floor", k: 0.9, use: "slate" },
  { set: "brick", id: "brick_wall_001", k: 0.75, use: "brick (≈230 × 75 mm)" },
  { set: "concrete", id: "concrete_wall_008", k: 0.8, use: "concrete" },
  { set: "terracotta", id: "terracotta_floor_tiles", k: 0.9, use: "terracotta tiles" },
  { set: "pavers", id: "interlocking_concrete_pavers", k: 0.9, use: "driveway pavers" },
  { set: "stonePaving", id: "stone_tiles", k: 0.8, use: "stone slab paving" },
  { set: "gravel", id: "gravel_floor", k: 1.0, use: "gravel" },
  { set: "grass", id: "leafy_grass", k: 1.0, use: "lawn" },
  { set: "asphalt", id: "asphalt_02", k: 0.8, use: "road" },
];

const credits: string[] = [];
const sizes: Record<string, number> = {};
for (const s of SPECS) {
  const dir = path.join(OUT, s.set);
  mkdirSync(dir, { recursive: true });
  const files = await json<Files>(`${API}/files/${s.id}`);
  const info = await json<{ name: string; authors: Record<string, string>; dimensions?: number[] }>(`${API}/info/${s.id}`);
  const url = (map: string) => files[map][RES].jpg.url;
  writeFileSync(path.join(dir, "albedo.jpg"), await neutralise(await bytes(url("Diffuse")), s.k));
  writeFileSync(path.join(dir, "normal.jpg"), await sharp(await bytes(url("nor_gl"))).jpeg({ quality: 88 }).toBuffer());
  writeFileSync(path.join(dir, "rough.jpg"), await sharp(await bytes(url("Rough"))).greyscale().jpeg({ quality: 84 }).toBuffer());
  const size = info.dimensions ? info.dimensions[0] / 1000 : 1;
  sizes[s.set] = size;
  credits.push(`| \`${s.set}/\` | [${info.name}](https://polyhaven.com/a/${s.id}) | ${Object.keys(info.authors).join(", ")} | ${size.toFixed(2)} m | ${s.use} |`);
  console.log(`texture ${s.set} ← ${s.id} (${size.toFixed(2)} m)`);
}

// Fluted panel: generated normal map (30 mm half-round flutes) over the wood albedo / roughness.
{
  const N = 1024; // = 0.6 m
  const flutes = 20;
  const buf = Buffer.alloc(N * N * 3);
  for (let x = 0; x < N; x++) {
    const t = ((x * flutes) / N) % 1; // 0..1 across a flute
    const slope = Math.cos(Math.PI * t) * 0.85; // convex rib
    const nx = -slope;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
    for (let y = 0; y < N; y++) {
      const i = (y * N + x) * 3;
      buf[i] = Math.round((nx * 0.5 + 0.5) * 255);
      buf[i + 1] = 128;
      buf[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    }
  }
  const dir = path.join(OUT, "fluted");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "normal.jpg"), await sharp(buf, { raw: { width: N, height: N, channels: 3 } }).jpeg({ quality: 92 }).toBuffer());
  credits.push("| `fluted/` | Generated by this script (30 mm flutes, normal map only; uses `wood/` colour) | this project | 0.60 m | fluted wood-look panel |");
  console.log("texture fluted (generated)");
}

const md = `# Exterior asset credits

All textures are **CC0 (public domain)** from [Poly Haven](https://polyhaven.com/license), or generated here. No attribution is required, but the authors are listed below.

- **Script:** \`npm run exterior:assets\` (\`scripts/exterior-fetch-assets.ts\`)
- **Format:** 1k JPG
- **Albedo:** each albedo is converted to neutral grey (linear mean 0.5), and the app tints it with the palette colour. The average tone equals the palette hex while the real grain, joints and grit stay.
- **Interior:** the interior module's own assets are listed in \`docs/ASSET_CREDITS.md\` and are not touched.

| Folder (\`public/exterior/textures/\`) | Source | Author(s) | Real size of one repeat | Used for |
|---|---|---|---|---|
${credits.join("\n")}
`;
writeFileSync("docs/exterior/ASSET_CREDITS.md", md);
writeFileSync(path.join(OUT, "sizes.json"), JSON.stringify(sizes, null, 2) + "\n");
console.log("wrote docs/exterior/ASSET_CREDITS.md");
