// Service Worker de desactivación.
// La app es 100% web (sin modo offline): el objetivo es liberar los navegadores
// que registraron el antiguo Service Worker, eliminando sus cachés y des-registrándolo.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('neonotes')).map((key) => caches.delete(key))
      );
      await self.clients.claim();
      await self.registration.unregister();
    })()
  );
});

// No interceptamos fetch: el navegador siempre va a la red.