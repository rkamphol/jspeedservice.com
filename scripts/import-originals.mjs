// One-off helper: replaces the low-resolution photo crops with web-sized copies of the
// full-size originals from a backup of the old site's public_html.
// Usage: node scripts/import-originals.mjs <backup/public_html>
//
// For each photo in photos.json (whose `src` is a WordPress thumbnail such as
// /wp-content/uploads/2016/02/foo-300x225.jpg), the original is .../foo.jpg. We write:
//   static/<original path>          – the original, or a 1280 px copy if wider (also the
//                                     old full-size address)
//   static/<original path>-640w.jpg – a 640 px copy for phones and small tiles
// and record them in photos.json as `full` and `half`. The old thumbnail files stay so
// old image links keep working; `src`, `w` and `h` are left as they were.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const backup = process.argv[2];
if (!backup || !existsSync(join(backup, 'wp-content/uploads'))) {
  console.error('Usage: node scripts/import-originals.mjs <path to backup public_html>');
  process.exit(1);
}

const FULL = 1280;
const HALF = 640;
const manifestPath = join(app, 'photos.json');
const photos = JSON.parse(readFileSync(manifestPath, 'utf8'));

const size = (file) => {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  return { w: Number(out.match(/pixelWidth: (\d+)/)[1]), h: Number(out.match(/pixelHeight: (\d+)/)[1]) };
};
const resize = (from, to, width) => {
  mkdirSync(dirname(to), { recursive: true });
  const png = /\.png$/i.test(to);
  const args = ['-s', 'format', png ? 'png' : 'jpeg'];
  if (!png) args.push('-s', 'formatOptions', '70');
  if (width) args.push('--resampleWidth', String(width));
  execFileSync('sips', [...args, from, '--out', to], { stdio: 'ignore' });
  return size(to);
};

const done = new Map(); // original path -> { full, half }
let missing = 0;
for (const p of photos) {
  const orig = p.src.replace(/-\d+x\d+(\.\w+)$/, '$1');
  if (!done.has(orig)) {
    const source = join(backup, orig);
    if (!existsSync(source)) {
      console.warn(`no original for ${p.src}`);
      missing++;
      done.set(orig, null);
      continue;
    }
    const { w, h } = size(source);
    // Originals no wider than FULL are already web-compressed by WordPress; re-encoding
    // them with sips would only make them bigger and softer, so copy them as they are.
    let full;
    if (w > FULL) full = { src: orig, ...resize(source, join(app, 'static', orig), FULL) };
    else {
      mkdirSync(dirname(join(app, 'static', orig)), { recursive: true });
      copyFileSync(source, join(app, 'static', orig));
      full = { src: orig, w, h };
    }
    let half;
    if (full.w > HALF * 1.2) {
      const halfSrc = orig.replace(/(\.\w+)$/, `-${HALF}w$1`);
      half = { src: halfSrc, ...resize(source, join(app, 'static', halfSrc), HALF) };
    }
    done.set(orig, { full, half });
  }
  const got = done.get(orig);
  if (!got) continue;
  p.full = got.full;
  if (got.half) p.half = got.half;
  else delete p.half;
}

writeFileSync(manifestPath, JSON.stringify(photos, null, 1) + '\n');
console.log(`Imported ${[...done.values()].filter(Boolean).length} originals (${missing} missing).`);
