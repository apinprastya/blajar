import { useEffect } from 'react';
import { Confetti } from '../components/Confetti';
import { StarRow } from '../components/StarRow';
import { playTap, playWin } from '../lib/sfx';
import type { SessionResult } from '../lib/types';

interface Props {
  title: string;
  result: SessionResult;
  onRepeat: () => void;
  onSetup: () => void;
  onHome: () => void;
}

export function ResultsScreen({ title, result, onRepeat, onSetup, onHome }: Props) {
  const { stars, xp, stats } = result;
  const message =
    stars === 3
      ? 'Luar biasa!'
      : stars === 2
        ? 'Hebat sekali!'
        : stars === 1
          ? 'Bagus, terus berlatih!'
          : 'Tetap semangat, ya!';
  const emoji = stars === 3 ? '🏆' : stars === 2 ? '🌟' : stars === 1 ? '👍' : '💪';

  useEffect(() => {
    if (stars >= 2) playWin();
  }, [stars]);

  return (
    <div className="app-height relative flex flex-col overflow-hidden">
      {stars >= 2 ? <Confetti /> : null}
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-brand-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-sun-300/50 blur-3xl" />

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink/40">{title}</p>
        <div className="animate-bounce-in text-7xl">{emoji}</div>
        <h1 className="text-3xl font-bold">{message}</h1>
        <StarRow count={stars} size={56} animate />
        {stars === 0 && stats.total < 10 ? (
          <p className="text-sm font-medium text-ink/50">
            Jawab minimal 10 soal untuk meraih bintang ⭐
          </p>
        ) : null}
        <div className="mt-1 flex items-center gap-3">
          <span className="rounded-full bg-white px-4 py-2 text-lg font-bold shadow-md">
            ⭐ +{xp} XP
          </span>
          <span className="rounded-full bg-white px-4 py-2 text-lg font-bold shadow-md">
            ✅ {stats.correct}/{stats.total}
          </span>
        </div>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-3 px-6 pb-8">
        <button
          type="button"
          onClick={() => {
            playTap();
            onRepeat();
          }}
          className="h-14 rounded-2xl bg-gradient-to-r from-brand-500 to-sky-500 text-lg font-bold text-white shadow-lg transition active:scale-95"
        >
          🔁 Ulangi
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              playTap();
              onSetup();
            }}
            className="h-14 flex-1 rounded-2xl bg-white text-lg font-bold text-ink/70 shadow-md transition active:scale-95"
          >
            Ganti Level
          </button>
          <button
            type="button"
            onClick={() => {
              playTap();
              onHome();
            }}
            className="h-14 flex-1 rounded-2xl bg-white text-lg font-bold text-ink/70 shadow-md transition active:scale-95"
          >
            🏠 Beranda
          </button>
        </div>
      </footer>
    </div>
  );
}
