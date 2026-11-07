// One-off helper: lists every page address the old WordPress site had, so the build can
// put a forwarding page at each one that the new site no longer has.
// Usage: node scripts/collect-old-addresses.mjs <backup/public_html> [old sitemap index URL]
//
// Sources: the WP Fastest Cache copies in the backup (pages people actually visited) and the
// old site's sitemap (attachment and portfolio pages). Writes old-addresses.txt: one decoded
// path per line. Embed copies (/embed/) and feeds are left out; nobody browses to them.
import { readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const [backup, sitemapIndex = 'http://www.jspeedservice.com/sitemap_index.xml'] = process.argv.slice(2);
const cache = backup && join(backup, 'wp-content/cache/all');
if (!cache || !existsSync(cache)) {
  console.error('Usage: node scripts/collect-old-addresses.mjs <path to backup public_html> [sitemap index URL]');
  process.exit(1);
}

const found = new Set();
const add = (path) => {
  const p = decodeURIComponent(path).replace(/\/?$/, '/');
  if (!/\/(embed|feed)\/$/.test(p) && !p.includes('/wp-content/')) found.add(p);
};

// 1. Cached pages: every folder under cache/all holding an index.html.
const walk = (dir, rel) => {
  if (existsSync(join(dir, 'index.html'))) add(rel || '/');
  for (const name of readdirSync(dir)) {
    if (statSync(join(dir, name)).isDirectory()) walk(join(dir, name), `${rel}/${name}`);
  }
};
walk(cache, '');

// 2. The old sitemap, if the old site is still online.
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
try {
  const index = await (await fetch(sitemapIndex)).text();
  for (const map of locs(index)) {
    for (const url of locs(await (await fetch(map)).text())) add(new URL(url).pathname);
  }
} catch (e) {
  console.warn(`Old sitemap not read (${e.message}); using the cached pages only.`);
}

const list = [...found].sort();
writeFileSync(join(app, 'old-addresses.txt'), list.join('\n') + '\n');
console.log(`Wrote ${list.length} old addresses to old-addresses.txt.`);
