import { useEffect, useState } from 'react';
import { StarIcon } from '../components/StarRow';
import { preloadModel } from '../lib/handwriting';
import { playTap } from '../lib/sfx';
import { toggleSound, toggleTts, useProgress } from '../lib/storage';
import { cx } from '../lib/utils';

interface Props {
  onMath: () => void;
  onEnglish: () => void;
}

function SubjectCard({
  title,
  desc,
  emoji,
  gradient,
  onClick,
}: {
  title: string;
  desc: string;
  emoji: string;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        playTap();
        onClick();
      }}
      className={cx(
        'relative overflow-hidden rounded-[2rem] p-6 text-left text-white shadow-xl transition active:scale-[0.97]',
        gradient,
      )}
    >
      <span className="pointer-events-none absolute -right-4 -top-6 text-8xl opacity-20">{emoji}</span>
      <div className="text-5xl drop-shadow">{emoji}</div>
      <h2 className="mt-3 text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-white/85">{desc}</p>
    </button>
  );
}

export function HomeScreen({ onMath, onEnglish }: Props) {
  const progress = useProgress();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const supportsFullscreen =
    typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen);

  useEffect(() => {
    preloadModel();
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    playTap();
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => {
        /* not supported */
      });
    }
  };

  const iconButton =
    'flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-md transition active:scale-95';

  return (
    <div className="app-height relative flex flex-col overflow-hidden">
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-brand-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-mint-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-sun-300/50 blur-3xl" />

      <header className="relative z-10 px-6 pt-10 text-center">
        <div className="animate-wiggle text-6xl">🦉</div>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-brand-700">Blajar</h1>
        <p className="mt-1 text-ink/60">Belajar dengan seru setiap hari!</p>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-2xl flex-1 content-center gap-4 px-5 py-6 md:grid-cols-2">
        <SubjectCard
          title="Matematika"
          desc="Tambah, kurang, kali, dan bagi"
          emoji="🔢"
          gradient="bg-gradient-to-br from-brand-400 to-sky-500"
          onClick={onMath}
        />
        <SubjectCard
          title="Bahasa Inggris"
          desc="Susun kalimat, jodoh kartu, dengar kata"
          emoji="🅰️"
          gradient="bg-gradient-to-br from-mint-400 to-sky-500"
          onClick={onEnglish}
        />
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 px-5 pb-6">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold shadow-md">
            🔥 {progress.streakCount}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold shadow-md">
            <StarIcon filled style={{ width: 16, height: 16 }} /> {progress.xp} XP
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cx(iconButton, !progress.sound && 'opacity-50 grayscale')}
            onClick={toggleSound}
            aria-label={progress.sound ? 'Matikan suara' : 'Nyalakan suara'}
          >
            {progress.sound ? '🔊' : '🔇'}
          </button>
          <button
            type="button"
            className={cx(iconButton, !progress.tts && 'opacity-50 grayscale')}
            onClick={toggleTts}
            aria-label={progress.tts ? 'Matikan pengucapan' : 'Nyalakan pengucapan'}
          >
            🗣️
          </button>
          {supportsFullscreen ? (
            <button
              type="button"
              className={iconButton}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
            >
              {isFullscreen ? '🗗' : '⛶'}
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
