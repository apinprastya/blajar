import { useCallback, useEffect, useRef, useState } from 'react';
import { Confetti } from '../components/Confetti';
import { DigitCanvas, type DigitCanvasHandle } from '../components/DigitCanvas';
import { Keypad } from '../components/Keypad';
import { TopBar } from '../components/TopBar';
import { recognizeStrokes } from '../lib/handwriting';
import { LEVEL_NAMES, generateQuestion, optionCount, type MathQuestion } from '../lib/math';
import { playCorrect, playPop, playTap, playWrong } from '../lib/sfx';
import { finishSession } from '../lib/storage';
import type { MathOp, SessionResult, SessionStats } from '../lib/types';
import { cx } from '../lib/utils';

const AUTO_READ_DELAY = 400;
const MIN_FOR_STARS = 10;

type Phase = 'answering' | 'checking' | 'correct' | 'retry' | 'reveal';

interface Props {
  op: MathOp;
  level: number;
  onExit: () => void;
  onFinish: (result: SessionResult) => void;
}

export function MathQuizScreen({ op, level, onExit, onFinish }: Props) {
  const sessionKey = `math:${op}:${level}`;
  const [qIndex, setQIndex] = useState(0);
  const [question, setQuestion] = useState<MathQuestion>(() => generateQuestion(op, level));
  const [slots, setSlots] = useState<string[]>([]);
  const [mode, setMode] = useState<'write' | 'type'>('write');
  const [phase, setPhase] = useState<Phase>('answering');
  const [message, setMessage] = useState<string | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const statsRef = useRef<SessionStats>({ correct: 0, firstTry: 0, total: 0 });
  const canvasRef = useRef<DigitCanvasHandle>(null);
  const autoTimerRef = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  const digits = optionCount(question.answer);

  const delay = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const cancelAutoRead = useCallback(() => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const list = timers.current;
    return () => {
      list.forEach((timer) => window.clearTimeout(timer));
      if (autoTimerRef.current !== null) window.clearTimeout(autoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'answering') cancelAutoRead();
  }, [phase, cancelAutoRead]);

  const goNext = useCallback(() => {
    setQIndex((index) => index + 1);
    setQuestion(generateQuestion(op, level));
    setSlots([]);
    setPhase('answering');
    setMessage(null);
    setAttempt(0);
    canvasRef.current?.clear();
  }, [op, level]);

  const check = useCallback(
    (answerSlots: string[]) => {
      setPhase('checking');
      const value = Number(answerSlots.join(''));
      if (value === question.answer) {
        playCorrect();
        setShowConfetti(true);
        statsRef.current = {
          ...statsRef.current,
          correct: statsRef.current.correct + 1,
          firstTry: statsRef.current.firstTry + (attempt === 0 ? 1 : 0),
          total: statsRef.current.total + 1,
        };
        setCorrectCount(statsRef.current.correct);
        setAnswered(statsRef.current.total);
        setPhase('correct');
        delay(() => {
          setShowConfetti(false);
          goNext();
        }, 1500);
      } else if (attempt === 0) {
        playWrong();
        setAttempt(1);
        setPhase('retry');
        setMessage('Belum tepat, coba lagi ya! 💪');
        delay(() => {
          setSlots([]);
          setMessage(null);
          setPhase('answering');
          canvasRef.current?.clear();
        }, 1300);
      } else {
        playWrong();
        statsRef.current = { ...statsRef.current, total: statsRef.current.total + 1 };
        setAnswered(statsRef.current.total);
        setPhase('reveal');
        setMessage(`Jawaban yang benar: ${question.answer}`);
        delay(() => goNext(), 2400);
      }
    },
    [attempt, delay, goNext, question.answer],
  );

  const finish = useCallback(() => {
    const stats = statsRef.current;
    if (stats.total === 0) return;
    cancelAutoRead();
    const { stars, xp } = finishSession(sessionKey, stats, { minForStars: MIN_FOR_STARS });
    onFinish({ stars, xp, stats });
  }, [cancelAutoRead, onFinish, sessionKey]);

  const handleAutoRead = useCallback(async () => {
    autoTimerRef.current = null;
    if (phase !== 'answering' || busy) return;
    const api = canvasRef.current;
    const canvas = api?.getCanvas();
    if (!api || !canvas) return;
    const strokes = api.getStrokes();
    if (strokes.length === 0) return;

    setBusy(true);
    try {
      const results = await recognizeStrokes(canvas, strokes);
      if (!results || results.length === 0) return;
      const unsure = results.some((result) => result.confidence < 0.4 || result.margin < 0.06);
      if (unsure) {
        playWrong();
        setShake(true);
        setMessage('Belum jelas, tulis ulang ya! ✏️');
        api.clear();
        delay(() => setShake(false), 500);
        delay(() => setMessage(null), 2000);
        return;
      }
      playPop();
      setMessage(null);
      api.clear();
      const remaining = digits - slots.length;
      const next = [...slots, ...results.slice(0, Math.max(0, remaining)).map((r) => String(r.digit))];
      setSlots(next);
      if (next.length === digits) delay(() => check(next), 350);
    } catch {
      setMessage('Model angka belum siap. Pakai tombol Ketik dulu ya! ⌨️');
      delay(() => setMessage(null), 2200);
    } finally {
      setBusy(false);
    }
  }, [phase, busy, digits, slots, check, delay]);

  const scheduleAutoRead = useCallback(() => {
    cancelAutoRead();
    autoTimerRef.current = window.setTimeout(() => {
      void handleAutoRead();
    }, AUTO_READ_DELAY);
  }, [cancelAutoRead, handleAutoRead]);

  const pressKey = useCallback(
    (digit: string) => {
      if (phase !== 'answering' || slots.length >= digits) return;
      playTap();
      const next = [...slots, digit];
      setSlots(next);
      if (next.length === digits) delay(() => check(next), 320);
    },
    [phase, slots, digits, check, delay],
  );

  const backspace = useCallback(() => {
    if (phase !== 'answering') return;
    playTap();
    setSlots((current) => current.slice(0, -1));
  }, [phase]);

  const removeFromSlot = useCallback(
    (index: number) => {
      if (phase !== 'answering' || busy) return;
      playTap();
      setSlots((current) => current.slice(0, index));
    },
    [phase, busy],
  );

  const switchMode = useCallback(() => {
    playTap();
    cancelAutoRead();
    setMode((current) => (current === 'write' ? 'type' : 'write'));
    setMessage(null);
  }, [cancelAutoRead]);

  const inputLocked = phase !== 'answering' && phase !== 'checking';
  const overlayEmoji =
    phase === 'correct' ? '✅' : phase === 'retry' ? '🤔' : phase === 'reveal' ? '❌' : null;
  const defaultHint =
    mode === 'write'
      ? slots.length > 0
        ? 'Ketuk kotak angka untuk menghapus'
        : 'Tulis jawabannya — nanti terbaca sendiri ✨'
      : 'Ketuk angka di papan ⌨️';

  return (
    <div className="app-height flex flex-col">
      {showConfetti ? <Confetti /> : null}
      <TopBar
        title={`Level ${level} • ${LEVEL_NAMES[level - 1]}`}
        subtitle={`Soal ke-${qIndex + 1} • ✅ ${correctCount}/${answered}`}
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

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-3 overflow-y-auto px-3 pb-6 md:px-4">
        <div className="grid flex-1 gap-4 md:grid-cols-[1fr_1.25fr] md:items-center">
          <section
            className={cx(
              'flex flex-col items-center justify-center rounded-3xl bg-white p-4 shadow-lg',
              phase === 'retry' && 'animate-shake',
            )}
          >
            <div className="text-center text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              {question.text}
            </div>
            <p
              className={cx(
                'mt-3 min-h-5 text-center text-sm font-semibold',
                phase === 'correct'
                  ? 'text-mint-600'
                  : phase === 'retry' || phase === 'reveal'
                    ? 'text-coral-500'
                    : 'text-ink/50',
              )}
            >
              {phase === 'correct' ? 'Hebat! Benar! 🎉' : message ?? defaultHint}
            </p>
          </section>

          <section className="relative flex flex-col items-center gap-3 rounded-3xl bg-white p-3 shadow-lg md:p-4">
            <div className="flex justify-center gap-2">
              {Array.from({ length: digits }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => removeFromSlot(index)}
                  disabled={!slots[index] || phase !== 'answering' || busy}
                  className={cx(
                    'flex h-14 w-12 items-center justify-center rounded-xl border-2 text-3xl font-bold transition',
                    slots[index]
                      ? 'animate-pop border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-dashed border-ink/20 text-ink/20',
                  )}
                  aria-label={
                    slots[index] ? `Hapus angka ${slots[index]}` : 'Kotak jawaban kosong'
                  }
                >
                  {slots[index] ?? '?'}
                </button>
              ))}
            </div>

            <div className="relative w-full max-w-[460px]">
              {mode === 'write' ? (
                <>
                  <div
                    className={cx(
                      'aspect-square w-full overflow-hidden rounded-2xl border-2 border-brand-100 bg-brand-50/40',
                      shake && 'animate-shake',
                    )}
                  >
                    <DigitCanvas
                      ref={canvasRef}
                      onInkChange={setHasInk}
                      onStrokeStart={cancelAutoRead}
                      onStrokeEnd={scheduleAutoRead}
                      disabled={phase !== 'answering' || slots.length >= digits || busy}
                    />
                  </div>
                  {busy ? (
                    <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-brand-600 shadow-md">
                      Membaca… 🔍
                    </div>
                  ) : null}
                  {overlayEmoji ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-white/75">
                      <span className="animate-bounce-in text-7xl">{overlayEmoji}</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <Keypad
                  onDigit={pressKey}
                  onBackspace={backspace}
                  disabled={inputLocked || slots.length >= digits}
                />
              )}
            </div>

            {mode === 'write' ? (
              <div className="flex w-full max-w-[460px] gap-2">
                <button
                  type="button"
                  onClick={() => {
                    cancelAutoRead();
                    playTap();
                    canvasRef.current?.clear();
                  }}
                  disabled={!hasInk || phase !== 'answering' || busy}
                  className="h-12 flex-1 rounded-2xl bg-cream text-base font-bold text-ink/70 shadow-md transition active:scale-95 disabled:opacity-40"
                >
                  🧹 Hapus
                </button>
                <button
                  type="button"
                  onClick={backspace}
                  disabled={slots.length === 0 || phase !== 'answering' || busy}
                  className="h-12 flex-1 rounded-2xl bg-cream text-base font-bold text-ink/70 shadow-md transition active:scale-95 disabled:opacity-40"
                >
                  ↩️ Angka
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={switchMode}
              className="text-sm font-medium text-ink/50 underline"
            >
              {mode === 'write' ? 'Ketik jawaban ⌨️' : 'Tulis tangan ✏️'}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
