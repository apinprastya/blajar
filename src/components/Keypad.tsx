import { cx } from '../lib/utils';

interface Props {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

export function Keypad({ onDigit, onBackspace, disabled = false }: Props) {
  const keyClass =
    'flex h-14 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-ink shadow-md transition active:scale-95 disabled:opacity-40 md:h-16 md:text-3xl';

  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-2">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
        <button
          key={digit}
          type="button"
          className={keyClass}
          disabled={disabled}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        className={cx(keyClass, 'text-xl text-coral-500')}
        disabled={disabled}
        onClick={onBackspace}
        aria-label="Hapus satu angka"
      >
        ⬅️
      </button>
      <button type="button" className={keyClass} disabled={disabled} onClick={() => onDigit('0')}>
        0
      </button>
      <div />
    </div>
  );
}
