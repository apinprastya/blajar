import { loadMnistModel, predict, type MnistManifest, type MnistModel } from './mnist';
import { paintStrokes, type StrokePoint } from './strokes';

export interface DigitRecognition {
  digit: number;
  confidence: number;
  margin: number;
  probs: Float32Array;
}

let modelPromise: Promise<MnistModel> | null = null;

function getModel(): Promise<MnistModel> {
  if (!modelPromise) {
    const base = import.meta.env?.BASE_URL ?? '/';
    modelPromise = Promise.all([
      fetch(`${base}models/mnist.json`).then((response) => {
        if (!response.ok) throw new Error('Gagal memuat model');
        return response.json() as Promise<MnistManifest>;
      }),
      fetch(`${base}models/mnist.bin`).then((response) => {
        if (!response.ok) throw new Error('Gagal memuat bobot model');
        return response.arrayBuffer();
      }),
    ])
      .then(([manifest, buffer]) => loadMnistModel(manifest, buffer))
      .catch((error) => {
        modelPromise = null;
        throw error;
      });
  }
  return modelPromise;
}

export function preloadModel(): void {
  void getModel().catch(() => {
    /* fallback: keypad */
  });
}

export function isModelReady(): boolean {
  return modelPromise !== null;
}

function centerByMass(values: Float32Array): Float32Array {
  let sum = 0;
  let meanX = 0;
  let meanY = 0;
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const value = values[y * 28 + x];
      if (value <= 0) continue;
      sum += value;
      meanX += x * value;
      meanY += y * value;
    }
  }
  if (sum === 0) return values;
  const shiftX = Math.round(13.5 - meanX / sum);
  const shiftY = Math.round(13.5 - meanY / sum);
  if (shiftX === 0 && shiftY === 0) return values;
  const out = new Float32Array(784);
  for (let y = 0; y < 28; y++) {
    const sourceY = y - shiftY;
    if (sourceY < 0 || sourceY >= 28) continue;
    for (let x = 0; x < 28; x++) {
      const sourceX = x - shiftX;
      if (sourceX < 0 || sourceX >= 28) continue;
      out[y * 28 + x] = values[sourceY * 28 + sourceX];
    }
  }
  return out;
}

export function canvasToMnistInput(canvas: HTMLCanvasElement): Float32Array | null {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const { width, height } = canvas;
  if (width === 0 || height === 0) return null;

  const image = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let inkPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (image[(y * width + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        inkPixels++;
      }
    }
  }
  if (maxX < 0 || inkPixels < 25) return null;

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  if (boxWidth < width * 0.03 && boxHeight < height * 0.03) return null;

  const small = document.createElement('canvas');
  small.width = 28;
  small.height = 28;
  const smallContext = small.getContext('2d');
  if (!smallContext) return null;
  smallContext.imageSmoothingEnabled = true;
  smallContext.imageSmoothingQuality = 'high';
  const scale = 20 / Math.max(boxWidth, boxHeight);
  const drawWidth = boxWidth * scale;
  const drawHeight = boxHeight * scale;
  smallContext.drawImage(
    canvas,
    minX,
    minY,
    boxWidth,
    boxHeight,
    (28 - drawWidth) / 2,
    (28 - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );

  const smallData = smallContext.getImageData(0, 0, 28, 28).data;
  const values = new Float32Array(784);
  for (let i = 0; i < 784; i++) {
    values[i] = smallData[i * 4 + 3] / 255;
  }
  return centerByMass(values);
}

export async function recognizeDigit(canvas: HTMLCanvasElement): Promise<DigitRecognition | null> {
  const input = canvasToMnistInput(canvas);
  if (!input) return null;
  const model = await getModel();
  const probs = predict(model, input);
  let digit = 0;
  for (let i = 1; i < 10; i++) {
    if (probs[i] > probs[digit]) digit = i;
  }
  let second = digit === 0 ? 1 : 0;
  for (let i = 0; i < 10; i++) {
    if (i !== digit && probs[i] > probs[second]) second = i;
  }
  return {
    digit,
    confidence: probs[digit],
    margin: probs[digit] - probs[second],
    probs,
  };
}

export function segmentStrokes(
  strokes: StrokePoint[][],
  canvasWidth: number,
): StrokePoint[][][] {
  if (strokes.length === 0) return [];
  if (strokes.length === 1) return [strokes];

  const boxes = strokes.map((stroke) => {
    let minX = Infinity;
    let maxX = -Infinity;
    for (const point of stroke) {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
    }
    return { minX, maxX };
  });

  const order = strokes.map((_, index) => index).sort((a, b) => boxes[a].minX - boxes[b].minX);
  const gapThreshold = canvasWidth * 0.12;
  const clusters: number[][] = [];
  let current: number[] = [];
  let currentMaxX = -Infinity;

  for (const index of order) {
    if (current.length === 0) {
      current = [index];
      currentMaxX = boxes[index].maxX;
      continue;
    }
    if (boxes[index].minX - currentMaxX > gapThreshold) {
      clusters.push(current);
      current = [index];
      currentMaxX = boxes[index].maxX;
    } else {
      current.push(index);
      currentMaxX = Math.max(currentMaxX, boxes[index].maxX);
    }
  }
  if (current.length > 0) clusters.push(current);
  return clusters.map((cluster) => cluster.map((index) => strokes[index]));
}

function clusterLength(cluster: StrokePoint[][]): number {
  let total = 0;
  for (const stroke of cluster) {
    for (let i = 1; i < stroke.length; i++) {
      const dx = stroke[i].x - stroke[i - 1].x;
      const dy = stroke[i].y - stroke[i - 1].y;
      total += Math.hypot(dx, dy);
    }
  }
  return total;
}

export async function recognizeStrokes(
  source: HTMLCanvasElement,
  strokes: StrokePoint[][],
): Promise<DigitRecognition[] | null> {
  const clusters = segmentStrokes(strokes, source.width);
  if (clusters.length === 0) return null;
  const minLength = Math.min(source.width, source.height) * 0.08;
  const results: DigitRecognition[] = [];
  for (const cluster of clusters) {
    if (clusterLength(cluster) < minLength) continue;
    const scratch = document.createElement('canvas');
    scratch.width = source.width;
    scratch.height = source.height;
    const context = scratch.getContext('2d');
    if (!context) return null;
    paintStrokes(context, cluster, Math.min(source.width, source.height));
    const recognition = await recognizeDigit(scratch);
    if (!recognition) return null;
    results.push(recognition);
  }
  return results.length > 0 ? results : null;
}
