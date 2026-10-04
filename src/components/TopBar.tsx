import type { ReactNode } from 'react';
import { playTap } from '../lib/sfx';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function TopBar({ title, subtitle, onBack, right }: Props) {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
      {onBack ? (
        <button
          type="button"
          onClick={() => {
            playTap();
            onBack();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-bold text-ink shadow-md active:scale-95"
          aria-label="Kembali"
        >
          ←
        </button>
      ) : (
        <div className="w-11" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-ink/50">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}
