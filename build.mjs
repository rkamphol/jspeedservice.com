// Static site generator: writes every page to dist/ at its old address.
// Paths in content.mjs are the old percent-encoded links; each page is written to the
// decoded folder name (e.g. dist/บริการ/index.html), which is how static hosts such as
// GitHub Pages resolve /%e0%b8%9a.../ requests.
import { mkdirSync, rmSync, writeFileSync, copyFileSync, cpSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, paths, services, posts, categories, aboutWork } from './content.mjs';
import { icon, facebookIcon, logoMark } from './icons.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'dist');
const year = new Date().getFullYear();

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fsPath = (p) => decodeURIComponent(p);

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
const homePosts = home.filter((p) => p.w === 300 && p.h === 300);
const banners = home.filter((p) => /banner/.test(p.file));
const homeGallery = home.filter((p) => p.y > 3500 && !/banner/.test(p.file));
const aboutPics = onPage(paths.about).sort(byPos);
const workPics = aboutPics.filter((p) => p.w > 500);
const brandPic = (name) => aboutPics.find((p) => p.file.startsWith(name));
const servicePics = onPage(paths.services).sort(byPos);
const pool = uniq([...servicePics, ...services.flatMap((s) => onPage(s.path)), ...homeSvc]);
const picsFor = (s) => {
  const own = onPage(s.path).sort(byPos);
  return own.length ? own : pool.filter((p) => catOf(p) === s.key);
};
const svcPic = Object.fromEntries(services.map((s, i) => [s.key, homeSvc[i]]));
const postPic = new Map(posts.map((p, i) => [p, homePosts[i]]));

const img = (p, alt, cls = '') =>
  `<img${cls ? ` class="${cls}"` : ''} src="${p.src}" width="${p.w}" height="${p.h}" alt="${esc(alt)}" loading="lazy" decoding="async">`;

const tile = (kind, i = 0, label = '', photo) =>
  photo
    ? `<div class="ph ph--photo">${img(photo, label || 'ภาพงานซ่อม J SPEED SERVICE')}</div>`
    : tileShape(kind, i, label);

const tileShape = (kind, i = 0, label = '') =>
  `<div class="ph ph--${kind} ph--v${i % 4}" role="img" aria-label="${esc(label || 'ภาพงานซ่อม')}">${icon(kind, 'ph__ico')}</div>`;

const callButton = (cls = 'btn btn--call') =>
  `<a class="${cls}" href="tel:${site.tel}">${icon('phone')}<span>โทร ${site.phone}</span></a>`;

function header(active) {
  const item = (key, href, label) =>
    `<li class="menu__item${active === key ? ' is-active' : ''}"><a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a></li>`;
  const sub = [
    ...services.map((s) => `<li><a href="${s.path}">${icon(s.icon)}${s.pageName ?? s.name}</a></li>`),
    `<li><a href="${categories.mini.path}">${icon('car')}${categories.mini.name}</a></li>`,
  ].join('');
  return `
<a class="skip" href="#main">ข้ามไปยังเนื้อหา</a>
<header class="masthead">
  <div class="wrap masthead__in">
    <a class="brand" href="/" aria-label="${site.name} หน้าแรก">${logoMark}<span class="brand__text"><b>J SPEED</b> SERVICE<small>MINI · BMW Specialist</small></span></a>
    <div class="masthead__contact">
      <a class="hotline" href="tel:${site.tel}">${icon('phone')}<span>${site.phone}</span></a>
      <span class="badge24">${icon('tow')}รถยกสไลด์ 24 ชม.</span>
    </div>
  </div>
</header>
<nav class="mainnav" aria-label="เมนูหลัก">
  <div class="wrap mainnav__in">
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu">${icon('menu', 'ico ico--open')}${icon('close', 'ico ico--close')}<span>เมนู</span></button>
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
    ${callButton('nav-call')}
  </div>
</nav>`;
}

function footer() {
  return `
<footer class="footer">
  <div class="wrap">
    <div class="footer__box">
      <div class="footer__grid">
        <div class="footer__brand">
          <a class="brand brand--light" href="/">${logoMark}<span class="brand__text"><b>J SPEED</b> SERVICE<small>MINI · BMW Specialist</small></span></a>
          <p>อู่ซ่อมรถ MINI BMW โดยทีมงานมืออาชีพ ตรวจเช็คด้วยระบบคอมพิวเตอร์ รับประกันงานซ่อม</p>
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
            <li>${icon('phone')}<a href="tel:${site.tel}">${site.phone}</a></li>
            <li>${icon('clock')}<span>${site.hours.days}<br>8:30 - 18:00 น.</span></li>
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
<script src="/assets/main.js" defer></script>`;
}

