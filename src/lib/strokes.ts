export interface StrokePoint {
  x: number;
  y: number;
}

export const INK_COLOR = '#2D3436';

export const STROKE_RATIO = 0.03;

export function paintStrokes(
  context: CanvasRenderingContext2D,
  strokes: StrokePoint[][],
  canvasSize: number,
  strokeWidth?: number,
): void {
  context.strokeStyle = INK_COLOR;
  context.fillStyle = INK_COLOR;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = strokeWidth ?? Math.max(2, canvasSize * STROKE_RATIO);
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      context.beginPath();
      context.arc(stroke[0].x, stroke[0].y, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
      continue;
    }
    context.beginPath();
    stroke.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
  }
}
