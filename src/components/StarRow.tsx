import type { CSSProperties } from 'react';
import { cx } from '../lib/utils';

export function StarIcon({ filled, style }: { filled: boolean; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      style={style}
      className={cx('shrink-0', filled ? 'text-sun-400 drop-shadow' : 'text-ink/15')}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.4l2.9 6.15 6.75.72-5.02 4.5 1.42 6.63L12 17.1l-6.05 3.3 1.42-6.63-5.02-4.5 6.75-.72L12 2.4z" />
    </svg>
  );
}

interface Props {
  count: number;
  size?: number;
  animate?: boolean;
}

export function StarRow({ count, size = 22, animate = false }: Props) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${count} dari 3 bintang`}>
      {[0, 1, 2].map((index) => (
        <StarIcon
          key={index}
          filled={index < count}
          style={{
            width: size,
            height: size,
            ...(animate && index < count
              ? { animation: `bounce-in 0.5s ease-out ${0.15 * index + 0.2}s both` }
              : {}),
          }}
        />
      ))}
    </div>
  );
}
