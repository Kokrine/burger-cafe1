// ოფლაინ რეჟიმი (მთავარ ეკრანზე დამატებული აპი ინტერნეტის გარეშეც იხსნება).
//  * გვერდი (index.html) — ჯერ ქსელიდან (ახალი ვერსია მაშინვე ჩანს), ქსელის გარეშე — ქეშიდან;
//  * ასეტები, სკრიპტები, შრიფტები — ქეშიდან მყისიერად და ფონზე განახლება;
//  * Supabase / ხმა (სხვა დომენები) — არასდროს იქეშება.
const CACHE = 'burger-cafe-v3';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// პირველი გახსნისას გვერდი და სკრიპტები ქეშამდე იტვირთება — ამიტომ დაყენებისას ყველაფერს
// წინასწარ ვინახავთ: გვერდი, მისი სკრიპტები/სტილები და manifest.json-ის ყველა ასეტი.
async function precache() {
  const scope = self.registration.scope;
  const cache = await caches.open(CACHE);
  const page = await fetch(scope, { cache: 'reload' });
  if (!page.ok) return;
  await cache.put(scope, page.clone());
  const html = await page.text();
  const urls = new Set(['manifest.webmanifest', 'assets/manifest.json', 'icons/icon-192.png', 'icons/apple-touch-icon.png'].map((u) => new URL(u, scope).href));
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = new URL(m[1], scope);
    if (u.origin === self.location.origin || FONT_HOSTS.includes(u.hostname)) urls.add(u.href);
  }
  try {
    const assets = await (await fetch(new URL('assets/manifest.json', scope), { cache: 'reload' })).json();
    for (const a of Object.values(assets)) if (a && a.file) urls.add(new URL(`assets/${a.file}`, scope).href);
  } catch { /* ასეტების სია ვერ წავიკითხეთ — ჩაიქეშება გამოყენებისას */ }
  await Promise.all([...urls].map((u) => cache.add(u).catch(() => undefined)));
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precache().catch(() => undefined));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  if (!own && !FONT_HOSTS.includes(url.hostname)) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req, { ignoreSearch: true, ignoreVary: true })) ?? (await cache.match(self.registration.scope, { ignoreVary: true })) ?? Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // ignoreVary: სკრიპტები (type=module) Origin სათაურით ითხოვება, წინასწარ შენახული — მის გარეშე
    const cached = await cache.match(req, { ignoreVary: true });
    const fresh = fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }).catch(() => cached ?? Response.error());
    return cached ?? fresh;
  })());
});
