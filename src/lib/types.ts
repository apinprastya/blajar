export type MathOp = 'add' | 'sub' | 'mul' | 'div';

export type EnglishMode = 'sentence' | 'match' | 'listen';

export interface SessionStats {
  correct: number;
  firstTry: number;
  total: number;
}

export interface SessionResult {
  stars: number;
  xp: number;
  stats: SessionStats;
}
