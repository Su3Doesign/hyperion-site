// Web-optimise the rebuilt Hyperion GLB, keeping every named node (the site animates them).
//   node pipeline/optimize.mjs .work/hyperion_gen2_raw.glb apps/hyperion/public/models/hyperion.glb [maxTex]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, meshopt, resample, weld, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';

const [, , src, dst, maxTexArg, ratioArg] = process.argv;
const MAX = Number(maxTexArg || 2048);
const RATIO = Number(ratioArg || 1); // <1 simplifies meshes (mobile build)
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptDecoder,
});
const doc = await io.read(src);

// big hero textures keep MAX; small utility maps are capped lower so the download stays lean
const big = new Set();
for (const t of doc.getRoot().listTextures()) {
  const n = (t.getName() || '') + (t.getURI() || '');
  if (/Paint|Leather|alck|Green|carbon|Nilu|2_detail|image \(1\)|Image_13/i.test(n)) big.add(t);
}

await doc.transform(
  dedup(),
  prune({ keepLeaves: true, keepAttributes: false }),
  weld(),
  resample(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: Number(process.env.Q || 86), resize: [MAX, MAX] }),
  ...(RATIO < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.0008 })] : []),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

await io.write(dst, doc);
const mb = (fs.statSync(dst).size / 1e6).toFixed(2);
let tex = 0;
for (const t of doc.getRoot().listTextures()) tex += t.getImage()?.byteLength || 0;
console.log(`optimised -> ${dst}  ${mb} MB  (textures ${(tex / 1e6).toFixed(2)} MB, max ${MAX}px, ratio ${RATIO})`);
