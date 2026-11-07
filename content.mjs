import { readFileSync } from 'node:fs';

// Site content. Every `path` is the page's old address, written exactly as the
// old site linked it (percent-encoded), so existing links and search rankings keep working.

export const site = {
  origin: 'https://www.jspeedservice.com',
  name: 'J SPEED SERVICE',
  title: 'อู่มินิ อู่ซ่อมรถ มินิ MINI BMW – J SPEED SERVICE 08-333-333-22',
  // What Google shows for the home page; other pages end their title with `titleTail`
  // (or just the name when the title is already long).
  homeTitle: 'อู่มินิ อู่ซ่อม MINI Cooper & BMW บึงกุ่ม | J SPEED SERVICE',
  titleTail: ' | อู่ซ่อมมินิ J SPEED SERVICE',
  description:
    'อู่ซ่อม MINI Cooper และ BMW ทุกรุ่น ซอยคลองลำเจียก 41 บึงกุ่ม ใกล้เลียบด่วนรามอินทรา ตรวจเช็คด้วยคอมพิวเตอร์ แจ้งราคาก่อนซ่อม รับประกันงาน โทร 08-333-333-22',
  phone: '08-333-333-22',
  tel: '0833333322',
  facebook: 'https://www.facebook.com/jspeedservice',
  hours: { days: 'ทุกวันจันทร์ - เสาร์', time: 'เปิดให้บริการตั้งแต่เวลา 8:30 - 18:00 น.' },
  // Must match the Google Business Profile word for word (local search compares them).
  address: { street: 'ซอยคลองลำเจียก 41', area: 'แขวงนวมินทร์ เขตบึงกุ่ม', city: 'กรุงเทพมหานคร', postcode: '10230' },
  mapQuery: 'J Speed Service อู่ซ่อมมินิ กรุงเทพ',
  // Google tags, loaded only on the live domain (not locally or on the github.io preview).
  analytics: { ga4: 'G-DKCWG9RL8H', ads: 'AW-1002081090', host: 'www.jspeedservice.com' },
};

export const paths = {
  home: '/',
  about: '/%e0%b9%80%e0%b8%81%e0%b8%b5%e0%b9%88%e0%b8%a2%e0%b8%a7%e0%b8%81%e0%b8%b1%e0%b8%9a%e0%b9%80%e0%b8%a3%e0%b8%b2/',
  services: '/%e0%b8%9a%e0%b8%a3%e0%b8%b4%e0%b8%81%e0%b8%b2%e0%b8%a3/',
  contact:
    '/%e0%b8%95%e0%b8%b4%e0%b8%94%e0%b8%95%e0%b9%88%e0%b8%ad-%e0%b8%ad%e0%b8%b9%e0%b9%88%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1%e0%b8%a3%e0%b8%96%e0%b8%a1%e0%b8%b4%e0%b8%99%e0%b8%b4-mini-bmw-benz/',
  catMini: '/category/%e0%b8%87%e0%b8%b2%e0%b8%99%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1-mini/',
  catOther: '/category/%e0%b8%ad%e0%b8%b7%e0%b9%88%e0%b8%99%e0%b9%86/',
  author: '/author/jack/',
  teamBmw: '/team-view/bmw/',
  teamMini: '/team-view/mini/',
};

const S = paths.services;

