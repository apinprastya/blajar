import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Confetti } from '../components/Confetti';
import { TopBar } from '../components/TopBar';
import { DISTRACTOR_WORDS, getEnglishLevel, type SentenceItem } from '../content/english';
import { playCorrect, playPop, playTap, playWrong } from '../lib/sfx';
import { finishSession } from '../lib/storage';
import { preloadSpeech, speak } from '../lib/tts';
import type { SessionResult, SessionStats } from '../lib/types';
import { cx, shuffle } from '../lib/utils';

const MIN_FOR_STARS = 10;

interface Token {
  id: number;
  word: string;
}

interface Props {
  level: number;
  onExit: () => void;
  onFinish: (result: SessionResult) => void;
}

export function SentenceBuilderScreen({ level, onExit, onFinish }: Props) {
  const pack = getEnglishLevel(level);
  const sessionKey = `english:sentence:${level}`;
  const queueRef = useRef<SentenceItem[]>([]);
  const lastRef = useRef('');

  const pickSentence = useCallback((): SentenceItem => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffle(pack.sentences);
      if (queueRef.current.length > 1 && queueRef.current[0].en === lastRef.current) {
        const first = queueRef.current.shift() as SentenceItem;
        queueRef.current.push(first);
      }
    }
    const next = queueRef.current.shift() as SentenceItem;
    lastRef.current = next.en;
    return next;
  }, [pack.sentences]);

  const [sentence, setSentence] = useState<SentenceItem>(() => pickSentence());
  const [qIndex, setQIndex] = useState(0);
  const targetWords = useMemo(() => sentence.en.split(' '), [sentence]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [answer, setAnswer] = useState<number[]>([]);
  const [phase, setPhase] = useState<'answering' | 'correct' | 'reveal'>('answering');
  const [tries, setTries] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const statsRef = useRef<SessionStats>({ correct: 0, firstTry: 0, total: 0 });
  const timers = useRef<number[]>([]);

  const delay = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    preloadSpeech(sentence.en);
    const pool = DISTRACTOR_WORDS.filter(
      (word) => !targetWords.some((target) => target.toLowerCase() === word),
    );
    const extras = shuffle(pool).slice(0, level <= 2 ? 2 : 3);
    setTokens(shuffle([...targetWords, ...extras]).map((word, id) => ({ id, word })));
    setAnswer([]);
    setPhase('answering');
    setTries(0);
    setMessage(null);
  }, [sentence, targetWords, level]);

  const tokenById = useCallback((id: number) => tokens.find((token) => token.id === id), [tokens]);

  const goNext = useCallback(() => {
    setQIndex((index) => index + 1);
    setSentence(pickSentence());
  }, [pickSentence]);

  const finish = useCallback(() => {
    const stats = statsRef.current;
    if (stats.total === 0) return;
    const { stars, xp } = finishSession(sessionKey, stats, { minForStars: MIN_FOR_STARS });
    onFinish({ stars, xp, stats });
  }, [onFinish, sessionKey]);

  const check = useCallback(() => {
    const attempt = answer
      .map((id) => tokenById(id)?.word ?? '')
      .join(' ')
      .trim();
    if (attempt.toLowerCase() === sentence.en.toLowerCase()) {
      playCorrect();
      speak(sentence.en);
      setShowConfetti(true);
      statsRef.current = {
        ...statsRef.current,
        correct: statsRef.current.correct + 1,
        firstTry: statsRef.current.firstTry + (tries === 0 ? 1 : 0),
        total: statsRef.current.total + 1,
      };
      setScore(statsRef.current.correct);
      setAnswered(statsRef.current.total);
      setPhase('correct');
      delay(() => {
        setShowConfetti(false);
        goNext();
      }, 1700);
    } else if (tries === 0) {
      playWrong();
      setTries(1);
      setMessage('Belum tepat, coba susun lagi ya! 💪');
      delay(() => setMessage(null), 1600);
    } else {
      playWrong();
      statsRef.current = { ...statsRef.current, total: statsRef.current.total + 1 };
      setAnswered(statsRef.current.total);
      setPhase('reveal');
      setMessage(`Jawaban: ${sentence.en}`);
      speak(sentence.en);
      delay(() => goNext(), 2600);
    }
  }, [answer, tokenById, sentence.en, tries, delay, goNext]);

  const answerTokens = answer
    .map((id) => tokenById(id))
    .filter((token): token is Token => Boolean(token));
  const bankTokens = tokens.filter((token) => !answer.includes(token.id));
  const locked = phase !== 'answering';

  return (
    <div className="app-height flex flex-col">
      {showConfetti ? <Confetti /> : null}
      <TopBar
        title={`Susun Kalimat • Level ${level}`}
        subtitle={`Kalimat ke-${qIndex + 1} • ✅ ${score}/${answered}`}
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
        <section
          className={cx(
            'mt-4 rounded-3xl bg-white p-5 shadow-lg',
            phase === 'reveal' && 'animate-shake',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">
            🇮🇩 Bahasa Indonesia
          </p>
          <p className="mt-1 text-2xl font-bold leading-snug md:text-3xl">{sentence.id}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink/40">
            Susun dalam bahasa Inggris
          </p>

          <div
            className={cx(
              'mt-2 flex min-h-[4.5rem] flex-wrap content-start items-start gap-2 rounded-2xl border-2 border-dashed p-3',
              phase === 'correct'
                ? 'border-mint-500 bg-mint-400/10'
                : phase === 'reveal'
                  ? 'border-coral-400 bg-coral-400/10'
                  : 'border-ink/15 bg-cream/60',
            )}
          >
            {answerTokens.length === 0 ? (
              <span className="p-2 text-sm text-ink/35">Ketuk kata di bawah…</span>
            ) : (
              answerTokens.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => {
                    if (locked) return;
                    playTap();
                    setAnswer((current) => current.filter((id) => id !== token.id));
                  }}
                  className={cx(
                    'animate-pop rounded-2xl px-4 py-2.5 text-lg font-bold shadow-md transition active:scale-95',
                    phase === 'correct'
                      ? 'bg-mint-500 text-white'
                      : 'bg-brand-500 text-white',
                  )}
                >
                  {token.word}
                </button>
              ))
            )}
          </div>

          <p
            className={cx(
              'mt-3 min-h-5 text-sm font-semibold',
              phase === 'correct'
                ? 'text-mint-600'
                : phase === 'reveal'
                  ? 'text-coral-500'
                  : 'text-ink/50',
            )}
          >
            {phase === 'correct' ? 'Perfect! 🎉' : message ?? '\u00A0'}
          </p>

          <div className="mt-1 flex flex-wrap gap-2">
            {bankTokens.map((token) => (
              <button
                key={token.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  playPop();
                  setAnswer((current) => [...current, token.id]);
                }}
                className="rounded-2xl bg-white px-4 py-2.5 text-lg font-bold text-ink shadow-md ring-1 ring-ink/10 transition active:scale-95 disabled:opacity-50"
              >
                {token.word}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            disabled={locked || answer.length === 0}
            onClick={() => {
              playTap();
              setAnswer([]);
            }}
            className="h-14 flex-1 rounded-2xl bg-white text-lg font-bold text-ink/70 shadow-md transition active:scale-95 disabled:opacity-40"
          >
            ↺ Ulangi
          </button>
          <button
            type="button"
            disabled={locked || answer.length === 0}
            onClick={() => {
              playTap();
              check();
            }}
            className="h-14 flex-[2] rounded-2xl bg-gradient-to-r from-mint-500 to-sky-500 text-lg font-bold text-white shadow-md transition active:scale-95 disabled:opacity-40"
          >
            Periksa ✓
          </button>
        </div>
      </main>
    </div>
  );
}
