import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules/onnxruntime-web/dist');
const target = path.join(root, 'public/ort');
const files = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
];

if (!existsSync(source)) {
  console.warn('[copy-ort] onnxruntime-web tidak ditemukan, dilewati');
  process.exit(0);
}

mkdirSync(target, { recursive: true });
let copied = 0;
for (const file of files) {
  const from = path.join(source, file);
  const to = path.join(target, file);
  if (!existsSync(from) || existsSync(to)) continue;
  copyFileSync(from, to);
  copied += 1;
}
console.log(`[copy-ort] ${copied} file disalin ke public/ort (${files.length} total)`);