export const services = [
  {
    key: 'engine',
    icon: 'engine',
    name: 'ซ่อมเครื่องยนต์',
    category: '1. ระบบเครื่องยนต์',
    path: S + '%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1%e0%b9%80%e0%b8%84%e0%b8%a3%e0%b8%b7%e0%b9%88%e0%b8%ad%e0%b8%87%e0%b8%a2%e0%b8%99%e0%b8%95%e0%b9%8c/',
    summary:
      'บริการซ่อมเครื่องยนต์โดยเริ่มต้นจากการวิเคราะห์สาเหตุก่อน เช่นเครื่องเดินไม่เต็มสูบ เซนเซอร์บางจุดเสีย น้ำมันเครื่องซึม เครื่องยนต์กินน้ำมันเยอะ เร่งไม่ออก สาเหตุปัญหาเหล่านี้จำเป็นต้องให้เราวิเคราะห์ (โดยคอมพิวเตอร์) ให้ถูกต้อง จึงสามารถซ่อมได้',
    body: [
      'เครื่องยนต์ถือเป็นส่วนสำคัญที่ทำให้รถยนต์สามารถขับเคลื่อนและเป็นตัวสร้างพลังงานให้ตัวรถมีแรงเคลื่อนที่ไปข้างหน้า หากระบบเครื่องยนต์ขัดข้องหรือมีปัญหา อู่ J Speed Service เรายินดีบริการซ่อมแซมเครื่องยนต์ ยี่ห้อ BMW และ มินิ ทุกรุ่น โดยทีมช่างที่มีความเชี่ยวชาญเฉพาะทางและมากประสบการณ์',
    ],
    points: ['เครื่องเดินไม่เต็มสูบ', 'เซนเซอร์เสีย', 'น้ำมันเครื่องซึม', 'กินน้ำมันเยอะ', 'เร่งไม่ออก', 'โอเวอร์ฮอลเครื่องยนต์'],
  },
  {
    key: 'gear',
    icon: 'gear',
    name: 'ซ่อมเกียร์',
    pageName: 'ซ่อมระบบเกียร์',
    category: '2. ระบบเกียร์',
    path: S + '%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1%e0%b8%a3%e0%b8%b0%e0%b8%9a%e0%b8%9a%e0%b9%80%e0%b8%81%e0%b8%b5%e0%b8%a2%e0%b8%a3%e0%b9%8c/',
    summary:
      'คนใช้รถส่วนใหญ่มักลืมเปลี่ยนถ่ายน้ำมันเกียร์ตามสเปคโรงงานกำหนด ปัญหาที่พบบ่อยเกียร์ลื่น และกระตุก เราสามารถบริการซ่อมให้ท่านในราคาถูกแต่คุณภาพดี โดยการโอเวอร์ฮอลเกียร์ (overhaul gear)',
    body: [
      'ระบบเกียร์มีหน้าที่ เปลี่ยนกำลังหมุนที่มาจากเครื่องยนต์ไปยังกำลังขับเคลื่อน และจากนั้นจึงควบคุมการทำงานของมันไปยังล้อขับเคลื่อน เครื่องยนต์โดยส่วนใหญ่มี ระบบเกียร์แบบธรรมดา และระบบเกียร์อัตโนมัติ',
      'คนใช้รถส่วนใหญ่มักลืมเปลี่ยนถ่ายน้ำมันเกียร์ตามสเปคโรงงานกำหนด ปัญหาที่พบบ่อยเกียร์ลื่น และกระตุก ที่อู่ J Speed Service เราบริการเปลี่ยนถ่ายน้ำมันเกียร์และซ่อมเกียร์รถยนต์ BMW, MINI ทุกรุ่น โดยทีมช่างที่มีความเชี่ยวชาญเฉพาะทางและมากประสบการณ์',
    ],
    points: ['เกียร์ลื่น', 'เกียร์กระตุก', 'เปลี่ยนถ่ายน้ำมันเกียร์', 'โอเวอร์ฮอลเกียร์', 'เกียร์ธรรมดา', 'เกียร์อัตโนมัติ'],
  },
  {
    key: 'suspension',
    icon: 'suspension',
    name: 'ซ่อมช่วงล่าง',
    category: '3. ช่วงล่าง',
    path: S + '%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1%e0%b8%8a%e0%b9%88%e0%b8%a7%e0%b8%87%e0%b8%a5%e0%b9%88%e0%b8%b2%e0%b8%87/',
    summary:
      'บริการซ่อมช่วงล่าง เช็คช่วงล่างตามระยะทาง ซ่อมบำรุงดูแลตั้งแต่ ล้อ ยาง ผ้าเบรค+จานเบรค โช๊ค สปริง แร็คพวงมาลัย ลูกหมากและบูชช่วงล่างหน้าและหลัง',
    body: [
      'บริการซ่อมช่วงล่าง เช็คช่วงล่างตามระยะทาง ซ่อมบำรุงดูแลตั้งแต่ ล้อ ยาง ผ้าเบรค+จานเบรค โช๊ค สปริง แร็คพวงมาลัย ลูกหมากและบูชช่วงล่างหน้าและหลัง สำหรับรถยนต์ BMW, MINI ทุกรุ่น',
    ],
    points: ['ล้อ ยาง', 'ผ้าเบรค + จานเบรค', 'โช๊ค สปริง', 'แร็คพวงมาลัย', 'ลูกหมาก', 'บูชช่วงล่าง'],
  },
  {
    key: 'air',
    icon: 'air',
    name: 'ซ่อมระบบแอร์',
    pageName: 'ซ่อมแอร์และระบบไฟฟ้า',
    category: '4. ระบบแอร์และระบบไฟฟ้า',
    path: S + '%e0%b8%8b%e0%b9%88%e0%b8%ad%e0%b8%a1%e0%b8%a3%e0%b8%b0%e0%b8%9a%e0%b8%9a%e0%b9%81%e0%b8%ad%e0%b8%a3%e0%b9%8c%e0%b9%81%e0%b8%a5%e0%b8%b0%e0%b9%84%e0%b8%9f%e0%b8%9f%e0%b9%89%e0%b8%b2/',
    summary:
      'ปัญหาที่คุ้นเคยกันดีคือแอร์ไม่เย็น เย็นไม่ฉ่ำ มีกลิ่นเหม็นอับ J Speed Service บริการตรวจเช็คแอร์ เปลี่ยนคอมแอร์ ล้างระบบแอร์ ล้างตู้แอร์',
    body: [
      'ปัญหาที่คุ้นเคยกันดีคือแอร์ไม่เย็น เย็นไม่ฉ่ำ มีกลิ่นเหม็นอับ J Speed Service บริการตรวจเช็คแอร์ เปลี่ยนคอมแอร์ ล้างระบบแอร์ ล้างตู้แอร์',
      'รวมทั้งตรวจเช็คระบบไฟฟ้าทั้งคันด้วยเครื่องคอมพิวเตอร์ ลบไฟและเดินระบบไฟใหม่ บริการซ่อมระบบไฮบริด (Hybrid) เปลี่ยนแบตเตอรี่ไฮบริด ตรวจเช็ค inverter และระบบไฟฟ้าต่างๆ',
    ],
    points: ['แอร์ไม่เย็น', 'เปลี่ยนคอมแอร์', 'ล้างตู้แอร์', 'ระบบไฟฟ้า', 'ระบบไฮบริด', 'ลบไฟ / เดินไฟใหม่'],
  },
];

