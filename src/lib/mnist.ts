export interface MnistManifest {
  format: string;
  input: number[];
  weights: { name: string; shape: number[]; offset: number }[];
}

export interface MnistModel {
  conv1K: Float32Array;
  conv1B: Float32Array;
  conv2K: Float32Array;
  conv2B: Float32Array;
  dense1K: Float32Array;
  dense1B: Float32Array;
  dense2K: Float32Array;
  dense2B: Float32Array;
  all: Float32Array;
}

const S = 28;
const C1 = 16;
const C2 = 32;
const H = 14;
const P = 7;
const D1 = 64;
const OUT = 10;

const weightSize = (shape: number[]) => shape.reduce((total, value) => total * value, 1);

export function loadMnistModel(manifest: MnistManifest, buffer: ArrayBuffer): MnistModel {
  const floats = new Float32Array(buffer);
  const take = (name: string): Float32Array => {
    const entry = manifest.weights.find((weight) => weight.name === name);
    if (!entry) throw new Error(`Bobot model tidak ditemukan: ${name}`);
    return floats.subarray(entry.offset, entry.offset + weightSize(entry.shape));
  };
  const model: MnistModel = {
    conv1K: take('conv2d_Conv2D1/kernel'),
    conv1B: take('conv2d_Conv2D1/bias'),
    conv2K: take('conv2d_Conv2D2/kernel'),
    conv2B: take('conv2d_Conv2D2/bias'),
    dense1K: take('dense_Dense1/kernel'),
    dense1B: take('dense_Dense1/bias'),
    dense2K: take('dense_Dense2/kernel'),
    dense2B: take('dense_Dense2/bias'),
    all: floats,
  };
  return model;
}

export function predict(model: MnistModel, input: Float32Array): Float32Array {
  const conv1 = new Float32Array(S * S * C1);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      for (let f = 0; f < C1; f++) {
        let sum = model.conv1B[f];
        for (let ky = 0; ky < 3; ky++) {
          const iy = y + ky - 1;
          if (iy < 0 || iy >= S) continue;
          for (let kx = 0; kx < 3; kx++) {
            const ix = x + kx - 1;
            if (ix < 0 || ix >= S) continue;
            sum += input[iy * S + ix] * model.conv1K[(ky * 3 + kx) * C1 + f];
          }
        }
        conv1[(y * S + x) * C1 + f] = sum > 0 ? sum : 0;
      }
    }
  }

  const pool1 = new Float32Array(H * H * C1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < H; x++) {
      for (let f = 0; f < C1; f++) {
        let max = -Infinity;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const value = conv1[((y * 2 + dy) * S + (x * 2 + dx)) * C1 + f];
            if (value > max) max = value;
          }
        }
        pool1[(y * H + x) * C1 + f] = max;
      }
    }
  }

  const conv2 = new Float32Array(H * H * C2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < H; x++) {
      for (let f = 0; f < C2; f++) {
        let sum = model.conv2B[f];
        for (let ky = 0; ky < 3; ky++) {
          const iy = y + ky - 1;
          if (iy < 0 || iy >= H) continue;
          for (let kx = 0; kx < 3; kx++) {
            const ix = x + kx - 1;
            if (ix < 0 || ix >= H) continue;
            const base = (iy * H + ix) * C1;
            const kbase = (ky * 3 + kx) * C1 * C2 + f;
            for (let c = 0; c < C1; c++) {
              sum += pool1[base + c] * model.conv2K[kbase + c * C2];
            }
          }
        }
        conv2[(y * H + x) * C2 + f] = sum > 0 ? sum : 0;
      }
    }
  }

  const pool2 = new Float32Array(P * P * C2);
  for (let y = 0; y < P; y++) {
    for (let x = 0; x < P; x++) {
      for (let f = 0; f < C2; f++) {
        let max = -Infinity;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const value = conv2[((y * 2 + dy) * H + (x * 2 + dx)) * C2 + f];
            if (value > max) max = value;
          }
        }
        pool2[(y * P + x) * C2 + f] = max;
      }
    }
  }

  const hidden = new Float32Array(D1);
  for (let o = 0; o < D1; o++) {
    let sum = model.dense1B[o];
    for (let i = 0; i < P * P * C2; i++) {
      sum += pool2[i] * model.dense1K[i * D1 + o];
    }
    hidden[o] = sum > 0 ? sum : 0;
  }

  const out = new Float32Array(OUT);
  let max = -Infinity;
  for (let o = 0; o < OUT; o++) {
    let sum = model.dense2B[o];
    for (let i = 0; i < D1; i++) {
      sum += hidden[i] * model.dense2K[i * OUT + o];
    }
    out[o] = sum;
    if (sum > max) max = sum;
  }
  let total = 0;
  for (let o = 0; o < OUT; o++) {
    out[o] = Math.exp(out[o] - max);
    total += out[o];
  }
  for (let o = 0; o < OUT; o++) out[o] /= total;
  return out;
}
