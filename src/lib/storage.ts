import { useSyncExternalStore } from 'react';
import { setSfxEnabled } from './sfx';
import { setTtsEnabled, setTtsEngine } from './tts';
import type { SessionStats } from './types';

export interface Progress {
  xp: number;
  stars: Record<string, number>;
  streakCount: number;
  lastDay: string | null;
  totalCorrect: number;
  sound: boolean;
  tts: boolean;
  ttsEngine: 'instant' | 'ai';
}

const KEY = 'elajar.progress.v1';

const DEFAULT_PROGRESS: Progress = {
  xp: 0,
  stars: {},
  streakCount: 0,
  lastDay: null,
  totalCorrect: 0,
  sound: true,
  tts: true,
  ttsEngine: 'instant',
};

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    return { ...DEFAULT_PROGRESS, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

let state: Progress = load();
const listeners = new Set<() => void>();

setSfxEnabled(state.sound);
setTtsEnabled(state.tts);
setTtsEngine(state.ttsEngine);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProgress(): Progress {
  return state;
}

export function updateProgress(updater: (progress: Progress) => Progress) {
  state = updater(state);
  setSfxEnabled(state.sound);
  setTtsEnabled(state.tts);
  setTtsEngine(state.ttsEngine);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((listener) => listener());
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress);
}

function dayString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function touchStreak() {
  updateProgress((progress) => {
    const today = dayString(new Date());
    if (progress.lastDay === today) return progress;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const continues = progress.lastDay === dayString(yesterday);
    return {
      ...progress,
      streakCount: continues ? progress.streakCount + 1 : 1,
      lastDay: today,
    };
  });
}

export function computeStars(ratio: number): number {
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

export function finishSession(
  key: string,
  stats: SessionStats,
  options?: { minForStars?: number },
): { stars: number; xp: number } {
  const minForStars = options?.minForStars ?? 1;
  const stars = stats.total >= minForStars ? computeStars(stats.firstTry / stats.total) : 0;
  const xp = stats.firstTry * 10 + (stats.correct - stats.firstTry) * 4;
  completeSession(key, xp, stars);
  return { stars, xp };
}

export function completeSession(key: string, xp: number, stars: number) {
  updateProgress((progress) => ({
    ...progress,
    xp: progress.xp + xp,
    totalCorrect: progress.totalCorrect,
    stars: { ...progress.stars, [key]: Math.max(progress.stars[key] ?? 0, stars) },
  }));
  touchStreak();
}

export function toggleSound(): void {
  updateProgress((progress) => ({ ...progress, sound: !progress.sound }));
}

export function toggleTts(): void {
  updateProgress((progress) => ({ ...progress, tts: !progress.tts }));
}

export function setVoiceEngine(engine: 'instant' | 'ai'): void {
  updateProgress((progress) => ({ ...progress, ttsEngine: engine }));
}
