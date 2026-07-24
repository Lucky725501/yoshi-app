/* よしっ - Service Worker
   いまは「起動を速くする」役目だけ。
   通知は次のステップでここに追加する。 */

const CACHE = 'yoshi-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase など外部への通信はそのまま通す（キャッシュしない）
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  // 画面そのものは「まずネット、だめならキャッシュ」
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // アイコンなどは「まずキャッシュ」
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});


/* ---------- 通知を受け取って表示する ---------- */
self.addEventListener('push', e => {
  let d = { title: 'よしっ', body: 'じゅんびの じかんです' };
  try { if (e.data) d = { ...d, ...e.data.json() }; } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || 'yoshi',
      renotify: true,
      data: { url: '/' },
    })
  );
});

/* ---------- 通知をタップしたらアプリを開く ---------- */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