// Repair stories. `lead` is the opening line the old site showed; the full stories
// weren't captured, so each page shows that line and invites the reader to call.
// Repair stories, imported from the old site by scripts/import-posts.mjs (newest first).
// `lead` is the card excerpt; `icon` stands in when a post has no photo.
const postIcon = (t) =>
  /แอร์|air/i.test(t) ? 'air'
  : /เกียร์|gear/i.test(t) ? 'gear'
  : /ช่วงล่าง|พวงมาลัย|เบรค|โช้ค/i.test(t) ? 'suspension'
  : /อุบัติเหตุ|ชน|สไลด์/i.test(t) ? 'tow'
  : /เครื่อง|overhaul|ความร้อน|น้ำมัน/i.test(t) ? 'engine'
  : /ตรวจเช็ค|เช็ค/i.test(t) ? 'check'
  : 'car';
const excerpt = (body) => {
  const first = body[0] ?? '';
  return first.length > 90 ? `${first.slice(0, 90).replace(/\s+\S*$/, '')}…` : first;
};
export const posts = JSON.parse(readFileSync(new URL('./posts.json', import.meta.url), 'utf8')).map((p) => ({
  ...p,
  icon: postIcon(p.title),
  lead: excerpt(p.body),
}));

export const categories = {
  mini: { name: 'งานซ่อม MINI', path: paths.catMini },
  other: { name: 'อื่นๆ', path: paths.catOther },
};

export const aboutWork = [
  { icon: 'engine', text: 'Mini r56 เครื่องพัง เกียร์กระตุก ลูกค้าต้องการโอเวอร์ฮอลล์ เครื่อง (overhaul engine) + เกียร์ ทีเดียวไปเลยครับ' },
  { icon: 'suspension', text: 'Mini cooper R53 S สองพี่น้องสีเดียวกันมาเปลี่ยนยางเบ้าโช้คคู่หน้าเหมือนกันครับ' },
  { icon: 'car', text: 'Mini หลายคันมาพร้อมกัน มีทั้งรถที่ยังทำค้างอยู่และรถเข้ามาซ่อมใหม่ เราพยายามเร่งงานให้เสร็จทันตามกำหนดครับ' },
  { icon: 'check', text: 'Mini Cooper R52 S รายการซ่อมเกิน 10 รายการ แต่เราคุมราคาให้ครับ' },
  { icon: 'engine', text: 'Mini Austin เสียงเครื่องดังน่ากลัวครับ จัดให้ครับ' },
  { icon: 'shield', text: 'J Speed Service รับประกันงานซ่อมให้ลูกค้าสบายใจครับ อะไหล่มีของใหม่แท้ + เทียม มือสองแท้ เลือกตัดสินใจได้ครับ' },
];
