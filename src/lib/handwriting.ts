import { loadMnistModel, predict, type MnistManifest, type MnistModel } from './mnist';
import { predictWithWasm, preloadWasmModel } from './mnistWasm';
import type { StrokePoint } from './strokes';

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
  preloadWasmModel();
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

export function strokesToMnistInput(
  strokes: StrokePoint[][],
  sourceWidth: number,
  sourceHeight: number,
): Float32Array | null {
  if (strokes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let totalPoints = 0;
  for (const stroke of strokes) {
    for (const point of stroke) {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
      totalPoints++;
    }
  }
  if (!isFinite(minX) || totalPoints === 0) return null;

  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;
  const canvasSize = Math.min(sourceWidth, sourceHeight);
  if (boxWidth < canvasSize * 0.01 && boxHeight < canvasSize * 0.01 && totalPoints < 2) return null;

  const small = document.createElement('canvas');
  small.width = 28;
  small.height = 28;
  const smallContext = small.getContext('2d');
  if (!smallContext) return null;
  smallContext.fillStyle = '#000';
  smallContext.fillRect(0, 0, 28, 28);

  const padding = 4;
  const maxBox = Math.max(boxWidth, boxHeight) || 1;
  const scale = (28 - 2 * padding) / maxBox;
  const drawWidth = boxWidth * scale;
  const drawHeight = boxHeight * scale;
  const offsetX = (28 - drawWidth) / 2;
  const offsetY = (28 - drawHeight) / 2;

  smallContext.strokeStyle = '#fff';
  smallContext.fillStyle = '#fff';
  smallContext.lineCap = 'round';
  smallContext.lineJoin = 'round';
  smallContext.lineWidth = Math.max(1.8, Math.min(3.5, 18 * scale));

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      const x = offsetX + (stroke[0].x - minX) * scale;
      const y = offsetY + (stroke[0].y - minY) * scale;
      smallContext.beginPath();
      smallContext.arc(x, y, smallContext.lineWidth / 2, 0, Math.PI * 2);
      smallContext.fill();
      continue;
    }
    smallContext.beginPath();
    stroke.forEach((point, index) => {
      const x = offsetX + (point.x - minX) * scale;
      const y = offsetY + (point.y - minY) * scale;
      if (index === 0) smallContext.moveTo(x, y);
      else smallContext.lineTo(x, y);
    });
    smallContext.stroke();
  }

  const smallData = smallContext.getImageData(0, 0, 28, 28).data;
  const values = new Float32Array(784);
  for (let i = 0; i < 784; i++) {
    values[i] = smallData[i * 4] / 255;
  }
  return centerByMass(values);
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
  if (maxX < 0 || inkPixels < 15) return null;

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  if (boxWidth < width * 0.02 && boxHeight < height * 0.02) return null;

  const small = document.createElement('canvas');
  small.width = 28;
  small.height = 28;
  const smallContext = small.getContext('2d');
  if (!smallContext) return null;
  smallContext.fillStyle = '#000';
  smallContext.fillRect(0, 0, 28, 28);
  smallContext.imageSmoothingEnabled = true;
  smallContext.imageSmoothingQuality = 'high';

  const padding = 4;
  const scale = Math.min((28 - 2 * padding) / boxWidth, (28 - 2 * padding) / boxHeight);
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
    values[i] = smallData[i * 4] / 255;
  }
  return centerByMass(values);
}

export async function recognizeDigit(canvas: HTMLCanvasElement): Promise<DigitRecognition | null> {
  const input = canvasToMnistInput(canvas);
  if (!input) return null;
  const model = await getModel();
  const probs = (await predictWithWasm(model, input)) ?? predict(model, input);
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
  const gapThreshold = Math.max(canvasWidth * 0.08, 30);
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
  const minLength = Math.min(source.width, source.height) * 0.05;
  const results: DigitRecognition[] = [];
  for (const cluster of clusters) {
    if (clusterLength(cluster) < minLength) continue;
    const input = strokesToMnistInput(cluster, source.width, source.height);
    if (!input) continue;
    const model = await getModel();
    const probs = (await predictWithWasm(model, input)) ?? predict(model, input);
    let digit = 0;
    for (let i = 1; i < 10; i++) {
      if (probs[i] > probs[digit]) digit = i;
    }
    let second = digit === 0 ? 1 : 0;
    for (let i = 0; i < 10; i++) {
      if (i !== digit && probs[i] > probs[second]) second = i;
    }
    results.push({
      digit,
      confidence: probs[digit],
      margin: probs[digit] - probs[second],
      probs,
    });
  }
  return results.length > 0 ? results : null;
}
