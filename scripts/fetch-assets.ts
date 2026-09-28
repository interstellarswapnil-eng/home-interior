/**
 * `npm run fetch-assets` — downloads the CC0 textures / HDRI / model used by the realism layer
 * from Poly Haven (https://polyhaven.com, CC0) into public/, and recolours the albedo maps to the
 * lighter-modern palette in plan/materials.ts (keeping the real surface detail: grain, speckle,
 * weave, grout). Outputs are committed, so this only needs re-running to regenerate them.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { palette } from "../plan/materials";

const API = "https://api.polyhaven.com";
const RES = "1k";

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
type Files = Record<string, Record<string, Record<string, { url: string; include?: Record<string, { url: string }> }>>>;

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/**
 * Recolour: luminance z-score → target colour × (1 + k·z). Keeps the texture's structure
 * (grout, grain, weave) at a controlled contrast around the palette colour.
 * `veins` optionally darkens along another texture's dark streaks (granite vein).
 */
async function recolour(src: Buffer, target: string, k: number, veins?: { src: Buffer; k: number }) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const lum = new Float32Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) mean += lum[i] = 0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2];
  mean /= n;
  let v = 0;
  for (let i = 0; i < n; i++) v += (lum[i] - mean) ** 2;
  const std = Math.sqrt(v / n) || 1;

  let vein: Float32Array | null = null;
  if (veins) {
    const { data: vd } = await sharp(veins.src).removeAlpha().resize(info.width, info.height).raw().toBuffer({ resolveWithObject: true });
    vein = new Float32Array(n);
    let vm = 0;
    for (let i = 0; i < n; i++) vm += vein[i] = 0.2126 * vd[i * 3] + 0.7152 * vd[i * 3 + 1] + 0.0722 * vd[i * 3 + 2];
    vm /= n;
    let vv = 0;
    for (let i = 0; i < n; i++) vv += (vein[i] - vm) ** 2;
    const vs = Math.sqrt(vv / n) || 1;
    for (let i = 0; i < n; i++) vein[i] = Math.min(0, (vein[i] - vm) / vs); // only dark streaks
  }
  const [tr, tg, tb] = hex(target);
  const out = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    const z = Math.max(-3.5, Math.min(3.5, (lum[i] - mean) / std));
    let f = 1 + k * z;
    if (vein && veins) f *= 1 + veins.k * Math.max(-3, vein[i]);
    out[i * 3] = Math.max(0, Math.min(255, tr * f));
    out[i * 3 + 1] = Math.max(0, Math.min(255, tg * f));
    out[i * 3 + 2] = Math.max(0, Math.min(255, tb * f));
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).jpeg({ quality: 86 }).toBuffer();
}

type TexSpec = { id: string; out: string; target?: string; k?: number; veins?: { id: string; k: number }; albedo?: boolean };

const textures: TexSpec[] = [
  { id: "interior_tiles", out: "floor-dry", target: palette.floorDry, k: 0.055 },
  { id: "anti_skid_tiles", out: "floor-wet", target: palette.floorWet, k: 0.07 },
  { id: "silver_oak_veneer_01", out: "oak", target: palette.laminateOak, k: 0.1 },
  { id: "rough_linen", out: "fabric", target: palette.fabric, k: 0.09 },
  { id: "plastered_wall", out: "wall", albedo: false },
];

const credits: string[] = [];

