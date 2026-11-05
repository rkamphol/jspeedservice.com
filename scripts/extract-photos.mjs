// One-off helper: cuts the shop's photos out of the captured page screenshots
// (1440 px wide, 1 CSS px = 1 image px) and saves each at its old address under
// static/, plus a manifest the site build uses to place them.
// Usage: node scripts/extract-photos.mjs <captureDir> [<captureDir> ...]
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = join(app, 'static');
const manifest = [];
const best = new Map(); // old path -> area already saved

for (const dir of process.argv.slice(2)) {
  const cap = JSON.parse(readFileSync(join(dir, 'capture.json'), 'utf8'));
  const shot = join(dir, 'screenshot-1440.png');
  const [, shotH] = execFileSync('sips', ['-g', 'pixelHeight', shot], { encoding: 'utf8' }).match(/pixelHeight: (\d+)/);
  const page = new URL(cap.url).pathname;
  for (const el of cap.outline) {
    if (el.tag !== 'img' || !el.src || !el.src.includes('/uploads/')) continue;
    const { x, y, w, h } = el.box;
    if (w < 80 || h < 80 || x < 0 || y < 0 || y + h > Number(shotH) || x + w > 1440) continue;
    const oldPath = decodeURIComponent(new URL(el.src).pathname);
    const out = join(staticDir, oldPath);
    const area = w * h;
    if (!best.has(oldPath) || best.get(oldPath) < area) {
      mkdirSync(dirname(out), { recursive: true });
      const fmt = /\.png$/i.test(out) ? 'png' : 'jpeg';
      execFileSync('sips', ['-s', 'format', fmt, '-s', 'formatOptions', '85', '-c', String(h), String(w), '--cropOffset', String(y), String(x), shot, '--out', out], { stdio: 'ignore' });
      best.set(oldPath, area);
    }
    manifest.push({ page, src: oldPath, w, h, x, y, alt: el.alt ?? '', file: basename(oldPath) });
  }
}

writeFileSync(join(app, 'photos.json'), JSON.stringify(manifest, null, 1) + '\n');
const saved = [...best.keys()].filter((p) => existsSync(join(staticDir, p)) && statSync(join(staticDir, p)).size > 0);
console.log(`Saved ${saved.length} photos, ${manifest.length} placements.`);
