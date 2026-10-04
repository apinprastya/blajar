import { useEffect, useState } from 'react';
import { getKokoroState, subscribeKokoro, type KokoroState } from '../lib/kokoro';

export function AiVoiceToast() {
  const [state, setState] = useState<KokoroState>(getKokoroState());

  useEffect(() => {
    return subscribeKokoro(() => setState({ ...getKokoroState() }));
  }, []);

  if (state.status !== 'loading') return null;

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-ink/95 px-4 py-3 text-center text-sm font-semibold text-white shadow-2xl">
      <p>✨ Mengunduh suara AI… {Math.round(state.progress)}%</p>
      <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-mint-400 transition-all duration-300"
          style={{ width: `${state.progress}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] font-normal text-white/60">Sekali unduh, lalu tersimpan di perangkat</p>
    </div>
  );
}