for (const t of textures) {
  const dir = path.join("public/textures", t.out);
  mkdirSync(dir, { recursive: true });
  const files = await json<Files>(`${API}/files/${t.id}`);
  const info = await json<{ name: string; authors: Record<string, string>; dimensions?: number[] }>(`${API}/info/${t.id}`);
  const url = (map: string) => files[map][RES].jpg.url;
  if (t.albedo !== false) {
    const diff = await bytes(url("Diffuse"));
    const veins = t.veins ? await bytes((await json<Files>(`${API}/files/${t.veins.id}`)).Diffuse[RES].jpg.url) : undefined;
    writeFileSync(path.join(dir, "albedo.jpg"), await recolour(diff, t.target!, t.k!, veins && { src: veins, k: t.veins!.k }));
  }
  writeFileSync(path.join(dir, "normal.jpg"), await bytes(url("nor_gl")));
  writeFileSync(path.join(dir, "rough.jpg"), await bytes(url("Rough")));
  const size = info.dimensions ? `${(info.dimensions[0] / 1000).toFixed(2)} m` : "?";
  credits.push(
    `| \`public/textures/${t.out}/\` | [${info.name}](https://polyhaven.com/a/${t.id})${t.veins ? ` + vein from [marble_01](https://polyhaven.com/a/${t.veins.id})` : ""} | ${Object.keys(info.authors).join(", ")} | ${size} | CC0 | ${t.albedo === false ? "normal + roughness only" : "albedo recoloured to palette"} |`,
  );
  console.log(`texture ${t.out} ← ${t.id} (${size})`);
}

// Artificial granite: generated (seamless slab — the CC0 granite scans are laid as tiles with grout,
// which is wrong for a continuous counter). Pale base, fine mixed speckle, soft mottling, faint veins.
{
  const N = 1024; // represents 1.0 m
  const [br, bg, bb] = hex(palette.granite);
  const px = new Float32Array(N * N * 3);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // tileable value noise
  const lattice = (cells: number) => Array.from({ length: cells * cells }, rnd);
  const noise = (g: number[], cells: number, x: number, y: number) => {
    const fx = (x / N) * cells;
    const fy = (y / N) * cells;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const at = (i: number, j: number) => g[((j % cells) + cells) % cells * cells + (((i % cells) + cells) % cells)];
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
  const g8 = lattice(8);
  const g32 = lattice(32);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const m = 1 + 0.025 * (noise(g8, 8, x, y) - 0.5) * 2 + 0.012 * (noise(g32, 32, x, y) - 0.5) * 2;
      const i = (y * N + x) * 3;
      px[i] = br * m;
      px[i + 1] = bg * m;
      px[i + 2] = bb * m;
    }
  const dot = (cx: number, cy: number, r: number, col: number[], a: number) => {
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        const w = a * (1 - (d / r) ** 2 * 0.6);
        const x = (((cx + dx) % N) + N) % N;
        const y = (((cy + dy) % N) + N) % N;
        const i = (y * N + x) * 3;
        for (let c = 0; c < 3; c++) px[i + c] = px[i + c] * (1 - w) + col[c] * w;
      }
  };
  const specks: [number[], number, number][] = [
    [hex("#8F8A82"), 0.3, 5200],
    [hex("#6E6A64"), 0.22, 1600],
    [hex("#D9CDB8"), 0.45, 4200],
    [hex("#FFFFFF"), 0.35, 2500],
  ];
  for (const [col, a, count] of specks)
    for (let k = 0; k < count; k++) dot(Math.floor(rnd() * N), Math.floor(rnd() * N), 0.6 + rnd() * 1.6, col, a * (0.5 + rnd() * 0.5));
  // faint veins, periodic in x so the texture tiles
  const vein = hex("#B9B3A8");
  for (let v = 0; v < 3; v++) {
    const y0 = rnd() * N;
    const amp = 40 + rnd() * 90;
    const k = 1 + Math.floor(rnd() * 2);
    const ph = rnd() * Math.PI * 2;
    for (let x = 0; x < N; x++) {
      const yy = y0 + amp * Math.sin((2 * Math.PI * k * x) / N + ph) + 12 * (noise(g32, 32, x, y0) - 0.5);
      dot(x, Math.round(yy), 2.2 + 2.0 * noise(g8, 8, x, yy), vein, 0.035);
    }
  }
  const out = Buffer.alloc(N * N * 3);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, px[i]));
  mkdirSync("public/textures/granite", { recursive: true });
  writeFileSync("public/textures/granite/albedo.jpg", await sharp(out, { raw: { width: N, height: N, channels: 3 } }).jpeg({ quality: 88 }).toBuffer());
  credits.push("| `public/textures/granite/` | Generated by `scripts/fetch-assets.ts` (procedural speckle + vein) | this project | 1.00 m | CC0 (own work) | seamless pale artificial granite |");
  console.log("texture granite (procedural)");
}

// HDRI (environment lighting only; not shown as background)
{
  mkdirSync("public/hdri", { recursive: true });
  const id = "small_empty_room_1";
  const files = await json<Files>(`${API}/files/${id}`);
  const info = await json<{ name: string; authors: Record<string, string> }>(`${API}/info/${id}`);
  writeFileSync(`public/hdri/${id}_${RES}.hdr`, await bytes((files.hdri[RES] as unknown as { hdr: { url: string } }).hdr.url));
  credits.push(`| \`public/hdri/${id}_${RES}.hdr\` | [${info.name}](https://polyhaven.com/a/${id}) | ${Object.keys(info.authors).join(", ")} | HDRI | CC0 | environment lighting only |`);
  console.log(`hdri ${id}`);
}

// Model: light-oak side table (the only Poly Haven furniture that matches the lighter-modern brief)
{
  const id = "side_table_01";
  const dir = `public/models/${id}`;
  mkdirSync(`${dir}/textures`, { recursive: true });
  const files = await json<Files>(`${API}/files/${id}`);
  const info = await json<{ name: string; authors: Record<string, string> }>(`${API}/info/${id}`);
  const g = files.gltf[RES].gltf;
  writeFileSync(`${dir}/${id}.gltf`, await bytes(g.url));
  for (const [rel, f] of Object.entries(g.include ?? {})) writeFileSync(path.join(dir, rel), await bytes(f.url));
  credits.push(`| \`${dir}/\` | [${info.name}](https://polyhaven.com/a/${id}) | ${Object.keys(info.authors).join(", ")} | glTF 1k | CC0 | master bedside tables |`);
  console.log(`model ${id}`);
}

writeFileSync("public/ASSET_SOURCES.generated.md", ["| Path | Source | Author(s) | Size | License | Notes |", "|---|---|---|---|---|---|", ...credits].join("\n") + "\n");
console.log(existsSync("public/ASSET_SOURCES.generated.md") ? "wrote public/ASSET_SOURCES.generated.md" : "");
