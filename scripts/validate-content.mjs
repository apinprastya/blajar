import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expected = {
  1: { vocab: 220, sentences: 30 },
  2: { vocab: 160, sentences: 90 },
  3: { vocab: 90, sentences: 160 },
  4: { vocab: 40, sentences: 210 },
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const outfile = path.join(tmpdir(), `blajar-validate-${Date.now()}.mjs`);
await build({
  entryPoints: [path.join(root, 'src/content/english.ts')],
  bundle: true,
  format: 'esm',
  outfile,
  logLevel: 'silent',
});
const { ENGLISH_LEVELS, DISTRACTOR_WORDS } = await import(pathToFileURL(outfile).href);

const errors = [];
const seenEn = new Map();
const seenSlug = new Map();
let total = 0;

for (const level of ENGLISH_LEVELS) {
  const want = expected[level.id];
  if (!want) {
    errors.push(`Unknown level id ${level.id}`);
    continue;
  }
  if (level.vocab.length !== want.vocab) {
    errors.push(`Level ${level.id}: vocab ${level.vocab.length}, expected ${want.vocab}`);
  }
  if (level.sentences.length !== want.sentences) {
    errors.push(`Level ${level.id}: sentences ${level.sentences.length}, expected ${want.sentences}`);
  }
  total += level.vocab.length + level.sentences.length;

  const check = (en, id, where, needEmoji, emoji) => {
    if (!en || !en.trim()) errors.push(`${where}: empty en`);
    if (!id || !id.trim()) errors.push(`${where}: empty id for "${en}"`);
    if (needEmoji && (!emoji || !emoji.trim())) errors.push(`${where}: empty emoji for "${en}"`);
    const enKey = en.trim().toLowerCase();
    const slug = slugify(en);
    if (!slug) errors.push(`${where}: slug is empty for "${en}"`);
    if (seenEn.has(enKey)) errors.push(`Duplicate en "${en}" (${where} and ${seenEn.get(enKey)})`);
    else seenEn.set(enKey, where);
    if (seenSlug.has(slug)) errors.push(`Duplicate slug "${slug}" (${where} and ${seenSlug.get(slug)})`);
    else seenSlug.set(slug, where);
  };

  level.vocab.forEach((item, i) => check(item.en, item.id, `L${level.id} vocab[${i}]`, true, item.emoji));
  level.sentences.forEach((item, i) =>
    check(item.en, item.id, `L${level.id} sentences[${i}]`, false, ''),
  );
}

if (total !== 1000) errors.push(`Total items ${total}, expected 1000`);

const distractorSeen = new Set();
for (const word of DISTRACTOR_WORDS) {
  const key = word.toLowerCase();
  if (distractorSeen.has(key)) errors.push(`Duplicate distractor word "${word}"`);
  distractorSeen.add(key);
}
if (DISTRACTOR_WORDS.length < 60) {
  errors.push(`Only ${DISTRACTOR_WORDS.length} distractor words, expected at least 60`);
}

if (process.argv.includes('--manifest')) {
  const manifestPath = path.join(root, 'src/content/audio-manifest.json');
  const audioDir = path.join(root, 'public/audio/en-us');
  const manifest = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(manifestPath, 'utf8')));
  for (const slug of seenSlug.keys()) {
    const file = manifest[slug];
    if (!file) errors.push(`Manifest missing clip for "${slug}"`);
    else if (!existsSync(path.join(audioDir, file))) errors.push(`Clip missing on disk: ${file}`);
  }
}

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const error of errors.slice(0, 80)) console.error(`  - ${error}`);
  if (errors.length > 80) console.error(`  ... and ${errors.length - 80} more`);
  process.exit(1);
}

console.log(`OK: ${total} items (${[...seenSlug.keys()].length} unique phrases)`);
for (const level of ENGLISH_LEVELS) {
  console.log(
    `  Level ${level.id} ${level.name}: ${level.vocab.length} vocab + ${level.sentences.length} sentences`,
  );
}
console.log(`  ${DISTRACTOR_WORDS.length} distractor words`);
