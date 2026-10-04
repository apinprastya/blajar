import type { KokoroTTS } from 'kokoro-js';

export type KokoroStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface KokoroState {
  status: KokoroStatus;
  progress: number;
}

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE = 'af_heart';

let state: KokoroState = { status: 'idle', progress: 0 };
let engine: KokoroTTS | null = null;
let enginePromise: Promise<KokoroTTS> | null = null;
const listeners = new Set<() => void>();
const blobCache = new Map<string, Blob>();
const pending = new Map<string, Promise<Blob>>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeKokoro(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getKokoroState(): KokoroState {
  return state;
}

export function getKokoroBlob(text: string): Blob | null {
  return blobCache.get(text) ?? null;
}

export function preloadKokoro(): Promise<void> {
  if (!enginePromise) {
    state = { status: 'loading', progress: 0 };
    emit();
    enginePromise = (async () => {
      const { KokoroTTS: Engine, env } = await import('kokoro-js');
      env.wasmPaths = `${import.meta.env?.BASE_URL ?? '/'}ort/`;
      return Engine.from_pretrained(MODEL_ID, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (info: unknown) => {
          const update = info as { status?: string; file?: string; progress?: number };
          if (
            update.status === 'progress' &&
            typeof update.progress === 'number' &&
            update.file?.endsWith('.onnx')
          ) {
            state = { status: 'loading', progress: Math.round(update.progress) };
            emit();
          }
        },
      });
    })()
      .then((tts) => {
        engine = tts;
        state = { status: 'ready', progress: 100 };
        emit();
        return tts;
      })
      .catch((error) => {
        enginePromise = null;
        state = { status: 'error', progress: 0 };
        emit();
        throw error;
      });
  }
  return enginePromise.then(() => undefined);
}

export async function synthKokoro(text: string): Promise<Blob> {
  const cached = blobCache.get(text);
  if (cached) return cached;
  const inflight = pending.get(text);
  if (inflight) return inflight;
  const promise = (async () => {
    await preloadKokoro();
    if (!engine) throw new Error('Mesin suara AI belum siap');
    const audio = await engine.generate(text, { voice: VOICE });
    const blob = audio.toBlob();
    if (blobCache.size > 80) {
      const oldest = blobCache.keys().next().value;
      if (oldest !== undefined) blobCache.delete(oldest);
    }
    blobCache.set(text, blob);
    return blob;
  })().finally(() => {
    pending.delete(text);
  });
  pending.set(text, promise);
  return promise;
}
