import audioManifest from '../content/audio-manifest.json';

const manifest = audioManifest as Record<string, string>;

let enabled = true;
let currentAudio: HTMLAudioElement | null = null;
let cachedVoice: SpeechSynthesisVoice | null = null;
const preloadCache = new Map<string, HTMLAudioElement>();

export function setTtsEnabled(value: boolean) {
  enabled = value;
  if (!value) stopSpeaking();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function assetBase(): string {
  return import.meta.env?.BASE_URL ?? '/';
}

export function speechUrl(text: string): string | null {
  const file = manifest[slugify(text)];
  return file ? `${assetBase()}audio/en-us/${file}` : null;
}

export function preloadSpeech(text: string) {
  if (typeof window === 'undefined') return;
  const url = speechUrl(text);
  if (!url || preloadCache.has(text)) return;
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.load();
  preloadCache.set(text, audio);
  if (preloadCache.size > 40) {
    const oldest = preloadCache.keys().next().value;
    if (oldest !== undefined) preloadCache.delete(oldest);
  }
}

export function speak(text: string) {
  if (!enabled || typeof window === 'undefined') return;
  stopSpeaking();
  speakInstant(text);
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
  }
}

function speakInstant(text: string) {
  const url = speechUrl(text);
  if (!url) {
    fallbackSpeak(text);
    return;
  }
  const audio = preloadCache.get(text) ?? new Audio(url);
  preloadCache.delete(text);
  currentAudio = audio;
  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
  };
  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null;
    fallbackSpeak(text);
  };
  const playback = audio.play();
  if (playback) {
    playback.catch(() => {
      if (currentAudio === audio) currentAudio = null;
      fallbackSpeak(text);
    });
  }
}

const PREFERRED_VOICES = [
  /google us english/i,
  /\b(samantha|ava|allison|susan|jenny|aria|michelle|zira)\b/i,
  /natural/i,
  /online/i,
];

function voiceScore(voice: SpeechSynthesisVoice): number {
  let score = 0;
  PREFERRED_VOICES.forEach((pattern, index) => {
    if (pattern.test(voice.name)) score += 10 - index;
  });
  const lang = voice.lang.toLowerCase().replace('_', '-');
  if (lang === 'en-us') score += 4;
  else if (lang.startsWith('en')) score += 2;
  if (!/espeak|compact|robot/i.test(voice.name)) score += 1;
  if (voice.localService) score += 0.5;
  return score;
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const english = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  if (english.length === 0) return null;
  cachedVoice = english.reduce((best, voice) =>
    voiceScore(voice) > voiceScore(best) ? voice : best,
  );
  return cachedVoice;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
  pickVoice();
}

function fallbackSpeak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    utterance.pitch = 1.02;
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* noop */
  }
}
