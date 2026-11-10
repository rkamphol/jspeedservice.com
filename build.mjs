// Static site generator: writes every page to dist/ at its old address.
// Paths in content.mjs are the old percent-encoded links; each page is written to the
// decoded folder name (e.g. dist/บริการ/index.html), which is how static hosts such as
// GitHub Pages resolve /%e0%b8%9a.../ requests.
import { mkdirSync, rmSync, writeFileSync, copyFileSync, cpSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { site, paths, services, posts, categories, aboutWork, maintenance } from './content.mjs';
import { icon, facebookIcon } from './icons.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'dist');
// Link to a file in public/ (served at /assets/) with a short hash of its content, so
// browsers and Cloudflare fetch the new copy as soon as the file changes.
const asset = (file) =>
  `/assets/${file}?v=${createHash('sha256').update(readFileSync(join(root, 'public', file))).digest('hex').slice(0, 8)}`;
const year = new Date().getFullYear();
// Pages link from the site root (/assets/..., /บริการ/). When the site is served from a
// sub-folder (the GitHub Pages preview at <user>.github.io/<repo>/, before the custom
// domain is connected), BASE_PATH="/<repo>" is put in front of every such link.
const base = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const withBase = (html) =>
  base
    ? html
        .replace(/\b(href|src)="\/(?!\/)/g, `$1="${base}/`)
        .replace(/\bsrcset="([^"]*)"/g, (_, set) => `srcset="${set.replace(/(^|,\s*)\/(?!\/)/g, `$1${base}/`)}"`)
    : html;

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fsPath = (p) => decodeURIComponent(p);
// Cut text to at most `n` characters at a space, for meta descriptions.
const clip = (t, n) => (t.length <= n ? t : `${t.slice(0, n).replace(/\s+\S*$/, '')}…`);
const ldScript = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
const addressText = `${site.address.street} ${site.address.area} ${site.address.city} ${site.address.postcode}`;

// ---------- shared pieces ----------

// ---------- photos ----------
// photos.json lists the shop's photos (made by scripts/extract-photos.mjs), each kept
// at its old /wp-content/uploads/ address under static/ so old image links keep working.
const photos = JSON.parse(readFileSync(join(root, 'photos.json'), 'utf8'));
const onPage = (path) => photos.filter((p) => decodeURIComponent(p.page) === fsPath(path));
const byPos = (a, b) => a.y - b.y || a.x - b.x;
const uniq = (list) => [...new Map(list.map((p) => [p.src, p])).values()];
const catOf = (p) =>
  /engine/.test(p.file) ? 'engine' : /gear/.test(p.file) ? 'gear' : /suspension/.test(p.file) ? 'suspension' : /air/.test(p.file) ? 'air' : 'car';

const home = onPage(paths.home).sort(byPos);
const homeSvc = home.filter((p) => p.y < 1200).sort((a, b) => a.x - b.x);
const banners = home.filter((p) => /banner/.test(p.file));
const homeGallery = home.filter((p) => p.y > 3500 && !/banner/.test(p.file));
const aboutPics = onPage(paths.about).sort(byPos);
const workPics = aboutPics.filter((p) => p.w > 500);
// Shared-link picture for pages without a photo of their own (the home hero photo).
const defaultImage = (workPics[5].full ?? workPics[5]).src;
const brandPic = (name) => aboutPics.find((p) => p.file.startsWith(name));
const brandPages = [
  { path: paths.teamMini, name: 'MINI', short: 'MINI', pic: brandPic('mini') },
  { path: paths.teamBmw, name: 'BMW', short: 'BMW', pic: brandPic('bmw') },
  { path: paths.teamBenz, name: 'Mercedes-Benz', short: 'BENZ', logo: asset('brand-benz.png') },
];
const servicePics = onPage(paths.services).sort(byPos);
const pool = uniq([...servicePics, ...services.flatMap((s) => onPage(s.path)), ...homeSvc]);
const picsFor = (s) => {
  const own = onPage(s.path).sort(byPos);
  return own.length ? own : pool.filter((p) => catOf(p) === s.key);
};
const svcPic = Object.fromEntries(services.map((s, i) => [s.key, homeSvc[i]]));
// A post's own photos (imported with it); the first one is its card and header picture.
const postPics = (p) => onPage(p.path).filter((x) => x.post).sort(byPos);

// Photos use the full-size originals (`full`, plus a 640 px `half` for small screens)
// imported by scripts/import-originals.mjs; `sizes` says how wide the photo shows.
const SIZES = '(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw';
const img = (p, alt, cls = '', sizes = SIZES) => {
  const f = p.full ?? p;
  // WebP sizes (scripts/make-webp.mjs) when there are any; the JPEG/PNG stays as `src`.
  const list = p.webp ?? (p.half ? [p.half, f] : []);
  const set = list.length > 1 || p.webp ? ` srcset="${list.map((x) => `${x.src} ${x.w}w`).join(', ')}" sizes="${sizes}"` : '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${f.src}"${set} width="${f.w}" height="${f.h}" alt="${esc(p.desc ?? alt)}" loading="lazy" decoding="async">`;
};

const tile = (kind, i = 0, label = '', photo, sizes) =>
  photo
    ? `<div class="ph ph--photo">${img(photo, label || 'ภาพงานซ่อม J SPEED SERVICE', '', sizes)}</div>`
    : tileShape(kind, i, label);

const tileShape = (kind, i = 0, label = '') =>
  `<div class="ph ph--${kind} ph--v${i % 4}" role="img" aria-label="${esc(label || 'ภาพงานซ่อม')}">${icon(kind, 'ph__ico')}</div>`;

const callButton = (cls = 'btn btn--call') =>
  `<a class="${cls}" href="tel:${site.tel}" aria-label="โทร ${site.phone}">${icon('phone')}<span>โทร ${site.phone}</span></a>`;

function header(active) {
  const item = (key, href, label) =>
    `<li class="menu__item${active === key ? ' is-active' : ''}"><a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a></li>`;
  const sub = [
    ...services.map((s) => `<li><a href="${s.path}">${icon(s.icon)}${s.pageName ?? s.name}</a></li>`),
    `<li><a href="${categories.mini.path}">${icon('car')}${categories.mini.name}</a></li>`,
  ].join('');
  return `
<a class="skip" href="#main">ข้ามไปยังเนื้อหา</a>
<div class="topbar">
  <div class="wrap topbar__in">
    <span class="topbar__hours">${icon('clock')}${site.hours.days} · ${site.hours.opens} - ${site.hours.closes} น.</span>
    <span class="topbar__tow">${icon('tow')}รถยกสไลด์ทั่วประเทศ 24 ชม.</span>
    <a class="topbar__fb" href="${site.facebook}" target="_blank" rel="noopener">${facebookIcon}facebook.com/jspeedservice</a>
  </div>
</div>
<header class="mainnav">
  <div class="wrap mainnav__in">
    <a class="brand" href="/" aria-label="${site.name} หน้าแรก"><img class="brand__logo" src="${asset('logo.png')}" width="218" height="112" alt=""></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu" aria-label="เมนู">${icon('menu', 'ico ico--open')}${icon('close', 'ico ico--close')}<span>เมนู</span></button>
    <nav aria-label="เมนูหลัก">
    <ul class="menu" id="menu">
      ${item('home', paths.home, 'หน้าแรก')}
      ${item('about', paths.about, 'เกี่ยวกับเรา')}
      <li class="menu__item has-sub${active === 'services' ? ' is-active' : ''}">
        <a href="${paths.services}"${active === 'services' ? ' aria-current="page"' : ''}>บริการ</a>
        <button class="sub-toggle" type="button" aria-expanded="false" aria-label="เปิดรายการบริการ">${icon('down')}</button>
        <ul class="submenu">${sub}</ul>
      </li>
      ${item('contact', paths.contact, 'ติดต่อเรา')}
    </ul>
    </nav>
    ${callButton('nav-call')}
  </div>
</header>`;
}

function footer() {
  return `
<footer class="footer">
  <div class="wrap">
    <div>
      <div class="footer__grid">
        <div class="footer__brand">
          <a class="brand brand--light" href="/"><img class="brand__logo" src="${asset('logo.png')}" width="218" height="112" alt="${site.name}"></a>
          <p>อู่ซ่อมรถยุโรป MINI BMW BENZ โดยทีมงานมืออาชีพ ตรวจเช็คด้วยระบบคอมพิวเตอร์ รับประกันงานซ่อม</p>
        </div>
        <div>
          <h2 class="footer__h">เมนู</h2>
          <ul class="footer__links">
            <li><a href="/">หน้าแรก</a></li>
            <li><a href="${paths.about}">เกี่ยวกับเรา</a></li>
            <li><a href="${paths.services}">บริการ</a></li>
            <li><a href="${categories.mini.path}">${categories.mini.name}</a></li>
            <li><a href="${paths.contact}">ติดต่อเรา</a></li>
          </ul>
        </div>
        <div>
          <h2 class="footer__h">บริการ</h2>
          <ul class="footer__links">
            ${services.map((s) => `<li><a href="${s.path}">${s.pageName ?? s.name}</a></li>`).join('')}
          </ul>
        </div>
        <div>
          <h2 class="footer__h">ติดต่อ</h2>
          <ul class="footer__contact">
            <li>${icon('pin')}<span>${addressText}</span></li>
            <li>${icon('phone')}<a href="tel:${site.tel}">${site.phone}</a></li>
            <li>${icon('clock')}<span>${site.hours.days}<br>${site.hours.opens} - ${site.hours.closes} น.</span></li>
            <li>${icon('tow')}<span>รถยกสไลด์ทั่วประเทศ 24 ชม.</span></li>
          </ul>
        </div>
      </div>
      <div class="footer__social">
        <a class="social" href="${site.facebook}" rel="noopener" target="_blank" aria-label="Facebook">${facebookIcon}</a>
        <a class="social" href="tel:${site.tel}" aria-label="โทร ${site.phone}">${icon('phone')}</a>
        <a class="social" href="${paths.contact}" aria-label="แผนที่และการเดินทาง">${icon('pin')}</a>
      </div>
    </div>
    <p class="copyright"><a href="/">${esc(site.title)}</a> © 2023–${year}.</p>
  </div>
</footer>
<a class="totop" href="#top" aria-label="กลับขึ้นด้านบน">${icon('up')}</a>
<script src="${asset('main.js')}" defer></script>`;
}

// Heading fonts swap in; the body font is `optional` so long text never jumps when it
// arrives (a first visit may show the system Thai font for body text instead).
const FONTS = 'https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&family=Orbitron:wght@700;800;900&display=swap';
const BODY_FONT = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=optional';

function layout({ path, title, seoTitle = title, description, active, body, type = 'website', image, jsonLd = [] }) {
  const fullTitle =
    path === '/' ? site.homeTitle : (seoTitle + site.titleTail).length <= 70 ? seoTitle + site.titleTail : `${seoTitle} | ${site.name}`;
  const url = site.origin + path;
  const ogImage = site.origin + (image ?? defaultImage);
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="max-image-preview:large">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="th_TH">
<meta property="og:site_name" content="${site.name}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#d71920">
<link rel="icon" href="${asset('favicon-32.png')}" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="${asset('apple-touch-icon.png')}">
<script>document.documentElement.classList.add('js')</script>
${googleTag()}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${BODY_FONT}">
<link rel="stylesheet" href="${asset('styles.css')}">
${[...(path === '/' || path === paths.contact ? [localBusiness] : []), ...jsonLd].map(ldScript).join('\n')}
</head>
<body id="top">
${header(active)}
<main id="main">
${body}
</main>
${footer()}
</body>
</html>
`;
}

// Google Analytics 4 + Google Ads, through one gtag.js. Only runs on the live domain, so
// local previews and the github.io copy don't add visits to the reports.
function googleTag() {
  const { ga4, ads, host } = site.analytics;
  return `<script>
(function () {
  if (location.hostname !== ${JSON.stringify(host)}) return;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=${ga4}';
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', '${ga4}');
  gtag('config', '${ads}');
})();
</script>`;
}

const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    '@id': site.origin + '/#business',
    name: site.name,
    url: site.origin + '/',
    telephone: '+66' + site.tel.slice(1),
    openingHours: `Mo-Sa ${site.hours.opens.padStart(5, '0')}-${site.hours.closes.padStart(5, '0')}`,
    image: site.origin + '/assets/logo.png',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.area,
      addressRegion: site.address.city,
      postalCode: site.address.postcode,
      addressCountry: 'TH',
    },
    areaServed: 'กรุงเทพมหานคร',
    hasMap: site.maps,
    sameAs: [site.facebook, site.maps],
};

function pageHead(title, crumbs, lead = '') {
  const trail = [['หน้าแรก', '/'], ...crumbs]
    .map(([label, href], i, all) =>
      i === all.length - 1 ? `<li aria-current="page">${label}</li>` : `<li><a href="${href}">${label}</a></li>`,
    )
    .join('');
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [['หน้าแรก', '/'], ...crumbs].map(([name, href], i) => ({
      '@type': 'ListItem', position: i + 1, name, ...(href ? { item: site.origin + href } : {}),
    })),
  };
  return `${ldScript(ld)}
<section class="pagehead">
  <div class="wrap">
    <nav class="crumbs" aria-label="breadcrumb"><ol>${trail}</ol></nav>
    <h1>${title}</h1>
    ${lead ? `<p class="pagehead__lead">${lead}</p>` : ''}
  </div>
</section>`;
}

// Byline on stories and the title of the author archive (/author/jack/).
const authorName = `อู่ ${site.name}`;

const postMeta = (p) => `
<ul class="meta">
  <li>${icon('folder')}หมวด ${p.cats.map((c) => `<a href="${categories[c].path}">${categories[c].name}</a>`).join(', ')}</li>
  <li>${icon('calendar')}<time datetime="${p.date}">${p.dateTh}</time></li>
  <li>${icon('user')}โดย <a href="${paths.author}">${authorName}</a></li>
</ul>`;

const postCard = (p, i) => `
<article class="post">
  <a class="post__img" href="${p.path}" tabindex="-1" aria-hidden="true">${tile(p.icon, i, p.title, postPics(p)[0])}</a>
  <div class="post__body">
    <h3 class="post__title"><a href="${p.path}">${p.title}</a></h3>
    ${postMeta(p)}
    <p>${esc(p.lead)}</p>
    <a class="btn btn--small" href="${p.path}">อ่านต่อ ${icon('arrow')}</a>
  </div>
</article>`;

// Photo card: the whole card is one link; the summary slides up on hover.
const serviceCard = (s) => `
<a class="svc" href="${s.path}">
  <span class="svc__img" aria-hidden="true">${tile(s.icon, 1, s.name, svcPic[s.key])}</span>
  <span class="svc__ico">${icon(s.icon)}</span>
  <span class="svc__row"><h2 class="svc__title">${s.name}</h2><span class="svc__go">${icon('arrow')}</span></span>
  <p class="svc__text">${s.summary}</p>
</a>`;

const productsCard = () => `
  <section class="card">
    <h2 class="card__h">ผลิตภัณฑ์ที่ใช้</h2>
    <ul class="products">
      <li>${icon('drop')}<span><b>น้ำมันเครื่องคุณภาพสูง</b>สังเคราะห์แท้ตามสเปคผู้ผลิต</span></li>
      <li>${icon('gear')}<span><b>อะไหล่แท้ / เทียมคุณภาพ</b>มีทั้งของใหม่และมือสองแท้ เลือกได้</span></li>
      <li>${icon('chip')}<span><b>เครื่องมือวิเคราะห์คอมพิวเตอร์</b>ตรวจเช็คระบบไฟฟ้าทั้งคัน</span></li>
    </ul>
    ${banners.length ? `<div class="banners">${banners.map((b) => img(b, 'ผลิตภัณฑ์ที่ใช้ในอู่ J SPEED SERVICE', '', '200px')).join('')}</div>` : ''}
  </section>`;

// Home: the products the shop uses, with the brand banners shown at their own size
// (they are only 270 px wide, so they are never stretched).
const brandName = (b) => (/acdelco/i.test(b.file) ? 'ACDelco' : /voltronic/i.test(b.file) ? 'Voltronic' : '');
const brandNote = { ACDelco: 'ผลิตภัณฑ์ดูแลรถยนต์', Voltronic: 'Motor oil & lubricants' };
const brandsSection = () => `
<section class="section" aria-labelledby="brands-h">
  <div class="wrap brands-sec">
    <div class="brands-sec__copy">
      <p class="eyebrow">Products</p>
      <h2 class="section-title" id="brands-h">แบรนด์และอุปกรณ์ที่เราใช้</h2>
      <p class="section-lead">เลือกใช้ผลิตภัณฑ์และอะไหล่คุณภาพ ตรงตามสเปคผู้ผลิต เพื่อให้รถของคุณกลับมาวิ่งได้อย่างมั่นใจ</p>
      <ul class="checks">
        <li>${icon('check')}<span><b>น้ำมันเครื่องคุณภาพสูง</b>สังเคราะห์แท้ตามสเปคผู้ผลิต</span></li>
        <li>${icon('check')}<span><b>อะไหล่แท้ / เทียมคุณภาพ</b>มีทั้งของใหม่และมือสองแท้ เลือกได้</span></li>
        <li>${icon('check')}<span><b>เครื่องมือวิเคราะห์คอมพิวเตอร์</b>ตรวจเช็คระบบไฟฟ้าทั้งคัน</span></li>
      </ul>
    </div>
    <div class="brands-sec__cards">
      ${banners
        .map((b) => {
          const name = brandName(b);
          return `<figure class="brand-tile">${img(b, `ผลิตภัณฑ์ ${name} ที่ใช้ในอู่ J SPEED SERVICE`, '', '240px')}<figcaption><b>${name}</b>${brandNote[name] ?? ''}</figcaption></figure>`;
        })
        .join('')}
    </div>
  </div>
</section>`;

// Red info card: big title, a bold line, a small line and a large faded icon.
// `tag` is the element (section in sidebars, li in lists); with `href` the whole card is a link.
// `light` gives a grey information card; red is kept for cards you act on (call).
const infoCard = ({ tag = 'section', h = 'h2', title, lead, text, ico, href, light = false }) => {
  const cls = `infocard${light ? ' infocard--light' : ''}`;
  const body = `<${h} class="infocard__title">${title}</${h}><p class="infocard__lead">${lead}</p><p>${text}</p>${icon(ico, 'infocard__ico')}`;
  return href
    ? `<${tag}><a class="${cls}" href="${href}">${body}</a></${tag}>`
    : `<${tag} class="${cls}">${body}</${tag}>`;
};
const hoursInfo = { title: 'เวลาทำการ', lead: site.hours.days, text: site.hours.time, ico: 'clock' };
const hoursCard = () => infoCard(hoursInfo);

const sidebar = () => `
<aside class="sidebar">
  <section class="card card--about">
    <h2 class="card__h">เกี่ยวกับเรา</h2>
    <h3>อู่ J SPEED SERVICE มีประสบการณ์ และความชำนาญบริการซ่อมรถยุโรป MINI, BMW, BENZ ทุกรุ่น</h3>
    <p>เราให้บริการซ่อมเครื่อง เกียร์ เบรค คลัช ช่วงล่าง ระบบแอร์ รวมทั้งระบบไฟโดยใช้เครื่องคอมพิวเตอร์ตรวจเช็คระบบไฟฟ้าต่างๆภายในรถยนต์ ให้บริการราคาถูก รับประกันคุณภาพงานซ่อม</p>
    <h3 class="card__note">${icon('tow')}นอกจากนี้เรายังมีบริการ รับส่งรถ นอกสถานที่ และมีบริการรถยกสไลด์ทั่วประเทศไทย 24 ชม.</h3>
    <a class="btn btn--small" href="${paths.about}">รู้จักเรามากขึ้น ${icon('arrow')}</a>
  </section>
  ${productsCard()}
  ${hoursCard()}
</aside>`;

// `info: false` where the page already lists the contact details (the contact page).
const mapSection = ({ info = true } = {}) => `
<section class="mapsec" aria-labelledby="map-h">
  <div class="wrap">
    <p class="eyebrow">Location</p>
    <div class="head head--inline mapsec__head">
      <h2 class="section-title" id="map-h">เดินทางมาที่อู่</h2>
      <p class="mapsec__addr">${icon('pin')}<span>${addressText}</span></p>
      <a class="btn btn--outline" href="${site.maps}" target="_blank" rel="noopener">${icon('pin')}เปิดใน Google Maps</a>
    </div>
    <div class="mapsec__box">
      <div class="mapsec__frame">
      <iframe title="แผนที่ ${site.name}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" data-map
        data-q="${esc(site.mapQuery)}" data-z="13"
        src="https://maps.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&z=13&output=embed"></iframe>
      <div class="mapctl">
        <div class="mapctl__panel" id="mapctl-panel" hidden>
          <button type="button" data-map-act="in" aria-label="ซูมเข้า">${icon('plus')}</button>
          <button type="button" data-map-act="out" aria-label="ซูมออก">${icon('minus')}</button>
          <button type="button" data-map-act="type" aria-label="สลับแผนที่ / ดาวเทียม" aria-pressed="false">${icon('layers')}</button>
          <button type="button" data-map-act="full" aria-label="เต็มจอ">${icon('expand')}</button>
        </div>
        <button class="mapctl__toggle" type="button" aria-expanded="false" aria-controls="mapctl-panel" aria-label="Map camera controls" title="ควบคุมแผนที่">${icon('move')}</button>
      </div>
      </div>
    </div>
    ${info ? `<ul class="mapsec__info">
      ${infoCard({ ...hoursInfo, tag: 'li', h: 'h3', light: true })}
      ${infoCard({ tag: 'li', h: 'h3', title: 'โทรนัดคิว', lead: site.phone, text: 'โทรปรึกษาช่างและนัดเวลาเข้าซ่อม', ico: 'phone', href: `tel:${site.tel}` })}
      ${infoCard({ tag: 'li', h: 'h3', title: 'รถยกสไลด์ 24 ชม.', lead: 'ทั่วประเทศไทย', text: 'บริการรับส่งรถนอกสถานที่', ico: 'tow', light: true })}
    </ul>` : ''}
  </div>
</section>`;

const ctaBand = () => `
<section class="cta">
  <div class="wrap cta__in">
    <div>
      <h2>รถมีอาการผิดปกติ? ปรึกษาช่างได้ทันที</h2>
      <p>ตรวจเช็คด้วยคอมพิวเตอร์ แจ้งราคาก่อนซ่อม รับประกันงานซ่อม</p>
    </div>
    ${callButton('btn btn--white btn--lg')}
  </div>
</section>`;

// ---------- pages ----------

const pages = [];
const add = (p) => pages.push(p);

// Home
add({
  path: paths.home,
  active: 'home',
  body: `
<section class="hero">
  <div class="wrap">
    <h1 class="hero__title display" data-reveal>J SPEED <span>SERVICE</span></h1>
    <div class="hero__top">
      <p class="hero__lead" data-reveal>บริการซ่อมรถยนต์ยุโรป มินิคูเปอร์ บีเอ็ม เบนซ์ ทุกรุ่น ด้วยเครื่องมือเทคโนโลยีทันสมัย มาตรฐานครบวงจร ซ่อมเครื่องยนต์ ระบบเกียร์ ช่วงล่าง เบรค คลัช แอร์ เปลี่ยนถ่ายน้ำมันเครื่อง เช็คระบบไฟฟ้าทั้งคัน</p>
      <div class="hero__cta" data-reveal>
        ${callButton('btn btn--lg')}
        <a class="btn btn--outline btn--lg" href="${paths.services}">ดูบริการของเรา ${icon('arrow')}</a>
      </div>
    </div>
    <div class="hero__panel" data-reveal>
      <ul class="stats">
        <li><b class="display">24<small>ชม.</small></b><span>รถยกสไลด์ รับส่งรถทั่วประเทศ</span></li>
        <li><b class="display stats__wide">MINI<small>·</small>BMW<small>·</small>BENZ</b><span>รถยุโรปทุกรุ่น ทุกระบบ</span></li>
        <li><b class="display">${site.hours.opens}<small>น.</small></b><span>เปิด${site.hours.days} ถึง ${site.hours.closes} น.</span></li>
      </ul>
      <div class="hero__media">
        ${workPics[5] ? img(workPics[5], 'ช่างกำลังซ่อมรถในอู่ J SPEED SERVICE', '', '(max-width: 900px) 100vw, 800px').replace(' loading="lazy"', ' fetchpriority="high"') : ''}
        <p class="hero__badge">${icon('chip')}<span><b>วิเคราะห์ด้วยคอมพิวเตอร์</b>แจ้งสาเหตุและราคาก่อนซ่อม</span></p>
      </div>
    </div>
  </div>
</section>
<section class="section section--tint" aria-labelledby="svc-h">
  <div class="wrap">
    <div class="head head--wide">
      <div>
        <p class="eyebrow">Our services</p><h2 class="section-title" id="svc-h">บริการของเรา</h2>
        <p>ซ่อมและดูแลรถยุโรป MINI · BMW · BENZ ครบทุกระบบ โดยทีมช่างเฉพาะทาง ตรวจเช็คด้วยคอมพิวเตอร์ รับประกันงานซ่อม</p>
      </div>
    </div>
    <div class="svc-grid">${services.map(serviceCard).join('')}</div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="about-band">
      <div class="about-band__img">${tile('car', 0, 'ภายในอู่ J SPEED SERVICE', workPics[0])}</div>
      <div>
        <p class="eyebrow">About us</p>
        <h2>อู่ J SPEED SERVICE ประสบการณ์ซ่อมรถยุโรป MINI · BMW · BENZ ทุกรุ่น</h2>
        <p>เราให้บริการซ่อมเครื่อง เกียร์ เบรค คลัช ช่วงล่าง ระบบแอร์ รวมทั้งระบบไฟโดยใช้เครื่องคอมพิวเตอร์ตรวจเช็คระบบไฟฟ้าต่างๆภายในรถยนต์ ให้บริการราคาถูก รับประกันคุณภาพงานซ่อม</p>
        <ul class="about-band__list">
          <li>${icon('check')}อะไหล่แท้ เทียมคุณภาพ และมือสองแท้ เลือกได้</li>
          <li>${icon('check')}รับส่งรถนอกสถานที่ และรถยกสไลด์ 24 ชม.</li>
        </ul>
        <a class="btn btn--white" href="${paths.about}">รู้จักเรามากขึ้น ${icon('arrow')}</a>
      </div>
    </div>
  </div>
</section>
<section class="section section--tint">
  <div class="wrap why">
    <div class="why__card">
      <h2 class="why__tab">ทำไมต้อง J SPEED</h2>
      <h2 class="section-title">J SPEED SERVICE อู่ซ่อมรถยุโรป MINI BMW BENZ โดยทีมงานมืออาชีพ</h2>
      <p>บริการซ่อมระบบไฮบริด (Hybrid) เปลี่ยนแบตเตอรี่ไฮบริด ตรวจเช็ค inverter และระบบไฟฟ้าต่างๆ และซ่อมงานทั่วไป ตั้งแต่หลังคา (เปิด-ปิดไม่ได้), เซนทรัลล็อค, รางกระจกเสีย, ทำสี, ใส่ชุดแต่ง ฯลฯ</p>
      <div class="why__cols">
        <div><h3>${icon('chip')}ตรวจถูกจุด</h3><p>วิเคราะห์ปัญหาด้วยคอมพิวเตอร์ก่อนซ่อมทุกครั้ง</p></div>
        <div><h3>${icon('shield')}รับประกันงาน</h3><p>รับประกันงานซ่อม ให้ลูกค้าสบายใจ</p></div>
        <div><h3>${icon('tow')}บริการถึงที่</h3><p>รถยกสไลด์ทั่วประเทศไทย 24 ชม.</p></div>
      </div>
    </div>
    <div class="why__media">${tile('car', 2, 'งานซ่อมในอู่ J SPEED SERVICE', workPics[2])}</div>
  </div>
</section>
<section class="section" aria-labelledby="posts-h">
  <div class="wrap">
    <p class="eyebrow">Repair stories</p>
    <div class="head head--inline">
      <h2 class="section-title" id="posts-h">งานซ่อมล่าสุด</h2>
      <a class="btn btn--outline" href="${categories.mini.path}">ดูงานซ่อมทั้งหมด ${icon('arrow')}</a>
    </div>
    <div class="post-grid post-grid--3">${posts.slice(0, 6).map(postCard).join('')}</div>
  </div>
</section>
<section class="section section--tint" aria-labelledby="gal-h">
  <div class="wrap">
    <div class="head"><div><p class="eyebrow">Gallery</p><h2 class="section-title" id="gal-h">บรรยากาศในอู่</h2></div></div>
    <div class="gallery gallery--mosaic">
      ${homeGallery.map((p, i) => tile('car', i, 'บรรยากาศในอู่ J SPEED SERVICE', p, '(max-width: 900px) 50vw, 25vw')).join('')}
    </div>
  </div>
</section>
${brandsSection()}
${mapSection()}`,
});

// About
add({
  path: paths.about,
  title: 'เกี่ยวกับเรา',
  seoTitle: 'เกี่ยวกับอู่ซ่อมรถยุโรป MINI BMW Benz ทุกรุ่น',
  active: 'about',
  description: 'รู้จักอู่ J SPEED SERVICE อู่ซ่อมรถยุโรป มินิคูเปอร์ บีเอ็ม เบนซ์ ทุกรุ่น ย่านบึงกุ่ม รามอินทรา ตรวจเช็คด้วยระบบคอมพิวเตอร์ ซ่อมเครื่อง เกียร์ ช่วงล่าง แอร์ และระบบไฟ รับประกันงานซ่อม',
  body: `
${pageHead('เกี่ยวกับเรา', [['เกี่ยวกับเรา']])}
<section class="section">
  <div class="wrap about-intro">
    <div>
      <h2 class="section-title">อู่ J SPEED SERVICE</h2>
      <p class="section-lead">บริการซ่อมรถยนต์ยุโรป มินิคูเปอร์ บีเอ็ม เบนซ์ ทุกรุ่น ด้วยเครื่องมือเทคโนโลยีทันสมัย มาตรฐานครบวงจร ตรวจเช็คด้วยระบบคอมพิวเตอร์ ลบไฟและเดินระบบไฟใหม่</p>
      <p>เราให้บริการซ่อมเครื่อง เกียร์ เบรค คลัช ช่วงล่าง ระบบแอร์ รวมทั้งระบบไฟโดยใช้เครื่องคอมพิวเตอร์ตรวจเช็คระบบไฟฟ้าต่างๆภายในรถยนต์ ให้บริการราคาถูก รับประกันคุณภาพงานซ่อม นอกจากนี้เรายังมีบริการ รับส่งรถ นอกสถานที่ และมีบริการรถยกสไลด์ทั่วประเทศไทย 24 ชม.</p>
    </div>
    <ul class="facts">
      <li>${icon('chip')}<span><b>วิเคราะห์ด้วยคอมพิวเตอร์</b>หาสาเหตุให้ถูกจุดก่อนซ่อม</span></li>
      <li>${icon('shield')}<span><b>รับประกันงานซ่อม</b>ให้ลูกค้าสบายใจ</span></li>
      <li>${icon('tow')}<span><b>รถยกสไลด์ 24 ชม.</b>ทั่วประเทศไทย</span></li>
    </ul>
  </div>
</section>
<section class="section section--dark">
  <div class="wrap">
    <h2 class="section-title">บริการ <span class="accent">ของเรา</span></h2>
    <div class="work-grid">
      ${aboutWork.map((w, i) => `<figure class="work">${tile(w.icon, i, w.text, workPics[i])}<figcaption>${w.text}</figcaption></figure>`).join('')}
    </div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <h2 class="section-title section-title--sm">ยี่ห้อที่เราเชี่ยวชาญ</h2>
    <div class="brands">
      ${brandPages
        .map(
          ({ path: href, short: name, pic, logo }) =>
            `<a class="brandcard" href="${href}">${pic ? img(pic, name, 'brandcard__img', '120px') : logo ? `<img class="brandcard__img" src="${logo}" width="860" height="600" alt="${name}" loading="lazy" decoding="async">` : `<span class="brandcard__badge">${name}</span>`}<span>ซ่อมรถ ${name} ทุกรุ่น ${icon('arrow')}</span></a>`,
        )
        .join('')}
    </div>
  </div>
</section>
${ctaBand()}`,
});

// Routine servicing: a block on the first services page (not a service card of its own).
const maintenanceBlock = () => `
<section class="card maint" aria-labelledby="maint-h">
  <div><h2 class="section-title section-title--sm" id="maint-h">${maintenance.title}</h2><p>${maintenance.lead}</p></div>
  <ul class="checks">${maintenance.items.map((m) => `<li>${icon('check')}<span><b>${m.h}</b>${m.text}</span></li>`).join('')}</ul>
</section>`;

// Services listing (3 pages, like the old site's pagination)
const servicePageUrls = [paths.services, '/%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3/page/2/', '/%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3/page/3/'];
servicePageUrls.forEach((url, pageIndex) => {
  const rest = pool.filter((p) => catOf(p) !== 'car' && !servicePics.some((q) => q.src === p.src));
  const pagePics = [servicePics, rest.slice(0, 24), rest.slice(24, 48)][pageIndex];
  const items = pagePics.length
    ? pagePics.map((p) => ({ ...services.find((s) => s.key === catOf(p)), photo: p }))
    : Array.from({ length: 12 }, (_, i) => services[i % services.length]);
  add({
    path: url,
    title: pageIndex ? `บริการ – หน้า ${pageIndex + 1}` : 'บริการ',
    seoTitle: `บริการซ่อมรถยุโรป MINI BMW Benz${pageIndex ? ` – หน้า ${pageIndex + 1}` : ''}`,
    active: 'services',
    description: `บริการซ่อมรถยุโรป มินิคูเปอร์ บีเอ็ม เบนซ์ ทุกรุ่น: ซ่อมเครื่องยนต์ ระบบเกียร์ ช่วงล่าง แอร์และระบบไฟฟ้า ตรวจเช็คด้วยคอมพิวเตอร์ แจ้งราคาก่อนซ่อม โทร ${site.phone}${pageIndex ? ` (หน้า ${pageIndex + 1})` : ''}`,
    body: `
${pageHead('บริการ', [['บริการ']])}
<section class="section">
  <div class="wrap">
    <div class="svc-links">
      ${services
        .map(
          (s) => `<a class="svc-link" href="${s.path}">${icon(s.icon)}<span><b>${s.pageName ?? s.name}</b>${s.summary.slice(0, 60)}…</span></a>`,
        )
        .join('')}
    </div>
    ${pageIndex ? '' : maintenanceBlock()}
    <div class="filters" role="toolbar" aria-label="หมวดหมู่ผลงาน">
      <span class="filters__label">CATEGORIES:</span>
      <button class="filter is-active" type="button" data-filter="all" aria-pressed="true">SHOW ALL</button>
      ${services.map((s) => `<button class="filter" type="button" data-filter="${s.key}" aria-pressed="false">${s.category}</button>`).join('')}
    </div>
    <div class="gallery gallery--3" data-gallery>
      ${items.map((s, i) => `<a class="gitem" data-cat="${s.key}" href="${s.path}">${tile(s.icon, i, s.name, s.photo)}<span class="gitem__cap">${s.pageName ?? s.name}</span></a>`).join('')}
    </div>
    <nav class="pager" aria-label="หน้า">
      ${servicePageUrls.map((u, i) => (i === pageIndex ? `<span aria-current="page">${i + 1}</span>` : `<a href="${u}">${i + 1}</a>`)).join('')}
    </nav>
  </div>
</section>`,
  });
});

// One page per service
for (const s of services) {
  const name = s.pageName ?? s.name;
  add({
    path: s.path,
    title: name,
    seoTitle: `${name} รถยุโรป MINI BMW Benz`,
    active: 'services',
    description: `${name} รถยุโรป MINI BMW Benz: ${s.symptoms.slice(0, 2).join(' · ')} แจ้งราคาก่อนซ่อม โทร ${site.phone}`,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `${name} รถยุโรป MINI BMW Benz`,
      serviceType: name,
      description: [s.body[0], ...s.sections.map((x) => x.h)].join(' '),
      provider: { '@id': site.origin + '/#business' },
      areaServed: 'กรุงเทพมหานคร',
      url: site.origin + s.path,
    }],
    body: `
${pageHead(name, [['บริการ', paths.services], [name]])}
<section class="section">
  <div class="wrap with-sidebar">
    <div class="content">
      <div class="prose">
        ${s.body.map((p) => `<p>${p}</p>`).join('')}
        ${s.sections.map((x) => `<h3>${x.h}</h3><p>${x.text}</p>`).join('')}
      </div>
      <h2 class="section-title section-title--sm">อาการที่ควรนำรถเข้าเช็ค</h2>
      <ul class="checks symptoms">${s.symptoms.map((x) => `<li>${icon('check')}<span>${x}</span></li>`).join('')}</ul>
      <h2 class="section-title section-title--sm">งานที่เราดูแล</h2>
      <ul class="chips">${s.points.map((p) => `<li>${icon('check')}${p}</li>`).join('')}</ul>
      <div class="gallery gallery--3">
        ${(picsFor(s).length ? picsFor(s) : Array(9).fill(null)).map((p, i) => tile(s.icon, i, `${name} – ภาพงานซ่อม`, p)).join('')}
      </div>
    </div>
    <aside class="sidebar">
      <section class="card">
        <h2 class="card__h">บริการอื่นๆ</h2>
        <ul class="sidelinks">${services.map((o) => `<li${o === s ? ' class="is-active"' : ''}><a href="${o.path}">${icon(o.icon)}${o.pageName ?? o.name}</a></li>`).join('')}</ul>
      </section>
      ${hoursCard()}
    </aside>
  </div>
</section>
${ctaBand()}`,
  });
}

// Contact
add({
  path: paths.contact,
  title: 'ติดต่อ อู่ซ่อมรถมินิ MINI BMW BENZ',
  seoTitle: 'ติดต่อ แผนที่อู่ ซอยคลองลำเจียก 41 บึงกุ่ม',
  active: 'contact',
  description: `ติดต่อ J SPEED SERVICE อู่ซ่อมรถยุโรป MINI BMW BENZ ${addressText} โทร ${site.phone} ${site.hours.days} ${site.hours.opens} - ${site.hours.closes} น.`,
  body: `
${pageHead('ติดต่อเรา', [['ติดต่อเรา']], 'อู่ซ่อมรถยุโรป MINI, BMW, BENZ โดยทีมงานมืออาชีพ')}
<section class="section">
  <div class="wrap contact-grid">
    <a class="contact-card contact-card--accent" href="tel:${site.tel}">${icon('phone')}<span><b>โทรหาเรา</b><span class="contact-card__num">${site.phone}</span></span></a>
    <div class="contact-card">${icon('clock')}<span><b>เวลาทำการ</b>${site.hours.days}<br>${site.hours.opens} - ${site.hours.closes} น.</span></div>
    <a class="contact-card" href="${site.facebook}" target="_blank" rel="noopener">${facebookIcon}<span><b>Facebook</b>facebook.com/jspeedservice</span></a>
    <div class="contact-card">${icon('tow')}<span><b>รถยกสไลด์ 24 ชม.</b>รับส่งรถนอกสถานที่ทั่วประเทศไทย</span></div>
  </div>
</section>
${mapSection({ info: false })}`,
});

// Repair stories
const summaryRows = [['problem', 'อาการ'], ['fix', 'วิธีแก้'], ['result', 'ผลลัพธ์'], ['tip', 'คำแนะนำ']];
const storySummary = (s) => `
<dl class="card summary">${summaryRows.filter(([k]) => s[k]).map(([k, label]) => `<div><dt>${label}</dt><dd>${esc(s[k])}</dd></div>`).join('')}</dl>`;
posts.forEach((p, i) => {
  // Two neighbouring stories from the same category (the next older ones, wrapping around).
  const same = posts.filter((o) => o.cats[0] === p.cats[0]);
  const at = same.indexOf(p);
  const others = [1, 2].map((d) => same[(at + d) % same.length]).filter((o) => o !== p);
  const [cover, ...more] = postPics(p);
  add({
    path: p.path,
    title: p.title,
    active: '',
    type: 'article',
    description: `${clip(p.summary ? `${p.summary.problem} ${p.summary.fix}` : p.body.join(' '), 100)} ซ่อมโดย J SPEED SERVICE อู่ซ่อมรถยุโรป MINI BMW Benz บึงกุ่ม โทร ${site.phone}`,
    image: cover && (cover.full ?? cover).src,
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: p.title.slice(0, 110),
      datePublished: p.date,
      inLanguage: 'th',
      mainEntityOfPage: site.origin + p.path,
      ...(cover ? { image: [cover, ...more].map((x) => site.origin + (x.full ?? x).src) } : {}),
      author: { '@type': 'Organization', name: site.name, url: site.origin + '/' },
      publisher: { '@type': 'Organization', name: site.name, logo: { '@type': 'ImageObject', url: `${site.origin}/assets/logo.png` } },
    }],
    body: `
${pageHead(p.title, [[categories[p.cats[0]].name, categories[p.cats[0]].path], [p.title]])}
<section class="section">
  <div class="wrap with-sidebar">
    <article class="content">
      ${postMeta(p)}
      <div class="article__img">${tile(p.icon, i, p.title, cover, '(max-width: 1100px) 100vw, 800px')}</div>
      ${p.summary ? storySummary(p.summary) : ''}
      <div class="prose">
        ${p.body.map((t) => `<p>${esc(t)}</p>`).join('\n        ')}
        <p>หากรถของคุณมีอาการคล้ายกัน ทีมช่าง J SPEED SERVICE พร้อมตรวจเช็คด้วยเครื่องคอมพิวเตอร์ แจ้งสาเหตุและราคาก่อนซ่อม และรับประกันงานซ่อมทุกงาน</p>
      </div>
      ${more.length ? `<div class="gallery gallery--3 article__gallery">${more.map((x, k) => tile(p.icon, k, `${p.title} – ภาพที่ ${k + 2}`, x, '(max-width: 600px) 50vw, 260px')).join('')}</div>` : ''}
      ${callButton('btn btn--call')}
      <h2 class="section-title section-title--sm">งานซ่อมอื่นๆ</h2>
      <div class="post-grid">${others.map(postCard).join('')}</div>
    </article>
    ${sidebar()}
  </div>
</section>`,
  });
});

// Category & author archives, 9 stories per page: <path>, <path>page/2/, ... like the old site.
const PER_PAGE = 9;
const archive = (path, title, list, crumbs, seoTitle = title) => {
  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const url = (n) => (n === 1 ? path : `${path}page/${n}/`);
  for (let n = 1; n <= pageCount; n++) {
    const pager =
      pageCount > 1
        ? `<nav class="pager" aria-label="หน้า">${Array.from({ length: pageCount }, (_, k) => (k + 1 === n ? `<span aria-current="page">${k + 1}</span>` : `<a href="${url(k + 1)}">${k + 1}</a>`)).join('')}</nav>`
        : '';
    add({
      path: url(n),
      title: n === 1 ? title : `${title} – หน้า ${n}`,
      seoTitle: n === 1 ? seoTitle : `${seoTitle} – หน้า ${n}`,
      active: '',
      description: `${seoTitle}: รวมเคสซ่อมจริงของรถยุโรป MINI BMW Benz ที่อู่ J SPEED SERVICE บึงกุ่ม อาการ สาเหตุ และวิธีแก้ ${n > 1 ? `(หน้า ${n})` : `โทร ${site.phone}`}`,
      body: `
${pageHead(title, crumbs)}
<section class="section">
  <div class="wrap with-sidebar">
    <div class="content"><div class="post-grid">${list.slice((n - 1) * PER_PAGE, n * PER_PAGE).map(postCard).join('')}</div>${pager}</div>
    ${sidebar()}
  </div>
</section>`,
    });
  }
};
for (const [key, c] of Object.entries(categories)) {
  const seo = { mini: 'งานซ่อม MINI Cooper เคสซ่อมจริง', other: 'งานซ่อมรถยุโรป BMW Benz และ MINI อื่นๆ' }[key];
  archive(c.path, c.name, posts.filter((p) => p.cats.includes(key)), [[c.name]], seo);
}
archive(paths.author, authorName, posts, [[authorName]], 'รวมงานซ่อมรถยุโรป MINI BMW Benz ทั้งหมด');

// Brand pages (/team-view/mini/ and /bmw/ are old addresses; /benz/ is new)
for (const { path, name: brand } of brandPages) {
  add({
    path,
    title: brand,
    seoTitle: `อู่ซ่อม ${brand} ทุกรุ่น บึงกุ่ม รามอินทรา`,
    active: 'about',
    description: `อู่ซ่อมรถ ${brand} ทุกรุ่น J SPEED SERVICE บึงกุ่ม ซ่อมเครื่องยนต์ เกียร์ ช่วงล่าง เบรค แอร์และระบบไฟฟ้า ตรวจเช็คด้วยคอมพิวเตอร์ รับประกันงานซ่อม โทร ${site.phone}`,
    body: `
${pageHead(brand, [['เกี่ยวกับเรา', paths.about], [brand]])}
<section class="section">
  <div class="wrap">
    <div class="prose">
      <p>อู่ J SPEED SERVICE มีประสบการณ์ และความชำนาญบริการซ่อมรถ ${brand} ทุกรุ่น ทั้งเครื่องยนต์ เกียร์ ช่วงล่าง เบรค คลัช ระบบแอร์ และระบบไฟฟ้า ตรวจเช็คด้วยเครื่องคอมพิวเตอร์ รับประกันงานซ่อม</p>
    </div>
    <div class="svc-grid svc-grid--light">${services.map(serviceCard).join('')}</div>
  </div>
</section>
${ctaBand()}`,
  });
}

// ---------- write ----------

// Every page address the old site linked to. The build fails if any is missing.
const legacyLinks = [
  '/',
  paths.about,
  paths.services,
  '/%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3/page/2/',
  '/%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3/page/3/',
  '/%e0%b8%9a%e0%b8%a3%e0%b8%b4%e0%b8%81%e0%b8%b2%e0%b8%a3/%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1%e0%b9%80%e0%b8%84%e0%b8%a3%e0%b8%b7%e0%b9%88%e0%b8%ad%e0%b8%87%e0%b8%a2%e0%b8%99%e0%b8%95%e0%b9%8c/',
  '/%e0%b8%9a%e0%b8%a3%e0%b8%b4%e0%b8%81%e0%b8%b2%e0%b8%a3/%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1%e0%b8%a3%e0%b8%b0%e0%b8%9a%e0%b8%9a%e0%b9%80%e0%b8%81%e0%b8%b5%e0%b8%a2%e0%b8%a3%e0%b9%8c/',
  '/%e0%b8%9a%e0%b8%a3%e0%b8%b4%e0%b8%81%e0%b8%b2%e0%b8%a3/%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1%e0%b8%8a%e0%b9%88%e0%b8%a7%e0%b8%87%e0%b8%a5%e0%b9%88%e0%b8%b2%e0%b8%87/',
  '/%e0%b8%9a%e0%b8%a3%e0%b8%b4%e0%b8%81%e0%b8%b2%e0%b8%a3/%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1%e0%b8%a3%e0%b8%b0%e0%b8%9a%e0%b8%9a%e0%b9%81%e0%b8%ad%e0%b8%a3%e0%b9%8c%e0%b9%81%e0%b8%a5%e0%b8%b0%e0%b9%84%e0%b8%9f%e0%b8%9f%e0%b9%89%e0%b8%b2/',
  '/%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3/%E0%B8%8B%E0%B9%88%E0%B8%AD%E0%B8%A1%E0%B9%80%E0%B8%84%E0%B8%A3%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B8%A2%E0%B8%99%E0%B8%95%E0%B9%8C/',
  '/%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3/%E0%B8%8B%E0%B9%88%E0%B8%AD%E0%B8%A1%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B9%80%E0%B8%81%E0%B8%B5%E0%B8%A2%E0%B8%A3%E0%B9%8C/',
  '/%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3/%E0%B8%8B%E0%B9%88%E0%B8%AD%E0%B8%A1%E0%B8%8A%E0%B9%88%E0%B8%A7%E0%B8%87%E0%B8%A5%E0%B9%88%E0%B8%B2%E0%B8%87/',
  '/%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3/%E0%B8%8B%E0%B9%88%E0%B8%AD%E0%B8%A1%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A%E0%B9%81%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B9%84%E0%B8%9F%E0%B8%9F%E0%B9%89%E0%B8%B2/',
  '/category/%e0%b8%87%e0%b8%b2%e0%b8%99%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1-mini/',
  '/category/%e0%b8%ad%e0%b8%b7%e0%b9%88%e0%b8%99%e0%b9%86/',
  '/%e0%b8%95%e0%b8%b4%e0%b8%94%e0%b8%95%e0%b9%88%e0%b8%ad-%e0%b8%ad%e0%b8%b9%e0%b9%88%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1%e0%b8%a3%e0%b8%96%e0%b8%a1%e0%b8%b4%e0%b8%99%e0%b8%b4-mini-bmw-benz/',
  '/%e0%b8%ad%e0%b8%b7%e0%b9%88%e0%b8%99%e0%b9%86/j-speed-services/',
  '/%e0%b8%87%e0%b8%b2%e0%b8%99%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1-mini/mini-r56-%e0%b8%84%e0%b8%a7%e0%b8%b2%e0%b8%a1%e0%b8%a3%e0%b9%89%e0%b8%ad%e0%b8%99%e0%b8%82%e0%b8%b6%e0%b9%89%e0%b8%99/',
  '/%e0%b8%87%e0%b8%b2%e0%b8%99%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1-mini/%e0%b9%80%e0%b8%84%e0%b8%a5%e0%b8%a1%e0%b8%9b%e0%b8%a3%e0%b8%b0%e0%b8%81%e0%b8%b1%e0%b8%99%e0%b8%ad%e0%b8%b8%e0%b8%9a%e0%b8%b1%e0%b8%95%e0%b8%b4%e0%b9%80%e0%b8%ab%e0%b8%95%e0%b8%b8/',
  '/%e0%b8%87%e0%b8%b2%e0%b8%99%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1-mini/%e0%b9%80%e0%b8%84%e0%b8%a3%e0%b8%b7%e0%b9%88%e0%b8%ad%e0%b8%87%e0%b9%80%e0%b8%a3%e0%b9%88%e0%b8%87%e0%b9%84%e0%b8%a1%e0%b9%88%e0%b8%ad%e0%b8%ad%e0%b8%81/',
  '/%e0%b8%87%e0%b8%b2%e0%b8%99%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1-mini/%e0%b8%95%e0%b8%a3%e0%b8%a7%e0%b8%88%e0%b9%80%e0%b8%8a%e0%b9%87%e0%b8%84%e0%b8%aa%e0%b8%a0%e0%b8%b2%e0%b8%9e%e0%b8%a3%e0%b8%96/',
  '/%e0%b8%87%e0%b8%b2%e0%b8%99%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1-mini/%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1-mini-cooper-r56/',
  '/%e0%b8%87%e0%b8%b2%e0%b8%99%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1-mini/%e0%b8%9b%e0%b8%b1%e0%b8%8d%e0%b8%ab%e0%b8%b2%e0%b9%80%e0%b8%a3%e0%b8%b7%e0%b9%88%e0%b8%ad%e0%b8%87%e0%b8%a3%e0%b8%b0%e0%b8%9a%e0%b8%9a%e0%b9%80%e0%b8%84%e0%b8%a3%e0%b8%b7%e0%b9%88%e0%b8%ad%e0%b8%87/',
  '/%e0%b8%87%e0%b8%b2%e0%b8%99%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1-mini/mini-%e0%b8%8a%e0%b9%88%e0%b8%a7%e0%b8%87%e0%b8%a5%e0%b9%88%e0%b8%b2%e0%b8%87%e0%b9%80%e0%b8%aa%e0%b8%b5%e0%b8%a2%e0%b8%87%e0%b8%94%e0%b8%b1%e0%b8%87/',
  '/author/jack/',
  '/team-view/bmw/',
  '/team-view/mini/',
];

rmSync(out, { recursive: true, force: true });
const seen = new Set();
for (const p of pages) {
  const dir = fsPath(p.path);
  if (seen.has(dir)) throw new Error(`Two pages share the address ${dir}`);
  seen.add(dir);
  const file = join(out, dir, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  const html = withBase(layout(p));
  writeFileSync(file, html);
  // Photos the page shows (not the logo or icons), listed in the sitemap so Google finds them.
  p.photos = [...new Set([...html.matchAll(/<img[^>]*\ssrc="(\/wp-content\/[^"?]+)"/g)].map((m) => m[1]))];
}

const missing = legacyLinks.filter((u) => !seen.has(fsPath(u)));
if (missing.length) throw new Error(`Old addresses without a page:\n${missing.map(fsPath).join('\n')}`);

// ---------- forwarding pages for the old site's other addresses ----------
// old-addresses.txt (scripts/collect-old-addresses.mjs) lists every page the old WordPress
// site had. Each one the new site has no page for gets a tiny page that sends visitors and
// search engines on to the closest new page (GitHub Pages can't do server redirects).
const pageAt = new Map(pages.map((p) => [fsPath(p.path), p.path])); // decoded folder -> link
const svc = (key) => services.find((s) => s.key === key).path;
const topic = (t) =>
  /เครื่อง/.test(t) ? svc('engine') : /เกียร์/.test(t) ? svc('gear') : /ช่วงล่าง/.test(t) ? svc('suspension') : /แอร์|ไฟฟ้า/.test(t) ? svc('air') : null;
const nearest = (dir) => {
  for (let d = dir; d !== '/'; d = d.replace(/[^/]+\/$/, '')) if (pageAt.has(d)) return pageAt.get(d);
  return '/';
};
const postBases = { '/งานซ่อม-mini/': categories.mini.path, '/อื่นๆ/': categories.other.path };
const OLD_PER_PAGE = 4; // the old category listings showed 4 stories a page
function forwardTarget(old) {
  let m;
  if ((m = old.match(/^(.*\/)attachment\/[^/]+\/$/))) return m[1] === '/หน้าแรก/' ? '/' : nearest(m[1]);
  if ((m = old.match(/^\/portfolio-view\/([^/]+)\//))) return topic(m[1]) ?? paths.services;
  if ((m = old.match(/^\/portfolio_category\/([^/]+)\//))) return topic(m[1]) ?? paths.services;
  if ((m = old.match(/^\/portfolio_tag\/([^/]+)\//)))
    return /bmw/i.test(m[1]) ? paths.teamBmw : topic(m[1]) ?? (/mini|มินิ/i.test(m[1]) ? paths.teamMini : paths.services);
  if ((m = old.match(/^(\/category\/[^/]+\/)page\/(\d+)\/$/))) {
    const n = Math.floor(((Number(m[2]) - 1) * OLD_PER_PAGE) / PER_PAGE) + 1; // page holding the same stories
    const dir = n > 1 ? `${m[1]}page/${n}/` : m[1];
    return pageAt.get(dir) ?? nearest(m[1]);
  }
  if (postBases[old]) return postBases[old];
  return nearest(old.replace(/page\/\d+\/$/, ''));
}
const forwardPage = (to) => {
  const href = esc(base + to);
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>${esc(site.name)} – หน้านี้ย้ายแล้ว</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(site.origin + to)}">
<meta http-equiv="refresh" content="0; url=${href}">
<script>location.replace(${JSON.stringify(base + to)} + location.hash)</script>
</head>
<body><p>หน้านี้ย้ายไปที่ <a href="${href}">${esc(site.origin + to)}</a></p></body>
</html>
`;
};
const oldAddresses = readFileSync(join(root, 'old-addresses.txt'), 'utf8').split('\n').filter(Boolean);
let forwards = 0;
for (const old of oldAddresses) {
  if (pageAt.has(old)) continue; // the new site has this page
  const to = forwardTarget(old);
  if (!pageAt.has(fsPath(to))) throw new Error(`Forward for ${old} points to ${to}, which is not a page`);
  const file = join(out, old, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, forwardPage(to));
  forwards++;
}

// 404, assets, sitemap, robots, custom domain
writeFileSync(
  join(out, '404.html'),
  withBase(layout({
    path: '/404.html',
    title: 'ไม่พบหน้านี้',
    active: '',
    body: `${pageHead('ไม่พบหน้านี้', [['404']], 'หน้าที่คุณค้นหาอาจถูกย้าย ลองเลือกบริการด้านล่าง หรือโทรหาเรา')}
<section class="section"><div class="wrap"><div class="svc-grid svc-grid--light">${services.map(serviceCard).join('')}</div></div></section>${ctaBand()}`,
  }).replace('<head>', '<head>\n<meta name="robots" content="noindex">')),
);
mkdirSync(join(out, 'assets'), { recursive: true });
for (const f of ['styles.css', 'main.js', 'logo.png', 'favicon-32.png', 'apple-touch-icon.png', 'brand-benz.png']) copyFileSync(join(root, 'public', f), join(out, 'assets', f));
// Photos at their old addresses (/wp-content/uploads/...). Full-size originals dropped
// into static/ at the same paths replace these.
cpSync(join(root, 'static'), out, { recursive: true });
copyFileSync(join(root, 'public', 'favicon.ico'), join(out, 'favicon.ico'));
const missingPhotos = photos.filter((p) => !existsSync(join(out, p.src)));
if (missingPhotos.length) throw new Error(`Photos missing from static/:\n${missingPhotos.map((p) => p.src).join('\n')}`);
const noWebp = photos.filter((p) => p.full && !(p.webp?.length && p.webp.every((x) => existsSync(join(out, x.src)))));
if (noWebp.length) throw new Error(`Photos without WebP copies (run node scripts/make-webp.mjs):\n${noWebp.map((p) => p.full.src).join('\n')}`);
// Only repair stories carry a real "last changed" date (their publish date); other pages
// leave it out rather than claim they change on every build.
const postDate = new Map(posts.map((p) => [p.path, p.date]));
writeFileSync(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${pages
    .filter((p) => !p.path.includes('/page/'))
    .map((p) => {
      const date = postDate.get(p.path);
      const imgs = p.photos.map((src) => `<image:image><image:loc>${esc(site.origin + encodeURI(src))}</image:loc></image:image>`).join('');
      return `  <url><loc>${site.origin}${p.path}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}${imgs}</url>`;
    })
    .join('\n')}\n</urlset>\n`,
);
// The old WordPress site published its sitemap at /sitemap_index.xml (and Search Console may
// still have that address), so keep it as an index pointing to the new sitemap.
writeFileSync(
  join(out, 'sitemap_index.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${site.origin}/sitemap.xml</loc></sitemap>\n</sitemapindex>\n`,
);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`);
writeFileSync(join(out, 'CNAME'), 'www.jspeedservice.com\n');
writeFileSync(join(out, '.nojekyll'), '');
if (!existsSync(join(out, 'index.html'))) throw new Error('index.html missing');

console.log(`Built ${pages.length} pages into dist/${base ? ` for ${base}/` : ''} — all ${legacyLinks.length} old addresses present, ${forwards} more forwarded.`);
