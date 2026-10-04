import { useState } from 'react';
import { StarRow } from '../components/StarRow';
import { TopBar } from '../components/TopBar';
import { LEVEL_DESC, LEVEL_NAMES, MATH_LEVELS, MATH_OPS } from '../lib/math';
import { playTap } from '../lib/sfx';
import { useProgress } from '../lib/storage';
import type { MathOp } from '../lib/types';
import { cx } from '../lib/utils';

interface Props {
  onStart: (op: MathOp, level: number) => void;
  onBack: () => void;
}

export function MathSetupScreen({ onStart, onBack }: Props) {
  const progress = useProgress();
  const [op, setOp] = useState<MathOp>('add');

  return (
    <div className="app-height flex flex-col">
      <TopBar title="Matematika" subtitle="Pilih operasi dan level" onBack={onBack} />
      <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-5 pb-10">
        <h2 className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wider text-ink/50">
          Pilih operasi
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {MATH_OPS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                playTap();
                setOp(item.id);
              }}
              className={cx(
                'rounded-3xl border-2 p-4 text-center shadow-md transition active:scale-95',
                op === item.id ? 'border-brand-400 bg-brand-50' : 'border-transparent bg-white',
              )}
            >
              <div
                className={cx(
                  'text-3xl font-bold',
                  op === item.id ? 'text-brand-600' : 'text-ink/70',
                )}
              >
                {item.symbol}
              </div>
              <div className="mt-1 text-sm font-semibold">{item.name}</div>
              <div className="text-xs text-ink/40">{item.hint}</div>
            </button>
          ))}
        </div>

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-ink/50">
          Pilih level
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {MATH_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                playTap();
                onStart(op, level);
              }}
              className="flex items-center justify-between gap-3 rounded-3xl bg-white p-4 text-left shadow-md transition active:scale-[0.98]"
            >
              <div className="min-w-0">
                <div className="font-bold">
                  Level {level} <span className="text-brand-600">• {LEVEL_NAMES[level - 1]}</span>
                </div>
                <div className="text-sm text-ink/50">{LEVEL_DESC[op][level - 1]}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StarRow count={progress.stars[`math:${op}:${level}`] ?? 0} size={18} />
                <span className="text-2xl">▶️</span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