function layout({ path, title, description, active, body, type = 'website' }) {
  const fullTitle = path === '/' ? `${site.title} | ${site.description}` : `${title} - ${site.title}`;
  const url = site.origin + path;
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="th_TH">
<meta name="theme-color" content="#00529c">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&family=Sarabun:wght@400;500;700;800&display=swap">
<link rel="stylesheet" href="/assets/styles.css">
${path === '/' ? localBusinessJsonLd() : ''}
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

function localBusinessJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: site.name,
    url: site.origin + '/',
    telephone: '+66' + site.tel.slice(1),
    openingHours: 'Mo-Sa 08:30-18:00',
    sameAs: [site.facebook],
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function pageHead(title, crumbs, lead = '') {
  const trail = [['หน้าแรก', '/'], ...crumbs]
    .map(([label, href], i, all) =>
      i === all.length - 1 ? `<li aria-current="page">${label}</li>` : `<li><a href="${href}">${label}</a></li>`,
    )
    .join('');
  return `
<section class="pagehead">
  <div class="wrap">
    <nav class="crumbs" aria-label="breadcrumb"><ol>${trail}</ol></nav>
    <h1>${title}</h1>
    ${lead ? `<p class="pagehead__lead">${lead}</p>` : ''}
  </div>
</section>`;
}

const postMeta = (p) => `
<ul class="meta">
  <li>${icon('folder')}Posted in ${p.cats.map((c) => `<a href="${categories[c].path}">${categories[c].name}</a>`).join(', ')}</li>
  <li>${icon('calendar')}<time datetime="${p.date}">${p.dateTh}</time></li>
  <li>${icon('user')}by <a href="${paths.author}">อู่ซ่อมมินิ</a></li>
</ul>`;

const postCard = (p, i) => `
<article class="post">
  <a class="post__img" href="${p.path}" tabindex="-1" aria-hidden="true">${tile(p.icon, i, p.title, postPic.get(p))}</a>
  <div class="post__body">
    <h3 class="post__title"><a href="${p.path}">${p.title}</a></h3>
    ${postMeta(p)}
    <p>${p.lead}…</p>
    <a class="btn btn--small" href="${p.path}">DETAIL ${icon('arrow')}</a>
  </div>
</article>`;

const serviceCard = (s) => `
<article class="svc">
  <a class="svc__img" href="${s.path}" tabindex="-1" aria-hidden="true">${tile(s.icon, 1, s.name, svcPic[s.key])}</a>
  <div class="svc__body">
    <h2 class="svc__title"><a href="${s.path}">${icon(s.icon)}${s.name}</a></h2>
    <p>${s.summary}</p>
    <a class="svc__more" href="${s.path}">ดูรายละเอียด ${icon('arrow')}</a>
  </div>
</article>`;

const sidebar = () => `
<aside class="sidebar">
  <section class="card card--about">
    <h2 class="card__h">เกี่ยวกับเรา</h2>
    <h3>อู่ J SPEED SERVICE มีประสบการณ์ และความชำนาญบริการซ่อมรถ BMW, MINI ทุกรุ่น</h3>
    <p>เราให้บริการซ่อมเครื่อง เกียร์ เบรค คลัช ช่วงล่าง ระบบแอร์ รวมทั้งระบบไฟโดยใช้เครื่องคอมพิวเตอร์ตรวจเช็คระบบไฟฟ้าต่างๆภายในรถยนต์ ให้บริการราคาถูก รับประกันคุณภาพงานซ่อม</p>
    <h3 class="card__note">${icon('tow')}นอกจากนี้เรายังมีบริการ รับส่งรถ นอกสถานที่ และมีบริการรถยกสไลด์ทั่วประเทศไทย 24 ชม.</h3>
    <a class="btn btn--small" href="${paths.about}">รู้จักเรามากขึ้น ${icon('arrow')}</a>
  </section>
  <section class="card">
    <h2 class="card__h">ผลิตภัณฑ์ที่ใช้</h2>
    <ul class="products">
      <li>${icon('drop')}<span><b>น้ำมันเครื่องคุณภาพสูง</b>สังเคราะห์แท้ตามสเปคผู้ผลิต</span></li>
      <li>${icon('gear')}<span><b>อะไหล่แท้ / เทียมคุณภาพ</b>มีทั้งของใหม่และมือสองแท้ เลือกได้</span></li>
      <li>${icon('chip')}<span><b>เครื่องมือวิเคราะห์คอมพิวเตอร์</b>ตรวจเช็คระบบไฟฟ้าทั้งคัน</span></li>
    </ul>
    ${banners.length ? `<div class="banners">${banners.map((b) => img(b, 'ผลิตภัณฑ์ที่ใช้ในอู่ J SPEED SERVICE')).join('')}</div>` : ''}
  </section>
  <section class="hours">
    <h2>เวลาทำการ</h2>
    <p class="hours__days">${site.hours.days}</p>
    <p>${site.hours.time}</p>
    ${icon('clock', 'hours__ico')}
  </section>
</aside>`;

const mapSection = () => `
<section class="mapsec" aria-label="แผนที่">
  <div class="wrap">
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
      <div class="mapsec__card">
        <h2>${icon('pin')}เดินทางมาที่อู่</h2>
        <p>${site.hours.days}<br>${site.hours.time}</p>
        ${callButton()}
        <a class="btn btn--ghost" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.mapQuery)}" target="_blank" rel="noopener">เปิดใน Google Maps</a>
      </div>
    </div>
  </div>
</section>`;

const ctaBand = () => `
<section class="cta">
  <div class="wrap cta__in">
    <div>
      <h2>รถมีอาการผิดปกติ? ปรึกษาช่างได้ทันที</h2>
      <p>ตรวจเช็คด้วยคอมพิวเตอร์ แจ้งราคาก่อนซ่อม รับประกันงานซ่อม</p>
    </div>
    ${callButton('btn btn--call btn--lg')}
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
  <div class="hero__bg" aria-hidden="true">${workPics[5] ? img(workPics[5], '', 'hero__photo').replace(' loading="lazy"', ' fetchpriority="high"') : ''}</div>
  <div class="wrap hero__in">
    <div class="hero__copy">
      <p class="eyebrow">อู่ซ่อมรถ MINI COOPER · BMW ทุกรุ่น</p>
      <h2 class="hero__title">J SPEED SERVICE</h2>
      <p class="hero__lead">บริการซ่อม รถมินิ MINI COOPER, BMW ทุกรุ่น ด้วยเครื่องมือเทคโนโลยีทันสมัย มาตรฐานครบวงจร ซ่อมเครื่องยนต์ ระบบเกียร์ ช่วงล่าง เบรค คลัช แอร์ เปลี่ยนถ่ายน้ำมันเครื่อง เช็คระบบไฟฟ้าทั้งคัน</p>
      <div class="hero__cta">
        ${callButton('btn btn--call btn--lg')}
        <a class="btn btn--ghost btn--lg" href="${paths.services}">ดูบริการของเรา ${icon('arrow')}</a>
      </div>
    </div>
    <ul class="hero__facts">
      <li>${icon('chip')}<span><b>วิเคราะห์ด้วยคอมพิวเตอร์</b>หาสาเหตุให้ถูกจุดก่อนซ่อม</span></li>
      <li>${icon('shield')}<span><b>รับประกันงานซ่อม</b>อะไหล่แท้ เทียม มือสองแท้ เลือกได้</span></li>
      <li>${icon('tow')}<span><b>รถยกสไลด์ 24 ชม.</b>รับส่งรถนอกสถานที่ทั่วประเทศ</span></li>
    </ul>
  </div>
</section>
<section class="services-strip" aria-label="บริการหลัก">
  <div class="wrap svc-grid">
    ${services.map(serviceCard).join('')}
  </div>
</section>
<section class="home-main">
  <div class="wrap with-sidebar">
    <div class="content">
      <h1 class="section-title">J SPEED SERVICE อู่ซ่อมรถ MINI BMW โดยทีมงานมืออาชีพ</h1>
      <p class="section-lead">บริการซ่อมระบบไฮบริด (Hybrid) เปลี่ยนแบตเตอรี่ไฮบริด ตรวจเช็ค inverter และระบบไฟฟ้าต่างๆ และซ่อมงานทั่วไป ตั้งแต่หลังคา (เปิด-ปิดไม่ได้), เซนทรัลล็อค, รางกระจกเสีย, ทำสี, ใส่ชุดแต่ง ฯลฯ</p>
      <div class="post-grid">${posts.map(postCard).join('')}</div>
      <h2 class="section-title section-title--sm">บรรยากาศในอู่</h2>
      <div class="gallery gallery--mosaic">
        ${homeGallery.map((p, i) => tile('car', i, 'บรรยากาศในอู่ J SPEED SERVICE', p)).join('')}
      </div>
    </div>
    ${sidebar()}
  </div>
</section>
${mapSection()}`,
});

