/* Offline-Vorrat des Bündel-Prüfers.
   Die Liste unten nennt genau die vier Dateien, die es gibt.
   Wer eine Datei ergänzt, trägt sie hier nach UND erhöht VORRAT. */
const VORRAT = 'buendel-pruefer-v1';

const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VORRAT).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(namen => Promise.all(namen.map(n => n === VORRAT ? null : caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(treffer => treffer || fetch(e.request))
  );
});