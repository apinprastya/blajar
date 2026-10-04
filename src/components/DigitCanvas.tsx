import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { paintStrokes, type StrokePoint } from '../lib/strokes';

export interface DigitCanvasHandle {
  clear: () => void;
  undo: () => void;
  hasInk: () => boolean;
  getCanvas: () => HTMLCanvasElement | null;
  getStrokes: () => StrokePoint[][];
}

interface Props {
  onInkChange?: (hasInk: boolean) => void;
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
  disabled?: boolean;
}

export const DigitCanvas = forwardRef<DigitCanvasHandle, Props>(function DigitCanvas(
  { onInkChange, onStrokeStart, onStrokeEnd, disabled = false },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<StrokePoint[][]>([]);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    paintStrokes(context, strokesRef.current, Math.min(canvas.width, canvas.height));
  }, []);

  const setInk = useCallback(
    (value: boolean) => {
      setHasInk(value);
      onInkChange?.(value);
    },
    [onInkChange],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const cssSize = Math.max(160, Math.min(rect.width, rect.height, 640));
      const density = Math.min(window.devicePixelRatio || 1, 2.5);
      const pixels = Math.max(240, Math.round(cssSize * density));
      if (canvas.width !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
        strokesRef.current = [];
        setInk(false);
        redraw();
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [redraw, setInk]);

  useImperativeHandle(
    ref,
    () => ({
      clear() {
        strokesRef.current = [];
        redraw();
        setInk(false);
      },
      undo() {
        strokesRef.current.pop();
        redraw();
        setInk(strokesRef.current.length > 0);
      },
      hasInk() {
        return strokesRef.current.length > 0;
      },
      getCanvas() {
        return canvasRef.current;
      },
      getStrokes() {
        return strokesRef.current;
      },
    }),
    [redraw, setInk],
  );

  const position = (event: ReactPointerEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    onStrokeStart?.();
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    strokesRef.current.push([position(event)]);
    redraw();
    if (!hasInk) setInk(true);
  };

  const handleMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    event.preventDefault();
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!stroke) return;
    stroke.push(position(event));
    redraw();
  };

  const handleUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onStrokeEnd?.();
  };

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none select-none"
      style={{ cursor: disabled ? 'default' : 'crosshair' }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={handleUp}
    />
  );
});