// About
add({
  path: paths.about,
  title: 'เกี่ยวกับเรา',
  active: 'about',
  description: 'อู่ J SPEED SERVICE บริการซ่อมรถ bmw, mini cooper ทุกรุ่น ตรวจเช็คด้วยระบบคอมพิวเตอร์ ลบไฟและเดินระบบไฟใหม่',
  body: `
${pageHead('เกี่ยวกับเรา', [['เกี่ยวกับเรา']])}
<section class="section">
  <div class="wrap about-intro">
    <div>
      <h2 class="section-title">อู่ J SPEED SERVICE</h2>
      <p class="section-lead">บริการซ่อมรถ BMW, MINI COOPER ทุกรุ่น ตรวจเช็คด้วยระบบคอมพิวเตอร์ ลบไฟและเดินระบบไฟใหม่</p>
      <p>เราให้บริการซ่อมเครื่อง เกียร์ เบรค คลัช ช่วงล่าง ระบบแอร์ รวมทั้งระบบไฟโดยใช้เครื่องคอมพิวเตอร์ตรวจเช็คระบบไฟฟ้าต่างๆภายในรถยนต์ ให้บริการราคาถูก รับประกันคุณภาพงานซ่อม นอกจากนี้เรายังมีบริการ รับส่งรถ นอกสถานที่ และมีบริการรถยกสไลด์ทั่วประเทศไทย 24 ชม.</p>
    </div>
    <ul class="hero__facts hero__facts--light">
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
      ${[[paths.teamBmw, 'BMW', brandPic('bmw')], [paths.teamMini, 'MINI', brandPic('mini')]]
        .map(
          ([href, name, pic]) =>
            `<a class="brandcard" href="${href}">${pic ? img(pic, name, 'brandcard__img') : `<span class="brandcard__badge">${name}</span>`}<span>ซ่อมรถ ${name} ทุกรุ่น ${icon('arrow')}</span></a>`,
        )
        .join('')}
    </div>
  </div>
</section>
${ctaBand()}`,
});

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
    active: 'services',
    description: 'บริการซ่อมรถ MINI BMW: ระบบเครื่องยนต์ ระบบเกียร์ ช่วงล่าง ระบบแอร์และระบบไฟฟ้า',
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
    active: 'services',
    description: s.body[0].slice(0, 155),
    body: `
${pageHead(name, [['บริการ', paths.services], [name]])}
<section class="section">
  <div class="wrap with-sidebar">
    <div class="content">
      <div class="prose">${s.body.map((p) => `<p>${p}</p>`).join('')}</div>
      <h2 class="section-title section-title--sm">อาการที่เราดูแล</h2>
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
      <section class="hours">
        <h2>เวลาทำการ</h2>
        <p class="hours__days">${site.hours.days}</p>
        <p>${site.hours.time}</p>
        ${icon('clock', 'hours__ico')}
      </section>
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
  active: 'contact',
  description: `ติดต่อ J SPEED SERVICE อู่ซ่อมรถมินิ MINI BMW โทร ${site.phone} ${site.hours.days} 8:30 - 18:00 น.`,
  body: `
