// Makes WebP copies of every photo the pages use (photos.json `full` and `half`), plus a
// 960 px one for photos wider than that, and records them in photos.json as `webp`
// ([{ src, w }], smallest first). The pages offer these in srcset; the JPEG/PNG `src`
// stays for old links. Needs cwebp (brew install webp). Usage: node scripts/make-webp.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(app, 'photos.json');
const photos = JSON.parse(readFileSync(manifestPath, 'utf8'));
const MID = 960;

const webp = (from, width, w) => {
  const to = from.replace(/\.\w+$/, `${width ? `-${width}w` : ''}.webp`).replace(/-640w-640w/, '-640w');
  const out = join(app, 'static', to);
  if (!existsSync(out)) {
    const resize = width && width < w ? ['-resize', String(width), '0'] : [];
    execFileSync('cwebp', ['-quiet', '-q', '72', '-m', '6', ...resize, join(app, 'static', from), '-o', out]);
  }
  return { src: to, w: width && width < w ? width : w };
};

let made = 0;
for (const p of photos) {
  if (!p.full) continue;
  const list = [];
  if (p.half) list.push(webp(p.half.src, 0, p.half.w));
  if (p.full.w > MID * 1.15) list.push(webp(p.full.src, MID, p.full.w));
  list.push(webp(p.full.src, 0, p.full.w));
  p.webp = list;
  made++;
}
writeFileSync(manifestPath, JSON.stringify(photos, null, 1) + '\n');
console.log(`WebP sizes recorded for ${made} photos.`);
