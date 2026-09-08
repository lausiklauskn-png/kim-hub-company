/* Offline-Vorrat des Bündel-Prüfers.
   Die Liste unten nennt genau die vier Dateien, die es gibt.
   Wer eine Datei ergänzt, trägt sie hier nach UND erhöht VORRAT. */
const VORRAT = 'buendel-pruefer-v1';
/* ⚠ NUR EIGENE VORRAETE AUFRAEUMEN — `caches` gehoert dem URSPRUNG, nicht dem
 * Pfad. Auf lausiklauskn-png.github.io liegen rund zwanzig Apps; ein Filter,
 * der nur "ist nicht meiner" fragt, laesst ALLE fremden durch und loescht sie.
 * Genau HIER ist das am 2026-09-08 aufgefallen (Sage-Protokol/tests/vorrat_wirkung.mjs).
 * Praefix ABGELESEN aus VORRAT, nicht geraten. Muster aus Tomys-Hub/bookledger/sw.js.
 * Es muss BEIDES tun: fremde stehen lassen UND eigene alte weiter wegraeumen. */
const VORRAT_PRAEFIX = 'buendel-pruefer-';

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
      .then(namen => Promise.all(namen.map(n => (n.startsWith(VORRAT_PRAEFIX) && n !== VORRAT) ? caches.delete(n) : null)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(treffer => treffer || fetch(e.request))
  );
});