${pageHead('ติดต่อเรา', [['ติดต่อเรา']], 'อู่ซ่อมรถมินิ MINI, BMW, BENZ โดยทีมงานมืออาชีพ')}
<section class="section">
  <div class="wrap contact-grid">
    <a class="contact-card contact-card--blue" href="tel:${site.tel}">${icon('phone')}<span><b>โทรหาเรา</b>${site.phone}</span></a>
    <div class="contact-card">${icon('clock')}<span><b>เวลาทำการ</b>${site.hours.days}<br>8:30 - 18:00 น.</span></div>
    <a class="contact-card" href="${site.facebook}" target="_blank" rel="noopener">${facebookIcon}<span><b>Facebook</b>facebook.com/jspeedservice</span></a>
    <div class="contact-card">${icon('tow')}<span><b>รถยกสไลด์ 24 ชม.</b>รับส่งรถนอกสถานที่ทั่วประเทศไทย</span></div>
  </div>
</section>
${mapSection()}`,
});

// Repair stories
posts.forEach((p, i) => {
  const others = posts.filter((o) => o !== p).slice(0, 2);
  add({
    path: p.path,
    title: p.title,
    active: '',
    type: 'article',
    description: `${p.lead}… J SPEED SERVICE อู่ซ่อมรถ MINI BMW`,
    body: `
