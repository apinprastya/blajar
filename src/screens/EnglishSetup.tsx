import { useState } from 'react';
import { StarRow } from '../components/StarRow';
import { TopBar } from '../components/TopBar';
import { ENGLISH_LEVELS, ENGLISH_MODES } from '../content/english';
import { playTap } from '../lib/sfx';
import { useProgress } from '../lib/storage';
import type { EnglishMode } from '../lib/types';
import { cx } from '../lib/utils';

interface Props {
  onStart: (mode: EnglishMode, level: number) => void;
  onBack: () => void;
}

export function EnglishSetupScreen({ onStart, onBack }: Props) {
  const progress = useProgress();
  const [mode, setMode] = useState<EnglishMode>('sentence');

  return (
    <div className="app-height flex flex-col">
      <TopBar title="Bahasa Inggris" subtitle="Pilih latihan dan level" onBack={onBack} />
      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-5 pb-10">
        <h2 className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wider text-ink/50">
          Pilih latihan
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {ENGLISH_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                playTap();
                setMode(item.id);
              }}
              className={cx(
                'rounded-3xl border-2 p-4 text-left shadow-md transition active:scale-95',
                mode === item.id ? 'border-mint-500 bg-mint-400/10' : 'border-transparent bg-white',
              )}
            >
              <div className="text-3xl">{item.emoji}</div>
              <div className="mt-2 font-bold">{item.name}</div>
              <div className="text-xs text-ink/50">{item.desc}</div>
            </button>
          ))}
        </div>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-ink/50">
          Pilih level
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {ENGLISH_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => {
                playTap();
                onStart(mode, level.id);
              }}
              className="flex items-center justify-between gap-3 rounded-3xl bg-white p-4 text-left shadow-md transition active:scale-[0.98]"
            >
              <div className="min-w-0">
                <div className="font-bold">
                  Level {level.id} <span className="text-mint-600">• {level.name}</span>
                </div>
                <div className="text-sm text-ink/50">{level.desc}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StarRow count={progress.stars[`english:${mode}:${level.id}`] ?? 0} size={18} />
                <span className="text-2xl">▶️</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
