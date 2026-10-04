import { useCallback, useEffect, useRef, useState } from 'react';
import { Confetti } from '../components/Confetti';
import { SpeakerButton } from '../components/SpeakerButton';
import { TopBar } from '../components/TopBar';
import { getEnglishLevel } from '../content/english';
import { playCorrect, playTap, playWrong } from '../lib/sfx';
import { finishSession } from '../lib/storage';
import { preloadSpeech, speak, stopSpeaking } from '../lib/tts';
import type { SessionResult, SessionStats } from '../lib/types';
import { cx, shuffle } from '../lib/utils';

const MIN_FOR_STARS = 10;

interface ListenItem {
  en: string;
  id: string;
  emoji?: string;
}

interface Question {
  target: ListenItem;
  options: ListenItem[];
}

interface Props {
  level: number;
  onExit: () => void;
  onFinish: (result: SessionResult) => void;
}

export function ListenChooseScreen({ level, onExit, onFinish }: Props) {
  const pack = getEnglishLevel(level);
  const sessionKey = `english:listen:${level}`;
  const usesSentences = level >= 3;
  const queueRef = useRef<ListenItem[]>([]);
  const lastRef = useRef('');

  const itemPool = useCallback((): ListenItem[] => {
    return usesSentences
      ? pack.sentences.map((item) => ({ en: item.en, id: item.id }))
      : pack.vocab.map((item) => ({ en: item.en, id: item.id, emoji: item.emoji }));
  }, [usesSentences, pack]);

  const makeQuestion = useCallback((): Question => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffle(itemPool());
      if (queueRef.current.length > 1 && queueRef.current[0].en === lastRef.current) {
        const first = queueRef.current.shift() as ListenItem;
        queueRef.current.push(first);
      }
    }
    const target = queueRef.current.shift() as ListenItem;
    lastRef.current = target.en;
    const others = shuffle(itemPool().filter((item) => item.en !== target.en)).slice(0, 3);
    return { target, options: shuffle([target, ...others]) };
  }, [itemPool]);

  const [question, setQuestion] = useState<Question>(() => makeQuestion());
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const missedRef = useRef(false);
  const statsRef = useRef<SessionStats>({ correct: 0, firstTry: 0, total: 0 });
  const timers = useRef<number[]>([]);

  const delay = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const list = timers.current;
    return () => {
      list.forEach((timer) => window.clearTimeout(timer));
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    missedRef.current = false;
    setPicked(null);
    preloadSpeech(question.target.en);
    const timer = window.setTimeout(() => speak(question.target.en), 400);
    return () => window.clearTimeout(timer);
  }, [question]);

  const goNext = useCallback(() => {
    setQIndex((index) => index + 1);
    setQuestion(makeQuestion());
  }, [makeQuestion]);

  const finish = useCallback(() => {
    const stats = statsRef.current;
    if (stats.total === 0) return;
    const { stars, xp } = finishSession(sessionKey, stats, { minForStars: MIN_FOR_STARS });
    onFinish({ stars, xp, stats });
  }, [onFinish, sessionKey]);

  const handlePick = (option: ListenItem) => {
    if (picked) return;
    setPicked(option.en);
    const correct = option.en === question.target.en;
    if (correct) {
      playCorrect();
      setShowConfetti(true);
      statsRef.current = {
        ...statsRef.current,
        correct: statsRef.current.correct + 1,
        firstTry: statsRef.current.firstTry + (missedRef.current ? 0 : 1),
        total: statsRef.current.total + 1,
      };
      setScore(statsRef.current.correct);
      setAnswered(statsRef.current.total);
      speak(question.target.en);
      delay(() => {
        setShowConfetti(false);
        goNext();
      }, 1500);
    } else {
      missedRef.current = true;
      playWrong();
      statsRef.current = { ...statsRef.current, total: statsRef.current.total + 1 };
      setAnswered(statsRef.current.total);
      speak(question.target.en);
      delay(() => goNext(), 2300);
    }
  };

  return (
    <div className="app-height flex flex-col">
      {showConfetti ? <Confetti /> : null}
      <TopBar
        title={`Dengar & Pilih • Level ${level}`}
        subtitle={`Soal ke-${qIndex + 1} • ✅ ${score}/${answered}`}
        onBack={onExit}
        right={
          <button
            type="button"
            onClick={finish}
            disabled={answered === 0}
            className="rounded-full bg-gradient-to-r from-mint-500 to-sky-500 px-3.5 py-2 text-sm font-bold text-white shadow-md transition active:scale-95 disabled:opacity-40"
          >
            Selesai
          </button>
        }
      />

      <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-5 pb-8">
        <section className="mt-4 flex flex-col items-center gap-3 rounded-3xl bg-white p-6 shadow-lg">
          <p className="text-sm font-semibold text-ink/50">
            {usesSentences
              ? 'Dengarkan kalimatnya, lalu pilih artinya!'
              : 'Dengarkan kata, lalu pilih artinya!'}
          </p>
          <SpeakerButton text={question.target.en} />
          {picked ? (
            <p className="animate-bounce-in max-w-md text-center text-lg font-bold leading-snug text-brand-700 md:text-xl">
              {question.target.en}
              <span className="mx-1 text-ink/40">=</span>
              {question.target.id}
            </p>
          ) : (
            <p className="text-sm text-ink/35">Ketuk pengeras suara untuk mengulang 🔁</p>
          )}
        </section>

        <div className={cx('mt-4 grid gap-3', usesSentences ? 'grid-cols-1' : 'grid-cols-2')}>
          {question.options.map((option) => {
            const isTarget = option.en === question.target.en;
            const isPicked = picked === option.en;
            return (
              <button
                key={option.en}
                type="button"
                disabled={Boolean(picked)}
                onClick={() => {
                  playTap();
                  handlePick(option);
                }}
                className={cx(
                  'flex items-center gap-3 rounded-3xl p-4 text-left shadow-md transition active:scale-95 disabled:cursor-default',
                  usesSentences ? 'justify-start' : 'flex-col justify-center text-center',
                  picked && isTarget
                    ? 'bg-mint-400/20 ring-2 ring-mint-500'
                    : isPicked
                      ? 'bg-coral-400/20 ring-2 ring-coral-500'
                      : 'bg-white ring-1 ring-ink/10',
                  picked && !isTarget && !isPicked && 'opacity-50',
                )}
              >
                {option.emoji ? (
                  <span className="shrink-0 text-4xl">{option.emoji}</span>
                ) : (
                  <span className="shrink-0 text-2xl">🇮🇩</span>
                )}
                <span
                  className={cx(
                    'font-bold leading-snug',
                    usesSentences ? 'text-base md:text-lg' : 'text-lg',
                  )}
                >
                  {option.id}
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
