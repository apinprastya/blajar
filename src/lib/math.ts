import type { MathOp } from './types';

export interface MathQuestion {
  text: string;
  answer: number;
}

export const MATH_OPS: { id: MathOp; symbol: string; name: string; hint: string }[] = [
  { id: 'add', symbol: '+', name: 'Penjumlahan', hint: 'Menambah' },
  { id: 'sub', symbol: '−', name: 'Pengurangan', hint: 'Mengurangi' },
  { id: 'mul', symbol: '×', name: 'Perkalian', hint: 'Mengali' },
  { id: 'div', symbol: '÷', name: 'Pembagian', hint: 'Membagi' },
];

export const MATH_LEVELS = [1, 2, 3, 4] as const;

export const LEVEL_NAMES = ['Mudah', 'Sedang', 'Sulit', 'Ahli'];

export const LEVEL_DESC: Record<MathOp, string[]> = {
  add: ['1 digit, hasil ≤ 10', 'Hasil ≤ 20', 'Hasil ≤ 100', '3 angka, hasil ≤ 100'],
  sub: ['1 digit, hasil ≥ 0', 'Hasil ≤ 20', 'Bilangan hingga 100', '3 angka, hasil ≥ 0'],
  mul: ['Angka 1 sampai 5', 'Tabel ×1 sampai ×5', 'Tabel ×1 sampai ×10', '2 angka × 1 angka'],
  div: ['Hasil ≤ 5', 'Hasil ≤ 10', 'Pembagian hingga 100', 'Pembagian lebih besar'],
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addQuestion(level: number): MathQuestion {
  if (level === 1) {
    let a = 0;
    let b = 0;
    do {
      a = rand(1, 9);
      b = rand(1, 9);
    } while (a + b > 10);
    return { text: `${a} + ${b} = ?`, answer: a + b };
  }
  if (level === 2) {
    let a = 0;
    let b = 0;
    do {
      a = rand(2, 19);
      b = rand(2, 19);
    } while (a + b > 20);
    return { text: `${a} + ${b} = ?`, answer: a + b };
  }
  if (level === 3) {
    let a = 0;
    let b = 0;
    do {
      a = rand(10, 90);
      b = rand(5, 90);
    } while (a + b > 100);
    return { text: `${a} + ${b} = ?`, answer: a + b };
  }
  let a = 0;
  let b = 0;
  let c = 0;
  do {
    a = rand(5, 40);
    b = rand(5, 40);
    c = rand(2, 30);
  } while (a + b + c > 100);
  return { text: `${a} + ${b} + ${c} = ?`, answer: a + b + c };
}

function subQuestion(level: number): MathQuestion {
  if (level === 1) {
    const a = rand(2, 10);
    const b = rand(1, a);
    return { text: `${a} − ${b} = ?`, answer: a - b };
  }
  if (level === 2) {
    const a = rand(6, 20);
    const b = rand(1, a - 1);
    return { text: `${a} − ${b} = ?`, answer: a - b };
  }
  if (level === 3) {
    const a = rand(20, 100);
    const b = rand(2, a - 1);
    return { text: `${a} − ${b} = ?`, answer: a - b };
  }
  const a = rand(30, 100);
  const b = rand(5, a - 12);
  const c = rand(1, a - b);
  return { text: `${a} − ${b} − ${c} = ?`, answer: a - b - c };
}

function mulQuestion(level: number): MathQuestion {
  if (level === 1) {
    const a = rand(1, 5);
    const b = rand(1, 5);
    return { text: `${a} × ${b} = ?`, answer: a * b };
  }
  if (level === 2) {
    const a = rand(2, 10);
    const b = rand(1, 5);
    return { text: `${a} × ${b} = ?`, answer: a * b };
  }
  if (level === 3) {
    const a = rand(2, 10);
    const b = rand(2, 10);
    return { text: `${a} × ${b} = ?`, answer: a * b };
  }
  const a = rand(11, 29);
  const b = rand(2, 9);
  return { text: `${a} × ${b} = ?`, answer: a * b };
}

function divQuestion(level: number): MathQuestion {
  if (level === 1) {
    const divisor = rand(2, 5);
    const result = rand(1, 5);
    return { text: `${divisor * result} ÷ ${divisor} = ?`, answer: result };
  }
  if (level === 2) {
    const divisor = rand(2, 5);
    const result = rand(2, 10);
    return { text: `${divisor * result} ÷ ${divisor} = ?`, answer: result };
  }
  if (level === 3) {
    const divisor = rand(2, 10);
    const result = rand(2, 10);
    return { text: `${divisor * result} ÷ ${divisor} = ?`, answer: result };
  }
  const divisor = rand(3, 10);
  const result = rand(4, 12);
  return { text: `${divisor * result} ÷ ${divisor} = ?`, answer: result };
}

export function generateQuestion(op: MathOp, level: number): MathQuestion {
  switch (op) {
    case 'add':
      return addQuestion(level);
    case 'sub':
      return subQuestion(level);
    case 'mul':
      return mulQuestion(level);
    case 'div':
      return divQuestion(level);
  }
}

export function optionCount(answer: number): number {
  return String(answer).length;
}
