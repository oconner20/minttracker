// Service Worker สำหรับ MintTracker (PWA / offline)
// เพิ่มเลขเวอร์ชันนี้ทุกครั้งที่แก้ไฟล์ asset เพื่อบังคับให้ผู้ใช้ได้ของใหม่
const CACHE = 'minttracker-v25';

// App shell + asset ทั้งหมด (ไม่พึ่ง CDN อีกต่อไป)
const PRECACHE = [
  './',
  './index.html',
  './css/tailwind.css',
  './css/style.css',
  './js/app.js',
  './js/sw-register.js',
  './manifest.webmanifest',
  './assets/fa/css/all.min.css',
  './assets/fa/webfonts/fa-solid-900.woff2',
  './assets/fa/webfonts/fa-regular-400.woff2',
  './assets/fonts/sarabun.css',
  './assets/fonts/sarabun-400-thai.woff2',
  './assets/fonts/sarabun-400-latin.woff2',
  './assets/fonts/sarabun-400-latin-ext.woff2',
  './assets/fonts/sarabun-500-thai.woff2',
  './assets/fonts/sarabun-500-latin.woff2',
  './assets/fonts/sarabun-500-latin-ext.woff2',
  './assets/fonts/sarabun-600-thai.woff2',
  './assets/fonts/sarabun-600-latin.woff2',
  './assets/fonts/sarabun-600-latin-ext.woff2',
  './assets/fonts/sarabun-700-thai.woff2',
  './assets/fonts/sarabun-700-latin.woff2',
  './assets/fonts/sarabun-700-latin-ext.woff2',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-512-maskable.png',
  './assets/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  // ตั้งใจไม่เรียก skipWaiting() ที่นี่ — ปล่อยให้ SW ตัวใหม่ "รอ" ไว้ก่อน
  // มิฉะนั้นหน้าที่เปิดอยู่จะรัน JS เก่าในหน่วยความจำปนกับ asset ใหม่จากแคช
  // การอัปเดตจะเกิดก็ต่อเมื่อผู้ใช้กดปุ่ม "อัปเดต" เอง (ดู js/sw-register.js)
  // ต้องใส่ cache: 'reload' เพื่อบังคับดึงไฟล์จากเครือข่ายจริง
  // ถ้าไม่ใส่ addAll จะอ่านผ่าน HTTP cache ของเบราว์เซอร์ ซึ่งอาจคืนไฟล์เก่ามาให้
  // ผลคือแคชเวอร์ชันใหม่กลับบรรจุไฟล์เก่า ผู้ใช้จึงไม่ได้ของใหม่แม้จะ bump เลขเวอร์ชันแล้ว
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(
    PRECACHE.map((u) => new Request(u, { cache: 'reload' }))
  )));
});

// หน้าเว็บส่งสัญญาณมาเมื่อผู้ใช้กดยืนยันอัปเดต
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                      // เขียนข้อมูลไม่ต้อง cache
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // ปล่อย request ข้าม origin ผ่านไปตามปกติ

  // Cache-first: ทุกอย่างถูก precache ไว้แล้ว จึงทำงานได้แม้ออฟไลน์
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => {
        // ออฟไลน์และไม่มีใน cache: ถ้าเป็นการเปิดหน้า ให้เสิร์ฟตัวแอป
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
