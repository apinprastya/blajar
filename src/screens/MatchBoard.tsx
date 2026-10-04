import { useEffect, useRef, useState } from 'react';
import { Confetti } from '../components/Confetti';
import { TopBar } from '../components/TopBar';
import { getEnglishLevel } from '../content/english';
import { playCorrect, playPop, playTap, playWin, playWrong } from '../lib/sfx';
import { completeSession } from '../lib/storage';
import { preloadSpeech, speak } from '../lib/tts';
import type { SessionResult } from '../lib/types';
import { cx, shuffle } from '../lib/utils';

type CardState = 'down' | 'up' | 'matched';

interface CardDef {
  key: string;
  pairKey: string;
  kind: 'en' | 'id';
  label: string;
  emoji: string;
}

interface Props {
  level: number;
  onExit: () => void;
  onFinish: (result: SessionResult) => void;
}

export function MatchBoardScreen({ level, onExit, onFinish }: Props) {
  const pack = getEnglishLevel(level);
  const sessionKey = `english:match:${level}`;
  const usesSentences = level >= 3;
  const pairCount = usesSentences ? 4 : 6;

  const [deck] = useState<CardDef[]>(() => {
    if (usesSentences) {
      const items = shuffle(pack.sentences).slice(0, pairCount);
      return shuffle(
        items.flatMap((item, index) => [
          { key: `en-${index}`, pairKey: `p${index}`, kind: 'en' as const, label: item.en, emoji: '🔤' },
          { key: `id-${index}`, pairKey: `p${index}`, kind: 'id' as const, label: item.id, emoji: '🇮🇩' },
        ]),
      );
    }
    const items = shuffle(pack.vocab).slice(0, pairCount);
    return shuffle(
      items.flatMap((item, index) => [
        { key: `en-${index}`, pairKey: `p${index}`, kind: 'en' as const, label: item.en, emoji: '🔤' },
        { key: `id-${index}`, pairKey: `p${index}`, kind: 'id' as const, label: item.id, emoji: item.emoji },
      ]),
    );
  });

  const [status, setStatus] = useState<Record<string, CardState>>(() =>
    Object.fromEntries(deck.map((card) => [card.key, 'down'])),
  );
  const [flipped, setFlipped] = useState<string[]>([]);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const lockRef = useRef(false);
  const triesRef = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    deck.filter((card) => card.kind === 'en').forEach((card) => preloadSpeech(card.label));
  }, [deck]);

  const finishMatch = () => {
    const usedTries = triesRef.current;
    const stars = usedTries <= pairCount + 2 ? 3 : usedTries <= pairCount * 2 ? 2 : 1;
    const xp = stars === 3 ? 45 : stars === 2 ? 30 : 18;
    const stats = { correct: pairCount, firstTry: pairCount, total: pairCount };
    completeSession(sessionKey, xp, stars);
    setDone(true);
    playWin();
    setShowConfetti(true);
    timers.current.push(
      window.setTimeout(() => {
        onFinish({ stars, xp, stats });
      }, 1500),
    );
  };

  const handleFlip = (card: CardDef) => {
    if (done || lockRef.current || status[card.key] !== 'down') return;
    playTap();
    if (card.kind === 'en') speak(card.label);
    const nextFlipped = [...flipped, card.key];
    setStatus((current) => ({ ...current, [card.key]: 'up' }));
    setFlipped(nextFlipped);
    if (nextFlipped.length < 2) return;

    const first = deck.find((item) => item.key === nextFlipped[0]);
    const second = deck.find((item) => item.key === nextFlipped[1]);
    if (!first || !second) return;

    const usedTries = triesRef.current + 1;
    triesRef.current = usedTries;
    setTries(usedTries);

    const matchedBefore = Object.values(status).filter((value) => value === 'matched').length;
    if (first.pairKey === second.pairKey) {
      lockRef.current = true;
      timers.current.push(
        window.setTimeout(() => {
          playPop();
          setStatus((current) => ({
            ...current,
            [first.key]: 'matched',
            [second.key]: 'matched',
          }));
          setFlipped([]);
          lockRef.current = false;
          if (matchedBefore + 2 === pairCount * 2) {
            playCorrect();
            timers.current.push(window.setTimeout(finishMatch, 520));
          }
        }, 400),
      );
    } else {
      lockRef.current = true;
      playWrong();
      timers.current.push(
        window.setTimeout(() => {
          setStatus((current) => ({
            ...current,
            [first.key]: 'down',
            [second.key]: 'down',
          }));
          setFlipped([]);
          lockRef.current = false;
        }, 850),
      );
    }
  };

  return (
    <div className="app-height flex flex-col">
      {showConfetti ? <Confetti /> : null}
      <TopBar
        title={`${usesSentences ? 'Jodoh Kalimat' : 'Jodoh Kartu'} • Level ${level}`}
        subtitle={
          usesSentences
            ? 'Cocokkan kalimat Inggris dengan artinya'
            : 'Cocokkan kata Inggris dengan artinya'
        }
        onBack={onExit}
        right={
          <div className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-md">
            🔄 {tries}
          </div>
        }
      />

      <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-3 pb-8 md:px-4">
        <div
          className={cx(
            'grid gap-2.5 md:gap-4',
            usesSentences ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3 md:grid-cols-4',
          )}
        >
          {deck.map((card) => {
            const state = status[card.key];
            const isUp = state === 'up' || state === 'matched';
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => handleFlip(card)}
                className={cx(
                  'relative [perspective:700px]',
                  usesSentences ? 'min-h-[7rem]' : 'aspect-[3/4]',
                )}
                aria-label={isUp ? card.label : 'Kartu tertutup'}
              >
                <div
                  className={cx(
                    'relative h-full w-full transition-transform duration-300 [transform-style:preserve-3d]',
                    isUp && '[transform:rotateY(180deg)]',
                  )}
                >
                  <div
                    className={cx(
                      'absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-sky-500 text-3xl font-bold text-white shadow-md [backface-visibility:hidden]',
                      state === 'down' && 'hover:brightness-110',
                    )}
                  >
                    ?
                  </div>
                  <div
                    className={cx(
                      'absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl p-2 text-center shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]',
                      state === 'matched'
                        ? 'bg-mint-400/20 ring-2 ring-mint-500'
                        : 'bg-white ring-1 ring-ink/10',
                    )}
                  >
                    <span className={usesSentences ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'}>
                      {card.emoji}
                    </span>
                    <span
                      className={cx(
                        'font-bold leading-snug',
                        usesSentences ? 'text-xs md:text-sm' : 'text-sm md:text-base',
                      )}
                    >
                      {card.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {done ? (
          <div className="mt-6 text-center">
            <p className="animate-bounce-in text-2xl font-bold text-mint-600">
              Semua cocok! 🎉
            </p>
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-ink/40">
            Ketuk dua kartu untuk mencocokkan. Kartu Inggris akan dibacakan 🔊
          </p>
        )}
      </main>
    </div>
  );
}
