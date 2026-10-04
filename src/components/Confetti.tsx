import { useMemo } from 'react';

const COLORS = ['#7C5CFC', '#FD79A8', '#00B894', '#FDCB6E', '#0984E3', '#FF8FA3', '#3ED9A4'];

export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2 + Math.random() * 1.6,
        size: 8 + Math.random() * 8,
        color: COLORS[index % COLORS.length],
        round: Math.random() > 0.5,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="animate-fall absolute top-0 block"
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.round ? piece.size : piece.size * 0.5,
            background: piece.color,
            borderRadius: piece.round ? '50%' : 2,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
