import { useEffect, useState } from 'react';
import { preloadSpeech, speak } from '../lib/tts';
import { playTap } from '../lib/sfx';
import { cx } from '../lib/utils';

interface Props {
  text: string;
  size?: 'md' | 'lg';
}

export function SpeakerButton({ text, size = 'lg' }: Props) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    preloadSpeech(text);
  }, [text]);

  const handleClick = () => {
    playTap();
    speak(text);
    setPulse(true);
    window.setTimeout(() => setPulse(false), 500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Dengarkan: ${text}`}
      className={cx(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-sky-500 text-white shadow-lg transition active:scale-95',
        size === 'lg' ? 'h-24 w-24 text-4xl' : 'h-14 w-14 text-2xl',
        pulse && 'animate-pop',
      )}
    >
      🔊
    </button>
  );
}
