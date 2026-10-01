/**
 * `npm run exterior:hdri` — downloads the CC0 sky HDRIs (Poly Haven "puresky": sky only, no foreign buildings) into
 * public/exterior/hdri/ and records where each sky's sun is, so the app can rotate the sky to match the real sun.
 */
import { mkdirSync, writeFileSync, appendFileSync, readFileSync } from "node:fs";
import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

const OUT = "public/exterior/hdri";
mkdirSync(OUT, { recursive: true });

const SKIES: { key: string; id: string; res: "1k" | "2k"; use: string }[] = [
  { key: "day", id: "qwantani_afternoon_puresky", res: "2k", use: "sunny, sun above ~15°" },
  { key: "golden", id: "qwantani_late_afternoon_puresky", res: "2k", use: "sunny, low sun (morning / evening)" },
  { key: "overcast", id: "kloofendal_overcast_puresky", res: "1k", use: "cloudy" },
  { key: "night", id: "qwantani_night_puresky", res: "1k", use: "night" },
];

type Files = { hdri: Record<string, { hdr: { url: string } }> };
const meta: Record<string, { file: string; sunU: number; sunElevationDeg: number }> = {};
const credits: string[] = [];

for (const s of SKIES) {
  const files = (await (await fetch(`https://api.polyhaven.com/files/${s.id}`)).json()) as Files;
  const info = (await (await fetch(`https://api.polyhaven.com/info/${s.id}`)).json()) as { name: string; authors: Record<string, string> };
  const buf = Buffer.from(await (await fetch(files.hdri[s.res].hdr.url)).arrayBuffer());
  const file = `${s.key}_${s.res}.hdr`;
  writeFileSync(`${OUT}/${file}`, buf);
  // find the sun: brightest pixel (luminance) in the equirect image
  const loader = new HDRLoader().setDataType(THREE.FloatType);
  const tex = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  const { width, height, data } = tex as unknown as { width: number; height: number; data: Float32Array };
  let best = -1;
  let bi = 0;
  for (let i = 0; i < width * height; i++) {
    const l = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
    if (l > best) (best = l), (bi = i);
  }
  const u = ((bi % width) + 0.5) / width;
  const v = (Math.floor(bi / width) + 0.5) / height; // 0 = top
  // sunU: horizontal position of the sun in the image (0..1); the app turns it into a sky rotation
  meta[s.key] = { file, sunU: Math.round(u * 1e4) / 1e4, sunElevationDeg: Math.round((90 - v * 180) * 10) / 10 };
  credits.push(`| \`hdri/${file}\` | [${info.name}](https://polyhaven.com/a/${s.id}) | ${Object.keys(info.authors).join(", ")} | ${s.res} | ${s.use} |`);
  console.log(`hdri ${s.key} ← ${s.id} (${(buf.length / 1e6).toFixed(1)} MB) sun u=${u.toFixed(3)} elev=${(90 - v * 180).toFixed(1)}°`);
}
writeFileSync(`${OUT}/skies.json`, JSON.stringify(meta, null, 2) + "\n");

const md = "docs/exterior/ASSET_CREDITS.md";
const prev = readFileSync(md, "utf8").split("\n## Skies")[0].trimEnd();
writeFileSync(md, prev + "\n");
appendFileSync(
  md,
  `\n## Skies (HDRI)\n\nCC0 from Poly Haven, "pure sky" versions: sky only, no foreign landscape. They're downloaded by \`npm run exterior:hdri\` and loaded only for the light mode that uses them. Each sky is rotated so its sun lines up with the real sun for Ahilyanagar.\n\n| File (\`public/exterior/\`) | Source | Author(s) | Resolution | Used for |\n|---|---|---|---|---|\n${credits.join("\n")}\n`,
);
console.log("wrote skies.json and credits");
