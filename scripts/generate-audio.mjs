import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const voiceDir = path.join(root, 'public/audio/en-us');
const manifestPath = path.join(root, 'src/content/audio-manifest.json');
const voice = process.env.TTS_VOICE || 'en-US-JennyNeural';
const rate = process.env.TTS_RATE || '-15%';
const edgeTts = process.env.EDGE_TTS || 'edge-tts';
const force = process.argv.includes('--force');
const workers = Number(process.env.TTS_WORKERS || 4);

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function collectPhrases() {
  const outfile = path.join(tmpdir(), `elajar-english-${Date.now()}.mjs`);
  await build({
    entryPoints: [path.join(root, 'src/content/english.ts')],
    bundle: true,
    format: 'esm',
    outfile,
    logLevel: 'silent',
  });
  const module = await import(pathToFileURL(outfile).href);
  const phrases = new Set();
  for (const level of module.ENGLISH_LEVELS) {
    for (const item of level.vocab) phrases.add(item.en);
    for (const item of level.sentences) phrases.add(item.en);
  }
  return [...phrases].sort();
}

function generate(phrase, file) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      edgeTts,
      ['--voice', voice, `--rate=${rate}`, '--text', phrase, '--write-media', file],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`edge-tts failed for "${phrase}" (code ${code}): ${stderr}`));
    });
  });
}

async function runPool(tasks, size) {
  const queue = [...tasks];
  const runners = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      await task();
    }
  });
  await Promise.all(runners);
}

const phrases = await collectPhrases();
mkdirSync(voiceDir, { recursive: true });
const manifest = {};
const tasks = [];

for (const phrase of phrases) {
  const slug = slugify(phrase);
  if (manifest[slug]) throw new Error(`Slug collision: "${phrase}" -> ${slug}`);
  const file = `${slug}.mp3`;
  manifest[slug] = file;
  const target = path.join(voiceDir, file);
  if (!existsSync(target) || force) {
    tasks.push(async () => {
      process.stdout.write(`TTS  ${phrase}\n`);
      await generate(phrase, target);
    });
  }
}

await runPool(tasks, workers);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `\n${phrases.length} phrases, ${tasks.length} generated, ${phrases.length - tasks.length} cached`,
);
console.log(`voice: ${voice} (rate ${rate})`);
console.log(`clips: ${path.relative(root, voiceDir)}`);
console.log(`manifest: ${path.relative(root, manifestPath)}`);
