/*
 * company-sw.js — die Schale von Kim Hub Company offline.
 *
 * ⚠ DIE SCHALE, NIEMALS DIE DATEN. Diese App hat keine Daten-Dateien im Netz —
 * was sie behält, liegt in IndexedDB und geht den Service-Worker nichts an.
 * Was hier trotzdem gilt und in Kimhub teuer war: ein Worker, der eine
 * `*.json` aufhebt, zeigt nach der nächsten Änderung den alten Stand, und die
 * App sähe aus, als wäre nichts passiert. Deshalb auch hier: JSON ist immer
 * Netz zuerst — `schicht/mitarbeiter.json` ist die Besetzung, und eine
 * eingefrorene Besetzung wäre genau dieser Fehler.
 *
 * ⚠ DIE MODULE GEHÖREN IN DEN VORRAT, ALLE. Die Seite lädt sie als ES-Module
 * nach; fehlt eines offline, bricht der Start mit einem leeren Bildschirm ab.
 * Wer ein Modul dazunimmt, trägt es hier nach UND erhöht CACHE_VERSION.
 */
/* ⚠ ZWEI ZEILEN WEICHEN VON KIMHUBS FASSUNG AB, UND ZWAR ABSICHTLICH: dort
 * heisst die Startseite `start.html` (weil `index.html` die Werkstatt ist),
 * hier ist sie die App und heisst `index.html`. Datei-Namen sind app-eigener
 * Klebstoff — deshalb ist dieser Worker neben dem Manifest die einzige Datei,
 * die der Drift-Guard NICHT pinnt. Und er heisst `sw.js`, weil `ansicht.js`
 * genau diesen Namen registriert: eine Naht weniger.
 */
/* ⚠ v43 → v44 am 2026-09-08: `index.html` trägt jetzt die Wirt-Marke
   `SBKIM_VORRAT_PRAEFIX = "kim-hub-company-"`, und `ansicht.js` räumt danach
   nur noch die eigenen Vorräte weg. Ohne den Bump lieferte der Worker die
   alte `ansicht.js` weiter — und die löscht jeden Vorrat des Ursprungs,
   also auch den der Werkstatt und der dreissig Geschwister-Apps. */
var CACHE_VERSION = "kim-hub-company-v45";

/* ⚠ NUR EIGENE VORRAETE AUFRAEUMEN — `caches` gehoert dem URSPRUNG, nicht dem
 * Pfad. Auf lausiklauskn-png.github.io liegen rund zwanzig Apps; ein Filter,
 * der nur "ist nicht meiner" fragt, laesst ALLE fremden durch und loescht sie.
 * Gemessen am 2026-09-08 an zwei echten Apps
 * (Sage-Protokol/tests/vorrat_wirkung.mjs). Praefix ABGELESEN aus der
 * Vorrat-Konstante, nicht geraten. Muster aus Tomys-Hub/bookledger/sw.js.
 * Es muss BEIDES tun: fremde stehen lassen UND eigene alte weiter wegraeumen. */
var VORRAT_PRAEFIX = "kim-hub-company-";
var SCHALE = [
  "./", "./index.html", "./company.webmanifest", "./version.json", "./impressum.html", "./datenschutz.html",
  "./idb.js", "./schluesseltresor.js", "./zeit.js", "./kassen.js", "./ansicht.js", "./company.js",
  "./buehne.js",
    "./schicht/schicht.mjs", "./schicht/api.mjs", "./schicht/transport-netz.mjs",
  "./schicht/kosten.mjs", "./schicht/beispiele.mjs", "./schicht/grundsaetze.mjs",
  "./schicht/ablage-idb.mjs", "./schicht/fahrtenbuch-form.mjs", "./schicht/ablage-speicher.mjs",
  "./schicht/baum-speicher.mjs", "./schicht/werkzeuge.mjs",
  "./schicht/spind.mjs", "./schicht/ruf.mjs", "./schicht/rollen.mjs",
  "./schicht/konferenz.mjs",
  "./schicht/plan-form.mjs",
  "./schicht/umfang.mjs",
  "./schicht/grundsaetze.md", "./schicht/mitarbeiter.json",
  "./icons/kimhub-96.png", "./icons/kimhub-192.png", "./icons/kimhub-512.png",
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE_VERSION).then(function (c) {
    // Einzeln, nicht als Block: eine fehlende Datei darf nicht die ganze
    // Installation umwerfen — sonst gibt es gar keinen Offline-Betrieb.
    return Promise.all(SCHALE.map(function (w) { return c.add(w).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (n) {
    return Promise.all(n.filter(function (k) { return k.startsWith(VORRAT_PRAEFIX) && k !== CACHE_VERSION; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  // Fremde Adressen NIE anfassen — der Aufruf an die KI geht den Worker nichts
  // an, und ein Vorrat darüber wäre eine Antwort, die niemand bezahlt hat.
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;

  if (u.pathname.endsWith(".json")) {          // DATEN: Netz zuerst
    e.respondWith(fetch(e.request).then(function (a) {
      if (a && a.ok) {
        var kopie = a.clone();
        caches.open(CACHE_VERSION).then(function (c) { c.put(e.request, kopie); });
      }
      return a;
    }).catch(function () { return caches.match(e.request); }));
    return;
  }

  e.respondWith(caches.match(e.request).then(function (t) {   // SCHALE: Vorrat zuerst
    return t || fetch(e.request);
  }));
});
