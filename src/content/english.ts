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

export const ENGLISH_MODES: {
  id: 'sentence' | 'match' | 'listen';
  name: string;
  desc: string;
  emoji: string;
}[] = [
  { id: 'sentence', name: 'Susun Kalimat', desc: 'Susun kata jadi kalimat Inggris', emoji: '🧩' },
  { id: 'match', name: 'Jodoh Kartu', desc: 'Cocokkan kata Inggris dan Indonesia', emoji: '🃏' },
  { id: 'listen', name: 'Dengar & Pilih', desc: 'Dengarkan kata, pilih artinya', emoji: '👂' },
];

export const ENGLISH_LEVELS: EnglishLevel[] = [
  {
    id: 1,
    name: 'Kata Dasar',
    desc: 'Hewan, buah, warna, benda',
    vocab: [
      { en: 'cat', id: 'kucing', emoji: '🐱' },
      { en: 'dog', id: 'anjing', emoji: '🐶' },
      { en: 'bird', id: 'burung', emoji: '🐦' },
      { en: 'fish', id: 'ikan', emoji: '🐟' },
      { en: 'cow', id: 'sapi', emoji: '🐮' },
      { en: 'rabbit', id: 'kelinci', emoji: '🐰' },
      { en: 'apple', id: 'apel', emoji: '🍎' },
      { en: 'banana', id: 'pisang', emoji: '🍌' },
      { en: 'orange', id: 'jeruk', emoji: '🍊' },
      { en: 'mango', id: 'mangga', emoji: '🥭' },
      { en: 'grape', id: 'anggur', emoji: '🍇' },
      { en: 'watermelon', id: 'semangka', emoji: '🍉' },
      { en: 'red', id: 'merah', emoji: '🔴' },
      { en: 'blue', id: 'biru', emoji: '🔵' },
      { en: 'yellow', id: 'kuning', emoji: '🟡' },
      { en: 'green', id: 'hijau', emoji: '🟢' },
      { en: 'black', id: 'hitam', emoji: '⚫' },
      { en: 'white', id: 'putih', emoji: '⚪' },
      { en: 'book', id: 'buku', emoji: '📖' },
      { en: 'pencil', id: 'pensil', emoji: '✏️' },
      { en: 'bag', id: 'tas', emoji: '🎒' },
      { en: 'chair', id: 'kursi', emoji: '🪑' },
    ],
    sentences: [
      { en: 'The cat is small', id: 'Kucing itu kecil' },
      { en: 'I like apples', id: 'Saya suka apel' },
      { en: 'The fish swims', id: 'Ikan itu berenang' },
      { en: 'The book is new', id: 'Buku itu baru' },
      { en: 'My bag is red', id: 'Tasku berwarna merah' },
      { en: 'The bird can fly', id: 'Burung itu bisa terbang' },
    ],
  },
  {
    id: 2,
    name: 'Frasa Harian',
    desc: 'Keluarga, aktivitas, sifat',
    vocab: [
      { en: 'mother', id: 'ibu', emoji: '👩' },
      { en: 'father', id: 'ayah', emoji: '👨' },
      { en: 'sister', id: 'kakak perempuan', emoji: '👧' },
      { en: 'brother', id: 'kakak laki-laki', emoji: '👦' },
      { en: 'grandmother', id: 'nenek', emoji: '👵' },
      { en: 'grandfather', id: 'kakek', emoji: '👴' },
      { en: 'eat', id: 'makan', emoji: '🍽️' },
      { en: 'drink', id: 'minum', emoji: '🥤' },
      { en: 'sleep', id: 'tidur', emoji: '😴' },
      { en: 'run', id: 'berlari', emoji: '🏃' },
      { en: 'read', id: 'membaca', emoji: '📖' },
      { en: 'write', id: 'menulis', emoji: '✍️' },
      { en: 'play', id: 'bermain', emoji: '⚽' },
      { en: 'study', id: 'belajar', emoji: '📚' },
      { en: 'big', id: 'besar', emoji: '🐘' },
      { en: 'small', id: 'kecil', emoji: '🐜' },
      { en: 'fast', id: 'cepat', emoji: '🐆' },
      { en: 'slow', id: 'lambat', emoji: '🐢' },
      { en: 'happy', id: 'senang', emoji: '😊' },
      { en: 'sad', id: 'sedih', emoji: '😢' },
      { en: 'hot', id: 'panas', emoji: '🔥' },
      { en: 'cold', id: 'dingin', emoji: '❄️' },
      { en: 'morning', id: 'pagi', emoji: '🌅' },
      { en: 'night', id: 'malam', emoji: '🌙' },
    ],
    sentences: [
      { en: 'She eats rice', id: 'Dia makan nasi' },
      { en: 'We go to school', id: 'Kami pergi ke sekolah' },
      { en: 'Father reads a book', id: 'Ayah membaca buku' },
      { en: 'Mother drinks tea', id: 'Ibu minum teh' },
      { en: 'They play ball', id: 'Mereka bermain bola' },
      { en: 'You are my friend', id: 'Kamu adalah temanku' },
      { en: 'My brother runs fast', id: 'Kakakku berlari cepat' },
      { en: 'I sleep at night', id: 'Saya tidur di malam hari' },
    ],
  },
  {
    id: 3,
    name: 'Kalimat',
    desc: 'Kalimat pendek sehari-hari',
    vocab: [
      { en: 'school', id: 'sekolah', emoji: '🏫' },
      { en: 'teacher', id: 'guru', emoji: '🧑‍🏫' },
      { en: 'student', id: 'murid', emoji: '🧑‍🎓' },
      { en: 'hospital', id: 'rumah sakit', emoji: '🏥' },
      { en: 'market', id: 'pasar', emoji: '🏪' },
      { en: 'rice', id: 'nasi', emoji: '🍚' },
      { en: 'water', id: 'air', emoji: '💧' },
      { en: 'milk', id: 'susu', emoji: '🥛' },
      { en: 'egg', id: 'telur', emoji: '🥚' },
      { en: 'bread', id: 'roti', emoji: '🍞' },
      { en: 'mountain', id: 'gunung', emoji: '⛰️' },
      { en: 'beach', id: 'pantai', emoji: '🏖️' },
      { en: 'city', id: 'kota', emoji: '🏙️' },
      { en: 'village', id: 'desa', emoji: '🏘️' },
      { en: 'garden', id: 'kebun', emoji: '🌳' },
      { en: 'kitchen', id: 'dapur', emoji: '🍳' },
      { en: 'bedroom', id: 'kamar tidur', emoji: '🛏️' },
      { en: 'bicycle', id: 'sepeda', emoji: '🚲' },
      { en: 'car', id: 'mobil', emoji: '🚗' },
      { en: 'train', id: 'kereta', emoji: '🚆' },
    ],
    sentences: [
      { en: 'I have two cats', id: 'Saya punya dua kucing' },
      { en: 'We study English', id: 'Kami belajar bahasa Inggris' },
      { en: 'He buys a book', id: 'Dia membeli sebuah buku' },
      { en: 'They live in Jakarta', id: 'Mereka tinggal di Jakarta' },
      { en: 'I want to eat a mango', id: 'Saya ingin makan mangga' },
      { en: 'The cat sleeps on the sofa', id: 'Kucing itu tidur di sofa' },
      { en: 'Mother cooks rice', id: 'Ibu memasak nasi' },
      { en: 'The students read books', id: 'Murid-murid membaca buku' },
    ],
  },
  {
    id: 4,
    name: 'Kalimat Panjang',
    desc: 'Kalimat panjang dan kaya kata',
    vocab: [
      { en: 'farmer', id: 'petani', emoji: '🧑‍🌾' },
      { en: 'doctor', id: 'dokter', emoji: '🧑‍⚕️' },
      { en: 'nurse', id: 'perawat', emoji: '👩‍⚕️' },
      { en: 'police officer', id: 'polisi', emoji: '👮' },
      { en: 'driver', id: 'pengemudi', emoji: '🚕' },
      { en: 'airplane', id: 'pesawat', emoji: '✈️' },
      { en: 'ship', id: 'kapal', emoji: '🚢' },
      { en: 'umbrella', id: 'payung', emoji: '☂️' },
      { en: 'shoes', id: 'sepatu', emoji: '👟' },
      { en: 'hat', id: 'topi', emoji: '🎩' },
      { en: 'window', id: 'jendela', emoji: '🪟' },
      { en: 'door', id: 'pintu', emoji: '🚪' },
      { en: 'clock', id: 'jam', emoji: '⏰' },
      { en: 'mirror', id: 'cermin', emoji: '🪞' },
      { en: 'key', id: 'kunci', emoji: '🔑' },
      { en: 'money', id: 'uang', emoji: '💰' },
      { en: 'bridge', id: 'jembatan', emoji: '🌉' },
      { en: 'river', id: 'sungai', emoji: '🏞️' },
    ],
    sentences: [
      { en: 'I go to school every morning', id: 'Saya pergi ke sekolah setiap pagi' },
      { en: 'She likes to eat big red apples', id: 'Dia suka makan apel merah besar' },
      { en: 'We played ball in the park yesterday', id: 'Kami bermain bola di taman kemarin' },
      { en: 'Mother cooks fried rice for father', id: 'Ibu memasak nasi goreng untuk ayah' },
      { en: 'The small cat sleeps on the chair', id: 'Kucing kecil itu tidur di kursi' },
      { en: 'I study English every day', id: 'Saya belajar bahasa Inggris setiap hari' },
      { en: 'They go to the beach on Sunday', id: 'Mereka pergi ke pantai pada hari Minggu' },
      { en: 'Father buys three new books for me', id: 'Ayah membeli tiga buku baru untukku' },
    ],
  },
];

export const DISTRACTOR_WORDS = [
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'in',
  'on',
  'at',
  'and',
  'very',
  'not',
  'my',
  'your',
  'his',
  'her',
  'to',
  'of',
  'with',
  'can',
  'do',
  'does',
  'this',
  'that',
  'these',
  'those',
];

export function getEnglishLevel(level: number): EnglishLevel {
  return ENGLISH_LEVELS.find((item) => item.id === level) ?? ENGLISH_LEVELS[0];
}
