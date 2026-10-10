import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, 'scripts/.cache');
const MIRRORS = [
  'https://ossci-datasets.s3.amazonaws.com/mnist',
  'https://storage.googleapis.com/cvdf-datasets/mnist',
];

const files = {
  images: 't10k-images-idx3-ubyte.gz',
  labels: 't10k-labels-idx1-ubyte.gz',
};

async function download(name) {
  const target = path.join(cacheDir, name);
  if (existsSync(target)) return readFileSync(target);
  mkdirSync(cacheDir, { recursive: true });
  let lastError = null;
  for (const mirror of MIRRORS) {
    try {
      const response = await fetch(`${mirror}/${name}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(target, buffer);
      console.log(`downloaded ${name} (${(buffer.length / 1024).toFixed(0)} KB)`);
      return buffer;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Gagal mengunduh ${name}: ${lastError?.message}`);
}

function parseImages(buffer) {
  const data = gunzipSync(buffer);
  const magic = data.readUInt32BE(0);
  if (magic !== 0x00000803) throw new Error('Format gambar tidak dikenal');
  const count = data.readUInt32BE(4);
  const rows = data.readUInt32BE(8);
  const cols = data.readUInt32BE(12);
  const pixels = rows * cols;
  const images = new Float32Array(count * pixels);
  for (let i = 0; i < count * pixels; i++) {
    images[i] = data[16 + i] / 255;
  }
  return { count, pixels, images };
}

function parseLabels(buffer) {
  const data = gunzipSync(buffer);
  const magic = data.readUInt32BE(0);
  if (magic !== 0x00000801) throw new Error('Format label tidak dikenal');
  const count = data.readUInt32BE(4);
  const labels = new Uint8Array(count);
  for (let i = 0; i < count; i++) labels[i] = data[8 + i];
  return labels;
}

const outfile = path.join(tmpdir(), `blajar-eval-${Date.now()}.mjs`);
await build({
  entryPoints: [path.join(root, 'src/lib/mnist.ts')],
  bundle: true,
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const { loadMnistModel, predict } = await import(pathToFileURL(outfile).href);

const manifest = JSON.parse(readFileSync(path.join(root, 'public/models/mnist.json'), 'utf8'));
const bin = readFileSync(path.join(root, 'public/models/mnist.bin'));
const model = loadMnistModel(manifest, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));

const [imagesBuffer, labelsBuffer] = await Promise.all([
  download(files.images),
  download(files.labels),
]);
const { count, pixels, images } = parseImages(imagesBuffer);
const labels = parseLabels(labelsBuffer);
const limit = Number(process.env.EVAL_LIMIT || count);

const confusion = Array.from({ length: 10 }, () => new Array(10).fill(0));
let correct = 0;
let unsure = 0;
let lowMargin = 0;
const input = new Float32Array(pixels);

for (let i = 0; i < limit; i++) {
  input.set(images.subarray(i * pixels, (i + 1) * pixels));
  const probs = predict(model, input);
  let best = 0;
  let second = 1;
  for (let d = 1; d < 10; d++) {
    if (probs[d] > probs[best]) {
      second = best;
      best = d;
    } else if (probs[d] > probs[second]) {
      second = d;
    }
  }
  const expected = labels[i];
  confusion[expected][best]++;
  if (best === expected) correct++;
  if (probs[best] < 0.5) unsure++;
  if (probs[best] - probs[second] < 0.1) lowMargin++;
  if ((i + 1) % 2000 === 0) console.log(`  ... ${i + 1}/${limit}`);
}

const accuracy = correct / limit;
console.log(`\nMNIST test accuracy: ${(accuracy * 100).toFixed(2)}% (${correct}/${limit})`);
console.log(`unsure (<0.5 confidence): ${((unsure / limit) * 100).toFixed(1)}%`);
console.log(`low margin (<0.1):        ${((lowMargin / limit) * 100).toFixed(1)}%`);

const wasmPath = path.join(root, 'public/models/mnist.wasm');
if (existsSync(wasmPath)) {
  const { instance } = await WebAssembly.instantiate(readFileSync(wasmPath), {});
  const exports = instance.exports;
  const wasmWeights = new Float32Array(exports.memory.buffer, exports.weightsPtr(), model.all.length);
  wasmWeights.set(model.all);
  let maxDiff = 0;
  const probes = Math.min(1000, limit);
  for (let i = 0; i < probes; i++) {
    input.set(images.subarray(i * pixels, (i + 1) * pixels));
    const reference = predict(model, input);
    const wasmInput = new Float32Array(exports.memory.buffer, exports.inputPtr(), 784);
    wasmInput.set(input);
    exports.predict();
    const logits = new Float32Array(exports.memory.buffer, exports.outputPtr(), 10);
    let max = -Infinity;
    for (let d = 0; d < 10; d++) if (logits[d] > max) max = logits[d];
    let total = 0;
    const probs = new Float32Array(10);
    for (let d = 0; d < 10; d++) {
      probs[d] = Math.exp(logits[d] - max);
      total += probs[d];
    }
    for (let d = 0; d < 10; d++) {
      const diff = Math.abs(probs[d] / total - reference[d]);
      if (diff > maxDiff) maxDiff = diff;
    }
  }
  console.log(`wasm parity (${probes} samples): max probability diff ${maxDiff.toExponential(2)}`);
}

console.log('\nPer-digit accuracy:');
for (let d = 0; d < 10; d++) {
  const total = confusion[d].reduce((sum, value) => sum + value, 0);
  const hit = confusion[d][d];
  const top = confusion[d]
    .map((value, predicted) => ({ value, predicted }))
    .filter((entry) => entry.predicted !== d)
    .sort((a, b) => b.value - a.value)[0];
  console.log(
    `  ${d}: ${((hit / total) * 100).toFixed(1).padStart(5)}%  (most confused with ${top.value > 0 ? `${top.predicted} x${top.value}` : '-'})`,
  );
}