${pageHead(p.title, [[categories[p.cats[0]].name, categories[p.cats[0]].path], [p.title]])}
<section class="section">
  <div class="wrap with-sidebar">
    <article class="content">
      ${postMeta(p)}
      <div class="article__img">${tile(p.icon, i, p.title, postPic.get(p))}</div>
      <div class="prose">
        <p>${p.lead}…</p>
        <p>หากรถของคุณมีอาการคล้ายกัน ทีมช่าง J SPEED SERVICE พร้อมตรวจเช็คด้วยเครื่องคอมพิวเตอร์ แจ้งสาเหตุและราคาก่อนซ่อม และรับประกันงานซ่อมทุกงาน</p>
      </div>
      ${callButton('btn btn--call')}
      <h2 class="section-title section-title--sm">งานซ่อมอื่นๆ</h2>
      <div class="post-grid">${others.map(postCard).join('')}</div>
    </article>
    ${sidebar()}
  </div>
</section>`,
  });
});

// Category & author archives
const archive = (path, title, list, crumbs) =>
  add({
    path,
    title,
    active: '',
    description: `${title} – รวมงานซ่อมรถ MINI BMW จาก J SPEED SERVICE`,
    body: `
${pageHead(title, crumbs)}
<section class="section">
  <div class="wrap with-sidebar">
    <div class="content"><div class="post-grid">${list.map(postCard).join('')}</div></div>
    ${sidebar()}
  </div>
</section>`,
  });
for (const [key, c] of Object.entries(categories)) {
  archive(c.path, c.name, posts.filter((p) => p.cats.includes(key)), [[c.name]]);
}
archive(paths.author, 'อู่ซ่อมมินิ', posts, [['อู่ซ่อมมินิ']]);

// Brand pages
for (const [path, brand] of [[paths.teamBmw, 'BMW'], [paths.teamMini, 'MINI']]) {
  add({
    path,
    title: brand,
    active: 'about',
    description: `ซ่อมรถ ${brand} ทุกรุ่น โดย J SPEED SERVICE`,
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
  writeFileSync(file, layout(p));
}

const missing = legacyLinks.filter((u) => !seen.has(fsPath(u)));
if (missing.length) throw new Error(`Old addresses without a page:\n${missing.map(fsPath).join('\n')}`);

// 404, assets, sitemap, robots, custom domain
writeFileSync(
  join(out, '404.html'),
  layout({
    path: '/404.html',
    title: 'ไม่พบหน้านี้',
    active: '',
    body: `${pageHead('ไม่พบหน้านี้', [['404']], 'หน้าที่คุณค้นหาอาจถูกย้าย ลองเลือกบริการด้านล่าง หรือโทรหาเรา')}
<section class="section"><div class="wrap"><div class="svc-grid svc-grid--light">${services.map(serviceCard).join('')}</div></div></section>${ctaBand()}`,
  }).replace('<head>', '<head>\n<meta name="robots" content="noindex">'),
);
mkdirSync(join(out, 'assets'), { recursive: true });
for (const f of ['styles.css', 'main.js', 'favicon.svg']) copyFileSync(join(root, 'public', f), join(out, 'assets', f));
// Photos at their old addresses (/wp-content/uploads/...). Full-size originals dropped
// into static/ at the same paths replace these.
cpSync(join(root, 'static'), out, { recursive: true });
const missingPhotos = photos.filter((p) => !existsSync(join(out, p.src)));
if (missingPhotos.length) throw new Error(`Photos missing from static/:\n${missingPhotos.map((p) => p.src).join('\n')}`);
const lastmod = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .filter((p) => !p.path.includes('/page/'))
    .map((p) => `  <url><loc>${site.origin}${p.path}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`);
writeFileSync(join(out, 'CNAME'), 'www.jspeedservice.com\n');
writeFileSync(join(out, '.nojekyll'), '');
if (!existsSync(join(out, 'index.html'))) throw new Error('index.html missing');

console.log(`Built ${pages.length} pages into dist/ — all ${legacyLinks.length} old addresses present.`);
