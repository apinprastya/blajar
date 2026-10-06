export interface VocabItem {
  en: string;
  id: string;
  emoji: string;
}

export interface SentenceItem {
  en: string;
  id: string;
}

export interface EnglishLevel {
  id: number;
  name: string;
  desc: string;
  vocab: VocabItem[];
  sentences: SentenceItem[];
}
