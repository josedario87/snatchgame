// Minimal service worker to enable PWA installability
self.addEventListener("install", () => {
  // Activate immediately on install
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Provide a basic fetch handler (required by some browsers for installability)
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

