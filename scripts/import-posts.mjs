// One-off helper: imports the old site's repair-story posts from a backup of its
// public_html (the WP Fastest Cache copies under wp-content/cache/all/).
// Usage: node scripts/import-posts.mjs <backup/public_html>
//        node scripts/import-originals.mjs <backup/public_html>   (web copies of the photos)
//
// Writes posts.json (title, old address, date, categories, text, photos) and adds each
// post's photos to photos.json (marked `post: true`, replaced on every run).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const backup = process.argv[2];
const cache = backup && join(backup, 'wp-content/cache/all');
if (!cache || !existsSync(cache)) {
  console.error('Usage: node scripts/import-posts.mjs <path to backup public_html>');
  process.exit(1);
}

// Post folders live under the two category bases the old site used.
const CATS = { 'งานซ่อม-mini': 'mini', 'อื่นๆ': 'other' };
const CAT_BY_NAME = { 'งานซ่อม MINI': 'mini', 'อื่นๆ': 'other' };

const entities = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#039': "'", hellip: '…', ndash: '–', mdash: '—' };
const text = (html) =>
  html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z#0-9]+);/gi, (m, e) => entities[e] ?? m)
    .replace(/\s+/g, ' ')
    .trim();

const uploadPath = (url) => {
  const m = url.match(/\/wp-content\/uploads\/[^"'?#\s]+/);
  return m && decodeURIComponent(m[0]);
};
// Prefer the full-size original (the URL usually names a resized copy, -770x335.jpg).
const original = (path) => {
  const orig = path.replace(/-\d+x\d+(\.\w+)$/, '$1');
  if (existsSync(join(backup, orig))) return orig;
  return existsSync(join(backup, path)) ? path : null;
};
const size = (file) => {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
  return { w: Number(out.match(/pixelWidth: (\d+)/)[1]), h: Number(out.match(/pixelHeight: (\d+)/)[1]) };
};

function parse(file) {
  const html = readFileSync(file, 'utf8');
  const art = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
  if (!art) return null;
  // The old address exactly as the site linked it (percent-encoded), from the like button.
  const href = (html.match(/class="fb-like" data-href="([^"]+)"/) || [])[1];
  const title = text((art.match(/class="entry-title">([\s\S]*?)<\/span>/) || [])[1] || '');
  const [, date, dateTh] = art.match(/<time datetime="(\d{4}-\d{2}-\d{2})[^"]*">([^<]+)<\/time>/) || [];
  const cats = [...art.matchAll(/rel="category tag">([^<]+)</g)].map((m) => CAT_BY_NAME[m[1].trim()]).filter(Boolean);
  const content = (art.match(/<div class="post_content">([\s\S]*?)<div class="hatom-extra"/) || [])[1] || '';
  // Every block tag (p, div, headings, list items, line breaks) ends a paragraph; posts mix them.
  const body = content
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
    .split(/<\/?(?:p|div|h[1-6]|li|ul|ol|blockquote|figure|figcaption|table|tr)\b[^>]*>|<br\s*\/?>\s*<br\s*\/?>/i)
    .map(text)
    .filter((t) => t.length > 1);
  const imgs = [...art.matchAll(/<img[^>]+>/g)]
    .map((m) => (m[0].match(/data-src="([^"]+)"/) || m[0].match(/\ssrc="([^"]+)"/) || [])[1])
    .filter((u) => u && u.includes('/wp-content/uploads/'))
    .map((u) => original(uploadPath(u)))
    .filter(Boolean);
  if (!href || !title || !date) return null;
  // Many posts repeat their title as a heading at the top of the text; the page shows it already.
  const same = (a) => a.replace(/\s+/g, '').toLowerCase();
  // Also drop the old theme's link labels and photo headings (their links and photos aren't kept)
  // and lines repeated within a post.
  const junk = /^(ลิงค์เพิ่มเติม|ติดต่อสอบถาม|บอร์ดพูดคุย|ลิงค์เพิ่มเติม ติดต่อสอบถาม บอร์ดพูดคุย|ติดต่อสอบถามเพิ่มเติม Board พูดคุย|รูปภาพเพิ่มเติม.*|ภาพอื่นๆ)$/;
  const paras = body.filter((t, i) => same(t) !== same(title) && !junk.test(t) && body.indexOf(t) === i);
  return { title, path: new URL(href).pathname, date, dateTh: dateTh.trim(), cats: cats.length ? cats : ['mini'], body: paras, images: [...new Set(imgs)] };
}

const posts = [];
for (const [dir, cat] of Object.entries(CATS)) {
  const base = join(cache, dir);
  if (!existsSync(base)) continue;
  for (const slug of readdirSync(base)) {
    const file = join(base, slug, 'index.html');
    if (slug === 'page' || !statSync(join(base, slug)).isDirectory() || !existsSync(file)) continue;
    const post = parse(file);
    if (post) posts.push(post);
    else console.warn(`skipped ${dir}/${slug} (not a post page)`);
  }
}
posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'th'));
writeFileSync(join(app, 'posts.json'), JSON.stringify(posts, null, 1) + '\n');

// Register the posts' photos so import-originals.mjs makes their web copies.
const photosPath = join(app, 'photos.json');
const photos = JSON.parse(readFileSync(photosPath, 'utf8')).filter((p) => !p.post);
for (const post of posts) {
  post.images.forEach((src, i) => {
    photos.push({ page: post.path, src, ...size(join(backup, src)), x: 0, y: i, alt: post.title, file: src.split('/').pop(), post: true });
  });
}
writeFileSync(photosPath, JSON.stringify(photos, null, 1) + '\n');
console.log(`Imported ${posts.length} posts with ${posts.reduce((n, p) => n + p.images.length, 0)} photos.`);
