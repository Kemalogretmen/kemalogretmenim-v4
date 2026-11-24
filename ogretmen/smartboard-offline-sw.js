/* Only the public smartboard shell and its fixed, local libraries are cached.
   PDF documents, account responses and microphone data never enter this cache. */
importScripts('/ogretmen/smartboard-offline-assets.js');
const CACHE = 'kemal-smartboard-shell-20261124-large-pdf-v1';
const ALLOWED = new Set(self.SMARTBOARD_OFFLINE_ASSETS);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    let bytes = 0;
    try {
      for (let i = 0; i < self.SMARTBOARD_OFFLINE_ASSETS.length; i += 6) {
        await Promise.all(self.SMARTBOARD_OFFLINE_ASSETS.slice(i, i + 6).map(async path => {
          const response = await fetch(path, {cache:'reload', credentials:'same-origin'});
          if (!response.ok) throw new Error('Offline asset unavailable');
          bytes += (await response.clone().arrayBuffer()).byteLength;
          if (bytes > 24 * 1024 * 1024) throw new Error('Offline shell size limit');
          await cache.put(path,response);
        }));
      }
      await self.skipWaiting();
    } catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('kemal-smartboard-shell-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !ALLOWED.has(url.pathname)) return;
  event.respondWith((async () => {
    try { return await fetch(event.request); }
    catch(error) { return (await caches.match(url.pathname, {cacheName:CACHE})) || Response.error(); }
  })());
});
