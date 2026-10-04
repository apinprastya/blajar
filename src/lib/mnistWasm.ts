import type { MnistModel } from './mnist';

interface MnistWasmExports {
  memory: WebAssembly.Memory;
  predict: () => void;
  inputPtr: () => number;
  outputPtr: () => number;
  weightsPtr: () => number;
}

let wasmPromise: Promise<MnistWasmExports | null> | null = null;
let weightsModel: MnistModel | null = null;

function getWasm(): Promise<MnistWasmExports | null> {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      try {
        const base = import.meta.env?.BASE_URL ?? '/';
        const response = await fetch(`${base}models/mnist.wasm`);
        if (!response.ok) throw new Error('wasm tidak tersedia');
        const bytes = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, {});
        const exports = instance.exports as unknown as MnistWasmExports;
        if (typeof exports.predict !== 'function') throw new Error('ekspor wasm tidak valid');
        return exports;
      } catch {
        return null;
      }
    })();
  }
  return wasmPromise;
}

export function preloadWasmModel(): void {
  void getWasm();
}

function softmax(logits: Float32Array): Float32Array {
  let max = -Infinity;
  for (let i = 0; i < 10; i++) {
    if (logits[i] > max) max = logits[i];
  }
  const probs = new Float32Array(10);
  let total = 0;
  for (let i = 0; i < 10; i++) {
    probs[i] = Math.exp(logits[i] - max);
    total += probs[i];
  }
  for (let i = 0; i < 10; i++) probs[i] /= total;
  return probs;
}

export async function predictWithWasm(
  model: MnistModel,
  input: Float32Array,
): Promise<Float32Array | null> {
  const wasm = await getWasm();
  if (!wasm) return null;
  try {
    const inputView = new Float32Array(wasm.memory.buffer, wasm.inputPtr(), 784);
    inputView.set(input);
    if (weightsModel !== model) {
      const weightView = new Float32Array(wasm.memory.buffer, wasm.weightsPtr(), model.all.length);
      weightView.set(model.all);
      weightsModel = model;
    }
    wasm.predict();
    const logits = new Float32Array(wasm.memory.buffer, wasm.outputPtr(), 10);
    return softmax(logits);
  } catch {
    return null;
  }
}
