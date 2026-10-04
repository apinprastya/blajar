const S: i32 = 28;
const C1: i32 = 16;
const C2: i32 = 32;
const H: i32 = 14;
const P: i32 = 7;
const D1: i32 = 64;
const OUT: i32 = 10;

const F: i32 = 4;

const W1 = 3 * 3 * 1 * C1;
const B1 = C1;
const W2 = 3 * 3 * C1 * C2;
const B2 = C2;
const WD1 = P * P * C2 * D1;
const BD1 = D1;
const WD2 = D1 * OUT;
const BD2 = OUT;
const TOTAL_WEIGHTS = W1 + B1 + W2 + B2 + WD1 + BD1 + WD2 + BD2;

const INPUT_FLOATS = 784;
const OUTPUT_FLOATS = OUT;

const SCRATCH_FLOATS =
  S * S * C1 + H * H * C1 + H * H * C2 + P * P * C2 + D1 + OUT;

const BLOCK = memory.data(
  (INPUT_FLOATS + OUTPUT_FLOATS + TOTAL_WEIGHTS + SCRATCH_FLOATS) * F,
  16,
);

const SCRATCH = BLOCK + (INPUT_FLOATS + OUTPUT_FLOATS + TOTAL_WEIGHTS) * F;
const CONV1 = SCRATCH;
const POOL1 = CONV1 + S * S * C1 * F;
const CONV2 = POOL1 + H * H * C1 * F;
const POOL2 = CONV2 + H * H * C2 * F;
const HIDDEN = POOL2 + P * P * C2 * F;

export function inputPtr(): usize {
  return BLOCK;
}

export function outputPtr(): usize {
  return BLOCK + INPUT_FLOATS * F;
}

export function weightsPtr(): usize {
  return BLOCK + (INPUT_FLOATS + OUTPUT_FLOATS) * F;
}

export function predict(): void {
  const input = inputPtr();
  const w = weightsPtr();
  const wConv1 = w;
  const bConv1 = wConv1 + W1 * F;
  const wConv2 = bConv1 + B1 * F;
  const bConv2 = wConv2 + W2 * F;
  const wD1 = bConv2 + B2 * F;
  const bD1 = wD1 + WD1 * F;
  const wD2 = bD1 + BD1 * F;
  const bD2 = wD2 + WD2 * F;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      for (let f = 0; f < C1; f++) {
        let sum = load<f32>(bConv1 + f * F);
        for (let ky = 0; ky < 3; ky++) {
          const iy = y + ky - 1;
          if (iy < 0 || iy >= S) continue;
          for (let kx = 0; kx < 3; kx++) {
            const ix = x + kx - 1;
            if (ix < 0 || ix >= S) continue;
            sum +=
              load<f32>(input + (iy * S + ix) * F) *
              load<f32>(wConv1 + ((ky * 3 + kx) * C1 + f) * F);
          }
        }
        store<f32>(CONV1 + ((y * S + x) * C1 + f) * F, sum > 0 ? sum : 0);
      }
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < H; x++) {
      for (let f = 0; f < C1; f++) {
        let max: f32 = -1e38;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const value = load<f32>(
              CONV1 + (((y * 2 + dy) * S + (x * 2 + dx)) * C1 + f) * F,
            );
            if (value > max) max = value;
          }
        }
        store<f32>(POOL1 + ((y * H + x) * C1 + f) * F, max);
      }
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < H; x++) {
      for (let f = 0; f < C2; f++) {
        let sum = load<f32>(bConv2 + f * F);
        for (let ky = 0; ky < 3; ky++) {
          const iy = y + ky - 1;
          if (iy < 0 || iy >= H) continue;
          for (let kx = 0; kx < 3; kx++) {
            const ix = x + kx - 1;
            if (ix < 0 || ix >= H) continue;
            const base = (iy * H + ix) * C1;
            const kbase = (ky * 3 + kx) * C1 * C2 + f;
            for (let c = 0; c < C1; c++) {
              sum +=
                load<f32>(POOL1 + (base + c) * F) *
                load<f32>(wConv2 + (kbase + c * C2) * F);
            }
          }
        }
        store<f32>(CONV2 + ((y * H + x) * C2 + f) * F, sum > 0 ? sum : 0);
      }
    }
  }

  for (let y = 0; y < P; y++) {
    for (let x = 0; x < P; x++) {
      for (let f = 0; f < C2; f++) {
        let max: f32 = -1e38;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const value = load<f32>(
              CONV2 + (((y * 2 + dy) * H + (x * 2 + dx)) * C2 + f) * F,
            );
            if (value > max) max = value;
          }
        }
        store<f32>(POOL2 + ((y * P + x) * C2 + f) * F, max);
      }
    }
  }

  const FLAT = P * P * C2;
  for (let o = 0; o < D1; o++) {
    let sum = load<f32>(bD1 + o * F);
    for (let i = 0; i < FLAT; i++) {
      sum += load<f32>(POOL2 + i * F) * load<f32>(wD1 + (i * D1 + o) * F);
    }
    store<f32>(HIDDEN + o * F, sum > 0 ? sum : 0);
  }

  const output = outputPtr();
  for (let o = 0; o < OUT; o++) {
    let sum = load<f32>(bD2 + o * F);
    for (let i = 0; i < D1; i++) {
      sum += load<f32>(HIDDEN + i * F) * load<f32>(wD2 + (i * OUT + o) * F);
    }
    store<f32>(output + o * F, sum);
  }
}
