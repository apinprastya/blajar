let ctx: AudioContext | null = null;
let enabled = true;

export function setSfxEnabled(value: boolean) {
  enabled = value;
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  audio();
}

function note(freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(vol, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

export function playTap() {
  const c = audio();
  if (!c) return;
  note(560, c.currentTime, 0.07, 'triangle', 0.1);
}

export function playPop() {
  const c = audio();
  if (!c) return;
  note(720, c.currentTime, 0.08, 'triangle', 0.14);
  note(1080, c.currentTime + 0.05, 0.08, 'triangle', 0.1);
}

export function playCorrect() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  note(523.25, t, 0.14, 'sine', 0.18);
  note(659.25, t + 0.11, 0.14, 'sine', 0.18);
  note(783.99, t + 0.22, 0.22, 'sine', 0.2);
}

export function playWrong() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  note(300, t, 0.16, 'sawtooth', 0.12);
  note(210, t + 0.14, 0.24, 'sawtooth', 0.12);
}

export function playWin() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const seq = [523.25, 659.25, 783.99, 1046.5];
  seq.forEach((f, i) => note(f, t + i * 0.12, 0.18, 'triangle', 0.16));
  note(1318.5, t + 0.5, 0.35, 'sine', 0.14);
}
